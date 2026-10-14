import express from "express";
import XLSX from "xlsx";
import multer from "multer";
import { PDFParse } from "pdf-parse";
import Tesseract from "tesseract.js";
import BusinessProfile from "../models/BusinessProfile.js";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const supported = /\.(xlsx|xls|csv|pdf|png|jpe?g|webp)$/i.test(file.originalname);
    if (supported) cb(null, true);
    else cb(new Error("Formats acceptes : Excel, CSV, PDF, PNG, JPG ou WEBP."));
  },
});
const allowedFields = ["name", "address", "phone", "email", "taxId", "vatRate", "currency"];

const normalizeKey = (key) => String(key ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const aliases = {
  name: ["nom", "societe", "entreprise", "raison sociale", "name"],
  address: ["adresse", "address"], phone: ["telephone", "tel", "phone"],
  email: ["email", "e mail"], taxId: ["matricule fiscal", "tax id", "tva", "mf"],
  vatRate: ["taux tva", "tva rate", "vat rate"], currency: ["devise", "currency"],
};

const extractFieldsFromText = (text) => {
  const compact = text.replace(/\r/g, "").replace(/[ \t]+/g, " ");
  const find = (labels) => {
    const pattern = new RegExp(`(?:${labels.join("|")})\\s*[:\\-]\\s*([^\\n]+)`, "i");
    return compact.match(pattern)?.[1]?.trim() ?? "";
  };
  const vat = compact.match(/(?:taux\s*)?(?:tva|vat)\s*[:\-]?\s*(\d+(?:[,.]\d+)?)\s*%/i)?.[1];
  const currency = compact.match(/\b(TND|DT|EUR|USD)\b/i)?.[1]?.toUpperCase();
  return {
    name: find(["raison sociale", "nom (?:de )?(?:la )?(?:societe|société|entreprise)"]),
    address: find(["adresse"]),
    phone: find(["t(?:élé|e)phone", "tel"]),
    email: compact.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? "",
    taxId: find(["matricule fiscal", "identifiant fiscal", "tax id", "mf"]),
    vatRate: vat ? Number(vat.replace(",", ".")) : undefined,
    currency: currency === "TND" ? "DT" : currency,
  };
};

router.get("/profile", async (_req, res) => {
  const profile = await BusinessProfile.findOne().sort({ updatedAt: -1 });
  res.json(profile ?? {});
});

router.put("/profile", async (req, res) => {
  try {
    const data = Object.fromEntries(allowedFields.filter((field) => field in req.body).map((field) => [field, req.body[field]]));
    if ("vatRate" in data) data.vatRate = Number(data.vatRate) || 0;
    const profile = await BusinessProfile.findOneAndUpdate({}, data, { new: true, upsert: true, setDefaultsOnInsert: true });
    res.json(profile);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post("/profile/import", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Choisissez un fichier." });
    const extension = req.file.originalname.split(".").pop()?.toLowerCase();
    let extracted = {};

    if (["xlsx", "xls", "csv"].includes(extension)) {
      const book = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheet = book.Sheets[book.SheetNames[0]];
      const source = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false })[0] ?? {};
      const normalized = Object.fromEntries(Object.entries(source).map(([key, value]) => [normalizeKey(key), value]));
      for (const field of allowedFields) {
        const key = aliases[field]?.map(normalizeKey).find((alias) => normalized[alias] !== undefined && String(normalized[alias]).trim() !== "");
        if (key) extracted[field] = normalized[key];
      }
    } else {
      let text = "";
      if (extension === "pdf") {
        const parser = new PDFParse({ data: req.file.buffer });
        try {
          text = (await parser.getText()).text;
          // A scanned PDF has no selectable text. Render its first page and use OCR instead.
          if (!text.trim()) {
            const screenshots = await parser.getScreenshot({ first: 1, imageDataUrl: false });
            const firstPage = screenshots.pages?.[0]?.data;
            if (firstPage) text = (await Tesseract.recognize(firstPage, "fra+eng", { logger: () => {} })).data.text;
          }
        } finally { await parser.destroy(); }
      } else {
        const result = await Tesseract.recognize(req.file.buffer, "fra+eng", { logger: () => {} });
        text = result.data.text;
      }
      extracted = extractFieldsFromText(text);
    }

    extracted = Object.fromEntries(Object.entries(extracted).filter(([, value]) => value !== "" && value !== undefined && value !== null));
    if ("vatRate" in extracted) extracted.vatRate = Number(String(extracted.vatRate).replace(",", ".")) || 0;
    res.json({ extracted });
  } catch (err) { res.status(400).json({ message: `Impossible de lire le fichier : ${err.message}` }); }
});

export default router;

// routes/productRoutes.js
import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import Product from "../models/Product.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(__dirname, "../uploads"));
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Seules les images sont autorisees."));
  },
});

const normalizeProductPayload = (payload) => {
  const data = { ...payload };

  if (typeof data.barcode === "string") {
    const barcode = data.barcode.trim();
    data.barcode = barcode;
  }

  return data;
};

const handleProductError = (res, err) => {
  if (err?.code === 11000 && err?.keyPattern?.barcode) {
    return res.status(400).json({ message: "Ce code-barres existe deja." });
  }

  if (err?.name === "ValidationError" && err?.errors?.barcode) {
    return res.status(400).json({ message: "Le code-barres est obligatoire." });
  }

  return res.status(500).json({ message: err.message });
};

router.get("/", async (req, res) => {
  try {
    const { barcode, q } = req.query;
    const filters = [];

    if (typeof barcode === "string" && barcode.trim()) {
      filters.push({ barcode: barcode.trim() });
    }

    if (typeof q === "string" && q.trim()) {
      const pattern = new RegExp(q.trim(), "i");
      filters.push({
        $or: [
          { name: pattern },
          { barcode: pattern },
          { category: pattern },
        ],
      });
    }

    const query = filters.length === 0 ? {} : filters.length === 1 ? filters[0] : { $and: filters };
    const products = await Product.find(query).sort({ _id: -1 });
    res.json(products);
  } catch (err) {
    handleProductError(res, err);
  }
});

router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Produit introuvable." });
    }
    res.json(product);
  } catch (err) {
    handleProductError(res, err);
  }
});

router.post("/", upload.single("image"), async (req, res) => {
  try {
    const data = normalizeProductPayload(req.body);
    if (!data.barcode) {
      return res.status(400).json({ message: "Le code-barres est obligatoire." });
    }
    if (req.file) {
      data.image = `/uploads/${req.file.filename}`;
    }
    if (!data.image) {
      data.image = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=600&fit=crop";
    }
    const product = await Product.create(data);
    res.status(201).json(product);
  } catch (err) {
    handleProductError(res, err);
  }
});

router.put("/:id", upload.single("image"), async (req, res) => {
  try {
    const data = normalizeProductPayload(req.body);
    if ("barcode" in data && !data.barcode) {
      return res.status(400).json({ message: "Le code-barres est obligatoire." });
    }
    if (req.file) {
      data.image = `/uploads/${req.file.filename}`;
    }
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      data,
      { new: true, runValidators: true },
    );
    if (!product) {
      return res.status(404).json({ message: "Produit introuvable." });
    }
    res.json(product);
  } catch (err) {
    handleProductError(res, err);
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: "Produit supprime." });
  } catch (err) {
    handleProductError(res, err);
  }
});

export default router;

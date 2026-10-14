// routes/productRoutes.js
import express from "express";
import multer from "multer";
import XLSX from "xlsx";
import Product from "../models/Product.js";
import Category from "../models/Category.js";
import { deleteStoredImage, storeUploadedImage } from "../services/imageStorage.js";

const router = express.Router();

const singleImageUpload = (req, res, next) => {
  upload.single("image")(req, res, (err) => {
    if (!err) {
      next();
      return;
    }

    const status = err instanceof multer.MulterError ? 400 : 400;
    res.status(status).json({ message: err.message || "Impossible de televerser l'image." });
  });
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Seules les images sont autorisees."));
  },
});

const spreadsheetUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const filename = file.originalname.toLowerCase();
    if (/\.(xlsx|xls|csv)$/.test(filename)) cb(null, true);
    else cb(new Error("Importez un fichier Excel (.xlsx, .xls) ou CSV."));
  },
});

const parseBarcodes = (...values) => {
  const rawValues = values.flatMap((value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === "string") return [value];
    return [];
  });

  return [...new Set(
    rawValues
      .flatMap((value) => value.split(/[\n,;]+/))
      .map((value) => value.trim())
      .filter(Boolean),
  )];
};

const normalizeProductPayload = (payload) => {
  const data = { ...payload };
  const barcodes = parseBarcodes(data.barcodes, data.barcode);
  data.barcode = barcodes[0] || "";
  data.barcodes = barcodes;

  if ("salePrice" in data) {
    const rawSalePrice = typeof data.salePrice === "string"
      ? data.salePrice.trim()
      : data.salePrice;

    if (rawSalePrice === "" || rawSalePrice == null) {
      data.salePrice = null;
    } else {
      const parsedSalePrice = Number(rawSalePrice);
      data.salePrice = Number.isFinite(parsedSalePrice) && parsedSalePrice > 0
        ? parsedSalePrice
        : null;
    }
  }

  return data;
};

const findBarcodeConflict = async (barcodes, excludedProductId) => {
  if (!Array.isArray(barcodes) || barcodes.length === 0) {
    return null;
  }

  const query = {
    $or: [
      { barcode: { $in: barcodes } },
      { barcodes: { $in: barcodes } },
    ],
  };

  if (excludedProductId) {
    query._id = { $ne: excludedProductId };
  }

  return Product.findOne(query).lean();
};

const normalizeHeader = (value) => String(value ?? "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]/g, "");

const getImportValue = (row, aliases) => {
  const normalized = Object.entries(row).reduce((result, [key, value]) => {
    result[normalizeHeader(key)] = value;
    return result;
  }, {});

  for (const alias of aliases) {
    const value = normalized[normalizeHeader(alias)];
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return "";
};

const toImportNumber = (value, fallback = null) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const normalized = String(value ?? "")
    .trim()
    .replace(/\s/g, "")
    .replace(/,/g, ".")
    .replace(/[^0-9.-]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const defaultProductImage = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=600&fit=crop";

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
      const normalizedBarcode = barcode.trim();
      filters.push({
        $or: [
          { barcode: normalizedBarcode },
          { barcodes: normalizedBarcode },
        ],
      });
    }

    if (typeof q === "string" && q.trim()) {
      const pattern = new RegExp(q.trim(), "i");
      filters.push({
        $or: [
          { name: pattern },
          { barcode: pattern },
          { barcodes: pattern },
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

router.post("/import", spreadsheetUpload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Choisissez un fichier Excel ou CSV." });
  }

  try {
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!firstSheet) {
      return res.status(400).json({ message: "Le fichier ne contient aucune feuille." });
    }

    const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: "", raw: false });
    if (rows.length === 0) {
      return res.status(400).json({ message: "Le fichier ne contient aucun produit." });
    }
    if (rows.length > 1000) {
      return res.status(400).json({ message: "Import limité à 1 000 produits par fichier." });
    }

    const created = [];
    const skipped = [];
    const createdCategories = new Set();
    const existingBarcodes = new Set(
      (await Product.find({}, { barcode: 1 }).lean()).map((product) => product.barcode),
    );
    let nextGeneratedBarcode = 1;
    let generatedBarcodeCount = 0;

    for (const [index, row] of rows.entries()) {
      const rowNumber = index + 2;
      const name = String(getImportValue(row, ["nom", "name", "produit", "product"])).trim();
      let barcodes = parseBarcodes(
        getImportValue(row, ["codes barres", "codes-barres", "barcodes"]),
        getImportValue(row, ["code barre", "code-barres", "barcode", "code"]),
      );
      const price = toImportNumber(getImportValue(row, ["prix", "price", "prix vente", "prix de vente"]));

      if (!name || price === null || price < 0) {
        skipped.push({ row: rowNumber, message: "Nom et prix valide sont obligatoires." });
        continue;
      }

      if (barcodes.length === 0) {
        while (existingBarcodes.has(String(nextGeneratedBarcode))) nextGeneratedBarcode += 1;
        barcodes = [String(nextGeneratedBarcode)];
        existingBarcodes.add(barcodes[0]);
        nextGeneratedBarcode += 1;
        generatedBarcodeCount += 1;
      }

      const conflict = await findBarcodeConflict(barcodes);
      if (conflict) {
        skipped.push({ row: rowNumber, message: "Un code-barres existe deja." });
        continue;
      }

      const category = String(getImportValue(row, ["categorie", "category"])).trim();
      const imageCandidate = String(getImportValue(row, ["image", "image url", "url image", "imageurl"])).trim();
      const image = /^https?:\/\//i.test(imageCandidate) ? imageCandidate : defaultProductImage;
      const salePrice = toImportNumber(getImportValue(row, ["prix promo", "prix promotion", "sale price", "saleprice"]));
      const purchasePrice = toImportNumber(getImportValue(row, ["prix achat", "prix d achat", "purchase price", "purchaseprice"]));
      const stock = toImportNumber(getImportValue(row, ["stock", "quantite", "quantity"]), 0);
      const rating = toImportNumber(getImportValue(row, ["note", "rating"]), 4.5);

      const product = await Product.create({
        name,
        barcode: barcodes[0],
        barcodes,
        description: String(getImportValue(row, ["description", "details"])).trim(),
        price,
        salePrice: salePrice !== null && salePrice > 0 ? salePrice : null,
        purchasePrice: purchasePrice !== null && purchasePrice >= 0 ? purchasePrice : null,
        image,
        category,
        stock: Math.max(0, Math.trunc(stock ?? 0)),
        rating: Math.min(5, Math.max(0, rating ?? 4.5)),
      });

      if (category) {
        const categoryResult = await Category.updateOne(
          { name: category },
          { $setOnInsert: { name: category } },
          { upsert: true },
        );
        if (categoryResult.upsertedCount > 0) createdCategories.add(category);
      }
      created.push(product);
      barcodes.forEach((barcode) => existingBarcodes.add(barcode));
    }

    res.status(201).json({
      message: `${created.length} produit(s) cree(s).`,
      created,
      skipped,
      categories: [...createdCategories],
      generatedBarcodeCount,
    });
  } catch (err) {
    handleProductError(res, err);
  }
});

router.post("/", singleImageUpload, async (req, res) => {
  try {
    const data = normalizeProductPayload(req.body);
    if (!data.barcode) {
      return res.status(400).json({ message: "Le code-barres est obligatoire." });
    }
    const conflict = await findBarcodeConflict(data.barcodes);
    if (conflict) {
      return res.status(400).json({ message: "Un ou plusieurs codes-barres existent deja." });
    }
    if (req.file) {
      data.image = await storeUploadedImage(req.file);
    }
    if (!data.image) {
      data.image = defaultProductImage;
    }
    const product = await Product.create(data);
    res.status(201).json(product);
  } catch (err) {
    handleProductError(res, err);
  }
});

router.put("/:id", singleImageUpload, async (req, res) => {
  try {
    const data = normalizeProductPayload(req.body);
    if ("barcode" in data && !data.barcode) {
      return res.status(400).json({ message: "Le code-barres est obligatoire." });
    }

    const existingProduct = await Product.findById(req.params.id);
    if (!existingProduct) {
      return res.status(404).json({ message: "Produit introuvable." });
    }

    const conflict = await findBarcodeConflict(data.barcodes, req.params.id);
    if (conflict) {
      return res.status(400).json({ message: "Un ou plusieurs codes-barres existent deja." });
    }

    if (req.file) {
      data.image = await storeUploadedImage(req.file);
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      data,
      { new: true, runValidators: true },
    );

    if (req.file && existingProduct.image !== data.image) {
      await deleteStoredImage(existingProduct.image);
    }

    res.json(product);
  } catch (err) {
    handleProductError(res, err);
  }
});

router.delete("/", async (_req, res) => {
  try {
    const products = await Product.find({}, { image: 1 }).lean();
    await Product.deleteMany({});

    // Do not leave uploaded Cloudinary assets behind when the catalogue is reset.
    await Promise.allSettled(products.map((product) => deleteStoredImage(product.image)));

    res.json({ message: "Tous les produits ont ete supprimes.", count: products.length });
  } catch (err) {
    handleProductError(res, err);
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Produit introuvable." });
    }

    await deleteStoredImage(product.image);
    res.json({ message: "Produit supprime." });
  } catch (err) {
    handleProductError(res, err);
  }
});

export default router;

// routes/productRoutes.js
import express from "express";
import multer from "multer";
import Product from "../models/Product.js";
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
      data.image = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=600&fit=crop";
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

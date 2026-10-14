import express from "express";
import Purchase from "../models/Purchase.js";
import Product from "../models/Product.js";

const router = express.Router();

router.get("/", async (_req, res) => {
  try { res.json(await Purchase.find().sort({ date: -1, _id: -1 })); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

router.post("/", async (req, res) => {
  try {
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    if (items.length === 0) return res.status(400).json({ message: "Ajoutez au moins un produit." });
    const normalized = [];
    for (const item of items) {
      const quantity = Math.max(0, Math.trunc(Number(item.quantity)));
      const unitCost = Math.max(0, Number(item.unitCost) || 0);
      const product = await Product.findById(item.productId);
      if (!product || quantity <= 0) return res.status(400).json({ message: "Produit ou quantite invalide." });
      product.stock += quantity;
      if (unitCost > 0) product.purchasePrice = unitCost;
      await product.save();
      normalized.push({ productId: product.id, name: product.name, quantity, unitCost });
    }
    const purchase = await Purchase.create({
      supplier: String(req.body.supplier ?? ""), reference: String(req.body.reference ?? ""),
      date: req.body.date ? new Date(req.body.date) : new Date(), items: normalized,
      total: normalized.reduce((sum, item) => sum + item.quantity * item.unitCost, 0), notes: String(req.body.notes ?? ""),
    });
    res.status(201).json(purchase);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;

import express from "express";
import SalesDocument from "../models/SalesDocument.js";

const router = express.Router();

router.get("/", async (_req, res) => {
  try { res.json(await SalesDocument.find().sort({ date: -1, _id: -1 })); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

router.post("/", async (req, res) => {
  try {
    const type = req.body.type === "invoice" ? "invoice" : "quote";
    const customerName = String(req.body.customerName ?? "").trim();
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    if (!customerName || items.length === 0) return res.status(400).json({ message: "Client et articles sont obligatoires." });
    const count = await SalesDocument.countDocuments({ type });
    const prefix = type === "invoice" ? "FAC" : "DEV";
    const number = `${prefix}-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
    const cleanItems = items.map((item) => ({
      productId: String(item.productId ?? ""), name: String(item.name ?? "Produit"),
      quantity: Math.max(1, Math.trunc(Number(item.quantity) || 1)), unitPrice: Math.max(0, Number(item.unitPrice) || 0),
    }));
    const subtotal = cleanItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const vatRate = Math.max(0, Number(req.body.vatRate) || 0);
    const vatAmount = subtotal * vatRate / 100;
    const document = await SalesDocument.create({
      ...req.body, type, number, customerName, items: cleanItems, subtotal, vatRate, vatAmount, total: subtotal + vatAmount,
    });
    res.status(201).json(document);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;

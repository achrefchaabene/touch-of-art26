import express from "express";
import Supplier from "../models/Supplier.js";

const router = express.Router();

router.get("/", async (_req, res) => {
  try { res.json(await Supplier.find().sort({ name: 1 })); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

router.post("/", async (req, res) => {
  try {
    if (!req.body.name?.trim()) return res.status(400).json({ message: "Le nom du fournisseur est obligatoire." });
    res.status(201).json(await Supplier.create(req.body));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put("/:id", async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!supplier) return res.status(404).json({ message: "Fournisseur introuvable." });
    res.json(supplier);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete("/:id", async (req, res) => {
  try { await Supplier.findByIdAndDelete(req.params.id); res.json({ message: "Fournisseur supprime." }); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;

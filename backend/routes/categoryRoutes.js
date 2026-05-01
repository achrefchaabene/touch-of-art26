// routes/categoryRoutes.js
import express from "express";
import Category from "../models/Category.js";
import Product from "../models/Product.js";

const router = express.Router();

// GET  — toutes les catégories (tableau de noms)
router.get("/", async (req, res) => {
  try {
    const cats = await Category.find().sort({ name: 1 });
    res.json(cats.map((c) => c.name));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST — créer une catégorie
router.post("/", async (req, res) => {
  try {
    const cat = await Category.create({ name: req.body.name });
    res.status(201).json(cat.name);
  } catch (err) {
    if (err.code === 11000)
      return res.status(409).json({ message: "Cette catégorie existe déjà." });
    res.status(500).json({ message: err.message });
  }
});

// PUT  — renommer une catégorie (et mettre à jour les produits)
router.put("/:name", async (req, res) => {
  try {
    const oldName = decodeURIComponent(req.params.name);
    const newName = req.body.name?.trim();
    if (!newName) return res.status(400).json({ message: "Nom invalide." });

    const exists = await Category.findOne({ name: newName });
    if (exists)
      return res.status(409).json({ message: "Cette catégorie existe déjà." });

    const cat = await Category.findOneAndUpdate(
      { name: oldName },
      { name: newName },
      { new: true }
    );
    if (!cat)
      return res.status(404).json({ message: "Catégorie introuvable." });

    // Mettre à jour les produits qui utilisent l'ancienne catégorie
    await Product.updateMany({ category: oldName }, { category: newName });

    res.json(cat.name);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE — supprimer une catégorie (refusée si des produits l'utilisent)
router.delete("/:name", async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const count = await Product.countDocuments({ category: name });
    if (count > 0)
      return res
        .status(400)
        .json({ message: `${count} produit(s) utilisent cette catégorie.` });

    await Category.findOneAndDelete({ name });
    res.json({ message: "Catégorie supprimée." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;


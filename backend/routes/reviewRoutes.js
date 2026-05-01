// routes/reviewRoutes.js
import express from "express";
import Review from "../models/Review.js";
import Product from "../models/Product.js";

const router = express.Router();

// GET /api/reviews/:productId  — Get all reviews for a product
router.get("/:productId", async (req, res) => {
  try {
    const reviews = await Review.find({ productId: req.params.productId }).sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
});

// POST /api/reviews/:productId  — Add a review
router.post("/:productId", async (req, res) => {
  try {
    const { userId, userName, rating, comment } = req.body;

    if (!userId || !userName || !rating) {
      return res.status(400).json({ message: "userId, userName et rating sont requis" });
    }

    // Prevent duplicate review by same user on same product
    const existing = await Review.findOne({ productId: req.params.productId, userId });
    if (existing) {
      return res.status(409).json({ message: "Vous avez déjà laissé un avis pour ce produit" });
    }

    const review = await Review.create({
      productId: req.params.productId,
      userId,
      userName,
      rating: Number(rating),
      comment: comment || "",
    });

    // Recalculate average rating for the product
    const allReviews = await Review.find({ productId: req.params.productId });
    const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
    await Product.findByIdAndUpdate(req.params.productId, { rating: Math.round(avg * 10) / 10 });

    res.status(201).json(review);
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
});

// Helper: recalculate and save product average rating
const recalcRating = async (productId) => {
  const all = await Review.find({ productId });
  const avg = all.length > 0
    ? Math.round((all.reduce((s, r) => s + r.rating, 0) / all.length) * 10) / 10
    : 0;
  await Product.findByIdAndUpdate(productId, { rating: avg });
  return avg;
};

// PUT /api/reviews/review/:reviewId  — Edit a review
router.put("/review/:reviewId", async (req, res) => {
  try {
    const { rating, comment } = req.body;
    if (!rating) return res.status(400).json({ message: "rating est requis" });

    const review = await Review.findByIdAndUpdate(
      req.params.reviewId,
      { rating: Number(rating), comment: comment || "" },
      { new: true }
    );
    if (!review) return res.status(404).json({ message: "Avis introuvable" });

    await recalcRating(review.productId);
    res.json(review);
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
});

// DELETE /api/reviews/review/:reviewId  — Delete a review
router.delete("/review/:reviewId", async (req, res) => {
  try {
    const review = await Review.findById(req.params.reviewId);
    if (!review) return res.status(404).json({ message: "Avis introuvable" });

    const productId = review.productId;
    await Review.findByIdAndDelete(req.params.reviewId);
    await recalcRating(productId);

    res.json({ message: "Avis supprimé" });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
});

export default router;


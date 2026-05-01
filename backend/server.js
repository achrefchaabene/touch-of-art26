import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

import userRoutes from "./routes/userRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import statsRoutes from "./routes/statsRoutes.js";

import User from "./models/User.js";
import Product from "./models/Product.js";
import Category from "./models/Category.js";

dotenv.config();

const app = express();

// ✅ FIX CORS (simple et efficace)
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// ✅ Middleware
app.use(express.json());

// ✅ Static uploads
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ✅ Routes
app.use("/api/users", userRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/stats", statsRoutes);

// ─────────────────────────────────────────
// ✅ SEED PRODUITS
// ─────────────────────────────────────────
const seedProducts = async () => {
  const count = await Product.countDocuments();
  if (count > 0) return;

  const categories = ["Accessoires", "Montres", "Chaussures", "Vêtements"];

  for (const name of categories) {
    await Category.findOneAndUpdate({ name }, { name }, { upsert: true });
  }

  await Product.insertMany([
    {
      name: "Sac en cuir Artisan",
      description: "Sac à main en cuir véritable",
      price: 189.99,
      image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa",
      category: "Accessoires",
      stock: 15,
      rating: 4.8,
    },
    {
      name: "Montre Classique Noir",
      description: "Montre élégante",
      price: 249.99,
      image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314",
      category: "Montres",
      stock: 8,
      rating: 4.9,
    },
  ]);

  console.log("✅ Produits ajoutés");
};

// ─────────────────────────────────────────
// ✅ SEED ADMIN
// ─────────────────────────────────────────
const seedAdmin = async () => {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.warn("⚠️ Admin non défini dans .env");
    return;
  }

  const existing = await User.findOne({ email });

  if (!existing) {
    await User.create({
      username: "Admin",
      email,
      password,
      role: "admin",
    });

    console.log("✅ Admin créé");
  } else {
    console.log("ℹ️ Admin déjà existant");
  }
};

// ─────────────────────────────────────────
// ✅ DATABASE
// ─────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("✅ MongoDB connected");
    await seedProducts();
    await seedAdmin();
  })
  .catch((err) => {
    console.error("❌ MongoDB error:", err.message);
    process.exit(1);
  });

// ─────────────────────────────────────────
// ✅ SERVER
// ─────────────────────────────────────────
const PORT = process.env.PORT || 9000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// routes/userRoutes.js
import express from "express";
import crypto from "crypto";
import User from "../models/User.js";
import { sendPasswordReset } from "../services/emailService.js";

const router = express.Router();

// Helper : normalise le document Mongoose → objet attendu par le frontend
const normalize = (user) => ({
  id:    user._id.toHexString(),
  name:  user.username, 
  email: user.email,
  role:  user.role,
});

// Inscription
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: "Email déjà utilisé" });

    const user = new User({ username: name, email, password, role: "user" });
    await user.save();
    res.status(201).json(normalize(user));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Connexion
router.post("/login", async (req, res) => {
  try {
    const user = await User.findOne({
      email:    req.body.email,
      password: req.body.password,
    });
    if (!user) return res.status(401).json({ message: "Email ou mot de passe incorrect" });

    res.json(normalize(user));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Demande de réinitialisation du mot de passe
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    // Toujours répondre OK pour ne pas révéler si l'email existe
    if (!user) return res.json({ message: "Si cet email existe, un lien a été envoyé." });

    const token = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 30 * 60 * 1000); // 30 min
    await User.findByIdAndUpdate(user._id, { resetToken: token, resetTokenExpiry: expiry });

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:8080";
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;
    sendPasswordReset(email, resetLink).catch(() => {});

    res.json({ message: "Si cet email existe, un lien a été envoyé." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Réinitialiser le mot de passe via token
router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ message: "Token et mot de passe requis" });

    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: new Date() },
    });
    if (!user) return res.status(400).json({ message: "Lien invalide ou expiré" });

    await User.findByIdAndUpdate(user._id, {
      password,
      resetToken:       null,
      resetTokenExpiry: null,
    });
    res.json({ message: "Mot de passe réinitialisé avec succès" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Modifier son profil (nom, email, mot de passe)
router.put("/:id", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const update = {};
    if (name)     update.username = name;
    if (email)    update.email    = email;
    if (password) update.password = password;
    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: "Aucune modification fournie" });
    }
    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable" });
    res.json(normalize(user));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;



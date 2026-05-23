// services/emailService.js
// Requires: npm install nodemailer
// Configure in .env: EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, EMAIL_FROM

let transporter = null;

const initTransporter = async () => {
  if (transporter) return transporter;
  try {
    const nodemailer = await import("nodemailer");
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER) {
      console.log("ℹ️  Email désactivé — EMAIL_HOST / EMAIL_USER non définis dans .env");
      return null;
    }
    transporter = nodemailer.default.createTransport({
      host:   process.env.EMAIL_HOST,
      port:   parseInt(process.env.EMAIL_PORT || "587"),
      secure: process.env.EMAIL_PORT === "465",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    return transporter;
  } catch (err) {
    console.warn("⚠️  nodemailer non installé — emails désactivés. Exécutez: npm install nodemailer");
    return null;
  }
};

const statusLabels = {
  pending:    "En attente",
  accepted:   "Acceptée ✅",
  rejected:   "Refusée ❌",
  processing: "En traitement",
  shipped:    "Expédiée 🚚",
  delivered:  "Livrée 🎉",
};

const buildItemsHtml = (items = []) =>
  items.map((item) => {
    const salePrice = Number(item?.product?.salePrice);
    const regularPrice = Number(item?.product?.price ?? 0);
    const price = Number.isFinite(salePrice) && salePrice > 0 && salePrice < regularPrice
      ? salePrice
      : regularPrice;
    return `<tr>
      <td style="padding:6px 12px;border-bottom:1px solid #eee">${item?.product?.name ?? "Produit"}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:center">${item.quantity}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right">${(price * item.quantity).toFixed(2)} DT</td>
    </tr>`;
  }).join("");

export const sendOrderConfirmation = async (order) => {
  const t = await initTransporter();
  if (!t) return;
  const to = order.userEmail;
  if (!to) return;
  const html = `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a">
    <div style="background:#111;padding:24px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:22px">Touch Of Art</h1>
    </div>
    <div style="padding:24px">
      <h2 style="color:#333">Merci pour votre commande 🎉</h2>
      <p>Bonjour <strong>${order.userName ?? ""}</strong>,</p>
      <p>Votre commande <strong>#${order.id ?? order._id}</strong> du <strong>${order.date}</strong> a bien été reçue.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <thead>
          <tr style="background:#f5f5f5">
            <th style="padding:8px 12px;text-align:left">Article</th>
            <th style="padding:8px 12px;text-align:center">Qté</th>
            <th style="padding:8px 12px;text-align:right">Prix</th>
          </tr>
        </thead>
        <tbody>${buildItemsHtml(order.items)}</tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding:10px 12px;font-weight:bold">Total</td>
            <td style="padding:10px 12px;text-align:right;font-weight:bold">${(order.total ?? 0).toFixed(2)} DT</td>
          </tr>
        </tfoot>
      </table>
      <p>Vous recevrez un email dès que votre commande sera traitée.</p>
      <p style="color:#888;font-size:13px;margin-top:32px">Touch Of Art — Artisanat Tunisien</p>
    </div>
  </div>`;
  try {
    await t.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject: `Confirmation de commande #${order.id ?? order._id} — Touch Of Art`,
      html,
    });
    console.log(`✉️  Email confirmation envoyé à ${to}`);
  } catch (err) {
    console.error("Erreur envoi email confirmation:", err.message);
  }
};

export const sendPasswordReset = async (email, resetLink) => {
  const t = await initTransporter();
  if (!t) return;
  const html = `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a">
    <div style="background:#111;padding:24px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:22px">Touch Of Art</h1>
    </div>
    <div style="padding:24px">
      <h2>Réinitialisation du mot de passe 🔑</h2>
      <p>Vous avez demandé à réinitialiser votre mot de passe.</p>
      <p>Cliquez sur le bouton ci-dessous dans les <strong>30 minutes</strong> :</p>
      <div style="text-align:center;margin:24px 0">
        <a href="${resetLink}" style="background:#111;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block">
          Réinitialiser le mot de passe
        </a>
      </div>
      <p style="font-size:12px;color:#888">Si vous n'avez pas fait cette demande, ignorez cet email.</p>
      <p style="color:#888;font-size:13px;margin-top:32px">Touch Of Art — Artisanat Tunisien</p>
    </div>
  </div>`;
  try {
    await t.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: "Réinitialisation de votre mot de passe — Touch Of Art",
      html,
    });
    console.log(`✉️  Email reset envoyé à ${email}`);
  } catch (err) {
    console.error("Erreur envoi email reset:", err.message);
  }
};

export const sendStatusUpdate = async (order, newStatus) => {
  const t = await initTransporter();
  if (!t) return;
  const to = order.userEmail;
  if (!to) return;
  const label = statusLabels[newStatus] ?? newStatus;
  const html = `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a">
    <div style="background:#111;padding:24px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:22px">Touch Of Art</h1>
    </div>
    <div style="padding:24px">
      <h2>Mise à jour de votre commande</h2>
      <p>Bonjour <strong>${order.userName ?? ""}</strong>,</p>
      <p>Le statut de votre commande <strong>#${order.id ?? order._id}</strong> a été mis à jour :</p>
      <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:16px;margin:16px 0;text-align:center">
        <p style="font-size:20px;font-weight:bold;margin:0">${label}</p>
      </div>
      <p style="color:#888;font-size:13px;margin-top:32px">Touch Of Art — Artisanat Tunisien</p>
    </div>
  </div>`;
  try {
    await t.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject: `Commande #${order.id ?? order._id} — Statut : ${label}`,
      html,
    });
    console.log(`✉️  Email statut "${newStatus}" envoyé à ${to}`);
  } catch (err) {
    console.error("Erreur envoi email statut:", err.message);
  }
};


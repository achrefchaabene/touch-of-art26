// routes/orderRoutes.js
import express from "express";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import { sendOrderConfirmation, sendStatusUpdate } from "../services/emailService.js";

const router = express.Router();

const normalize = (doc) => {
  const obj = doc.toJSON();
  obj.id = doc._id.toHexString();
  return obj;
};

const getProductId = (item) => item?.product?._id ?? item?.product?.id ?? item?.product ?? null;

const getQuantity = (item) => {
  const value = Number(item?.quantity ?? 0);
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
};

const getUnitPrice = (product) => {
  const salePrice = Number(product?.salePrice);
  const price = Number(product?.price ?? 0);
  return Number.isFinite(salePrice) && salePrice > 0 && salePrice < price ? salePrice : price;
};

const buildQuantityMap = (items = []) => {
  const quantities = new Map();

  for (const item of items) {
    const productId = getProductId(item);
    const quantity = getQuantity(item);
    if (!productId || quantity <= 0) continue;
    quantities.set(productId, (quantities.get(productId) ?? 0) + quantity);
  }

  return quantities;
};

const buildOrderItems = async (items = []) => {
  const normalizedItems = [];

  for (const item of items) {
    const productId = getProductId(item);
    const quantity = getQuantity(item);
    if (!productId || quantity <= 0) continue;

    const product = await Product.findById(productId);
    if (!product) {
      throw new Error(`Produit introuvable: ${productId}`);
    }

    normalizedItems.push({
      product: normalize(product),
      quantity,
    });
  }

  return normalizedItems;
};

router.post("/", async (req, res) => {
  try {
    const { items } = req.body;

    for (const item of items ?? []) {
      const productId = getProductId(item);
      if (!productId) continue;
      const prod = await Product.findById(productId);
      if (!prod) continue;
      if (prod.stock < item.quantity) {
        return res.status(400).json({
          message: `Stock insuffisant pour "${prod.name}" (disponible : ${prod.stock}, demande : ${item.quantity})`,
        });
      }
    }

    const now = new Date();
    const order = new Order({
      ...req.body,
      history: [{
        status: "pending",
        date: now.toLocaleDateString("fr-FR"),
        time: now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
        note: "Commande recue",
      }],
    });
    await order.save();

    for (const item of items ?? []) {
      const productId = getProductId(item);
      if (!productId) continue;
      await Product.findByIdAndUpdate(productId, {
        $inc: { stock: -item.quantity },
      });
    }

    const normalized = normalize(order);
    sendOrderConfirmation(normalized).catch(() => {});
    res.status(201).json(normalized);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const orders = await Order.find().sort({ _id: -1 });
    res.json(orders.map(normalize));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/user/:userId", async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.params.userId }).sort({ _id: -1 });
    res.json(orders.map(normalize));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

const updateOrder = async (req, res) => {
  try {
    const { status, note = "", shipping, userEmail, userName, date, items, total } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Commande introuvable" });

    if (shipping && typeof shipping === "object") {
      order.shipping = {
        ...((order.shipping && typeof order.shipping.toObject === "function")
          ? order.shipping.toObject()
          : order.shipping),
        ...shipping,
      };
    }

    if (typeof userEmail === "string") order.userEmail = userEmail;
    if (typeof userName === "string") order.userName = userName;
    if (typeof date === "string") order.date = date;

    let itemsChanged = false;
    if (Array.isArray(items)) {
      const currentQuantities = buildQuantityMap(order.items ?? []);
      const nextQuantities = buildQuantityMap(items);
      const productIds = new Set([...currentQuantities.keys(), ...nextQuantities.keys()]);

      for (const productId of productIds) {
        const product = await Product.findById(productId);
        if (!product) {
          return res.status(404).json({ message: `Produit introuvable: ${productId}` });
        }

        const currentQuantity = currentQuantities.get(productId) ?? 0;
        const nextQuantity = nextQuantities.get(productId) ?? 0;
        const delta = nextQuantity - currentQuantity;

        if (delta > 0 && product.stock < delta) {
          return res.status(400).json({
            message: `Stock insuffisant pour "${product.name}" (disponible : ${product.stock}, demande supplementaire : ${delta})`,
          });
        }
      }

      const normalizedItems = await buildOrderItems(items);
      const orderItemsJson = JSON.stringify(order.items ?? []);
      const nextItemsJson = JSON.stringify(normalizedItems);
      itemsChanged = orderItemsJson !== nextItemsJson;

      for (const productId of productIds) {
        const currentQuantity = currentQuantities.get(productId) ?? 0;
        const nextQuantity = nextQuantities.get(productId) ?? 0;
        const delta = nextQuantity - currentQuantity;
        if (delta !== 0) {
          await Product.findByIdAndUpdate(productId, {
            $inc: { stock: -delta },
          });
        }
      }

      order.items = normalizedItems;
      order.total = normalizedItems.reduce(
        (sum, item) => sum + getUnitPrice(item.product) * getQuantity(item),
        0,
      );
    } else if (typeof total === "number") {
      order.total = total;
    }

    let statusChanged = false;
    if (typeof status === "string" && status.trim() && status !== order.status) {
      order.status = status;
      statusChanged = true;
    }

    const trimmedNote = note.trim();
    if (statusChanged || itemsChanged || trimmedNote) {
      const now = new Date();
      order.history.push({
        status: order.status,
        date: now.toLocaleDateString("fr-FR"),
        time: now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
        note: trimmedNote || (itemsChanged ? "Articles modifies dans la commande" : `Statut mis a jour : ${order.status}`),
      });
    }

    await order.save();

    const normalized = normalize(order);
    if (statusChanged) {
      sendStatusUpdate(normalized, order.status).catch(() => {});
    }
    res.json(normalized);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

router.put("/:id", updateOrder);
router.patch("/:id", updateOrder);

export default router;

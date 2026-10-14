// routes/statsRoutes.js
import express from "express";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Purchase from "../models/Purchase.js";
import SalesDocument from "../models/SalesDocument.js";

const router = express.Router();

// GET /api/stats  — Aggregate business statistics
router.get("/", async (req, res) => {
  try {
    const [orders, products, purchases, documents] = await Promise.all([
      Order.find(), Product.find(), Purchase.find().sort({ date: -1 }).limit(5), SalesDocument.find(),
    ]);

    // Build a map of productId -> purchasePrice for profit calculation
    const productMap = {};
    products.forEach((p) => {
      productMap[p._id.toString()] = {
        purchasePrice: p.purchasePrice ?? null,
        salePrice:     p.salePrice ?? null,
        price:         p.price ?? 0,
      };
    });

    const totalOrders = orders.length;
    const completedOrders = orders.filter((o) => ["accepted", "shipped", "delivered"].includes(o.status));
    const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalStock = products.reduce((sum, product) => sum + (product.stock || 0), 0);
    const stockValue = products.reduce((sum, product) => sum + (product.stock || 0) * (product.purchasePrice ?? 0), 0);
    const lowStockProducts = products
      .filter((product) => (product.stock || 0) <= 5)
      .sort((a, b) => (a.stock || 0) - (b.stock || 0))
      .slice(0, 10)
      .map((product) => ({ id: product.id, name: product.name, stock: product.stock, category: product.category }));
    const purchaseTotal = purchases.reduce((sum, purchase) => sum + (purchase.total || 0), 0);
    const invoices = documents.filter((document) => document.type === "invoice");
    const quotes = documents.filter((document) => document.type === "quote");

    // ── Profit calculation ────────────────────────────────────────────────────
    // For each item in completed orders:
    //   effectiveSellingPrice = salePrice (if active) OR price (from snapshot)
    //   purchasePrice         = from current Product document (via productMap)
    //   gain per item         = (effectiveSellingPrice - purchasePrice) * quantity
    let totalProfit = 0;

    // Orders by status
    const byStatus = {
      pending:   orders.filter((o) => o.status === "pending").length,
      accepted:  orders.filter((o) => o.status === "accepted").length,
      rejected:  orders.filter((o) => o.status === "rejected").length,
      shipped:   orders.filter((o) => o.status === "shipped").length,
      delivered: orders.filter((o) => o.status === "delivered").length,
    };

    // Top-selling products (by quantity sold, from accepted/shipped/delivered orders)
    const productSales = {};
    completedOrders.forEach((order) => {
      (order.items || []).forEach((item) => {
        const pid = String(item?.product?._id || item?.product?.id || "");
        if (!pid) return;

        // Effective selling price (snapshot value)
        const snapSale  = item?.product?.salePrice;
        const snapPrice = item?.product?.price || 0;
        const sellingPrice = (snapSale != null && snapSale > 0 && snapSale < snapPrice) ? snapSale : snapPrice;

        // Purchase price from current product catalogue
        const pp = productMap[pid]?.purchasePrice ?? null;
        const qty = item.quantity || 0;
        const itemProfit = pp !== null ? (sellingPrice - pp) * qty : 0;

        totalProfit += itemProfit;

        if (!productSales[pid]) {
          productSales[pid] = {
            id: pid,
            name: item?.product?.name || "Produit",
            image: item?.product?.image || "",
            quantitySold: 0,
            revenue: 0,
            profit: 0,
          };
        }
        productSales[pid].quantitySold += qty;
        productSales[pid].revenue      += sellingPrice * qty;
        productSales[pid].profit       += itemProfit;
      });
    });

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, 5);

    // Revenue + profit by month (last 6 months)
    const now = new Date();
    const revenueByMonth = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
      revenueByMonth.push({ month: label, revenue: 0, profit: 0, orders: 0 });
    }

    completedOrders.forEach((order) => {
      // parse date stored as "DD/MM/YYYY"
      const parts = (order.date || "").split("/");
      let orderDate;
      if (parts.length === 3) {
        orderDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      } else {
        orderDate = new Date(order.date);
      }
      if (isNaN(orderDate)) return;

      const startOf6Months = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      if (orderDate < startOf6Months) return;

      const diffMonths = (now.getFullYear() - orderDate.getFullYear()) * 12
        + (now.getMonth() - orderDate.getMonth());
      const idx = 5 - diffMonths;
      if (idx >= 0 && idx < 6) {
        revenueByMonth[idx].revenue += order.total || 0;
        revenueByMonth[idx].orders  += 1;

        // Profit for this order
        let orderProfit = 0;
        (order.items || []).forEach((item) => {
          const pid = String(item?.product?._id || item?.product?.id || "");
          const snapSale  = item?.product?.salePrice;
          const snapPrice = item?.product?.price || 0;
          const sellingPrice = (snapSale != null && snapSale > 0 && snapSale < snapPrice) ? snapSale : snapPrice;
          const pp = productMap[pid]?.purchasePrice ?? null;
          if (pp !== null) orderProfit += (sellingPrice - pp) * (item.quantity || 0);
        });
        revenueByMonth[idx].profit += orderProfit;
      }
    });

    res.json({
      totalOrders,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalProfit:  Math.round(totalProfit  * 100) / 100,
      byStatus,
      topProducts,
      revenueByMonth,
      totalStock,
      stockValue: Math.round(stockValue * 100) / 100,
      lowStockProducts,
      recentPurchases: purchases.map((purchase) => ({ id: purchase.id, supplier: purchase.supplier, date: purchase.date, total: purchase.total })),
      purchaseTotal: Math.round(purchaseTotal * 100) / 100,
      invoiceCount: invoices.length,
      quoteCount: quotes.length,
    });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
});

export default router;


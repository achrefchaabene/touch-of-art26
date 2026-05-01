import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  CheckCircle,
  History,
  Package,
  PartyPopper,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Truck,
  XCircle,
} from "lucide-react";

import Navbar from "@/components/Navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";
import { API_URL } from "@/lib/api";
import type { Order as BaseOrder, OrderHistoryEntry, Product, ShippingInfo } from "@/types";
const POLL_INTERVAL = 30_000;

type ProductOption = Product & {
  _id?: string;
};

type OrderProduct = Partial<Product> & {
  _id?: string;
};

type AdminOrder = BaseOrder & {
  _id?: string;
  shipping?: Partial<ShippingInfo>;
  items?: Array<{ product?: OrderProduct; quantity?: number }>;
  history?: OrderHistoryEntry[];
};

type EditableOrderItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  stock: number;
};

type EditFormState = {
  firstName: string;
  lastName: string;
  userEmail: string;
  phone: string;
  address: string;
  date: string;
  note: string;
  items: EditableOrderItem[];
};

const statusMap: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  pending: { label: "En attente", variant: "secondary" },
  accepted: { label: "Acceptee", variant: "default" },
  rejected: { label: "Refusee", variant: "destructive" },
  processing: { label: "En traitement", variant: "outline" },
  shipped: { label: "Expediee", variant: "outline" },
  delivered: { label: "Livree", variant: "default" },
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-400",
  accepted: "bg-green-500",
  rejected: "bg-red-500",
  processing: "bg-blue-400",
  shipped: "bg-indigo-500",
  delivered: "bg-emerald-500",
};

const getOrderId = (order: AdminOrder) => order.id ?? order._id ?? "";

const getCustomerName = (order: AdminOrder) =>
  `${order.shipping?.firstName ?? ""} ${order.shipping?.lastName ?? ""}`.trim() ||
  order.userName ||
  "Client";

const getUnitPrice = (item: { product?: Partial<Product>; quantity?: number }) =>
  Number(item.product?.salePrice ?? item.product?.price ?? 0);

const formatPrice = (value: number) => `${value.toFixed(2)} DT`;

const escapeHtml = (value: string) =>
  value
    .split("&").join("&amp;")
    .split("<").join("&lt;")
    .split(">").join("&gt;")
    .split('"').join("&quot;")
    .split("'").join("&#39;");

const getReadableErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof TypeError && error.message === "Failed to fetch") {
    return "Impossible de contacter le backend. Verifiez que VITE_API_URL pointe bien vers votre backend Render puis rechargez la page.";
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

const toInputDate = (value?: string) => {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const frMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (frMatch) {
    const [, day, month, year] = frMatch;
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
};

const toDisplayDate = (value: string) => {
  if (!value) return new Date().toLocaleDateString("fr-FR");
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
};

const getProductIdentifier = (product?: OrderProduct) => product?.id ?? product?._id ?? "";

const productToEditableItem = (item: { product?: OrderProduct; quantity?: number }): EditableOrderItem => ({
  productId: getProductIdentifier(item.product),
  name: item.product?.name ?? "Produit",
  price: Number(item.product?.salePrice ?? item.product?.price ?? 0),
  quantity: Math.max(1, Number(item.quantity ?? 1)),
  stock: Number(item.product?.stock ?? 0),
});

const createEditForm = (order: AdminOrder): EditFormState => ({
  firstName: order.shipping?.firstName ?? "",
  lastName: order.shipping?.lastName ?? "",
  userEmail: order.userEmail ?? "",
  phone: order.shipping?.phone ?? "",
  address: order.shipping?.address ?? "",
  date: toInputDate(order.date),
  note: "",
  items: (order.items ?? []).map(productToEditableItem),
});

const buildPrintableOrderHtml = (order: AdminOrder) => {
  const orderId = getOrderId(order);
  const orderDate = order.date || new Date().toLocaleDateString("fr-FR");
  const logoUrl = `${window.location.origin}/logo.jpg`;
  const itemsRows = (order.items ?? [])
    .map((item, index) => {
      const quantity = Number(item.quantity ?? 1);
      const unitPrice = getUnitPrice(item);
      const total = quantity * unitPrice;

      return `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(getProductIdentifier(item.product) || `P-${index + 1}`)}</td>
          <td>${escapeHtml(item.product?.name ?? "Produit")}</td>
          <td>${quantity}</td>
          <td>${formatPrice(unitPrice)}</td>
          <td>${formatPrice(total)}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <!DOCTYPE html>
    <html lang="fr">
      <head>
        <meta charset="UTF-8" />
        <title>Bon de livraison ${escapeHtml(orderId)}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            font-family: Arial, Helvetica, sans-serif;
            color: #111827;
            background: #ffffff;
          }
          .page {
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            padding: 16mm 14mm 18mm;
          }
          .header,
          .topline,
          .summary {
            display: flex;
            justify-content: space-between;
            gap: 16px;
          }
          .logo-box img {
            width: 120px;
            height: 120px;
            object-fit: contain;
            border: 1px solid #d1d5db;
            padding: 8px;
          }
          .doc-title {
            text-align: right;
          }
          .doc-title h1 {
            margin: 0 0 8px;
            font-size: 20px;
            letter-spacing: 0.04em;
          }
          .doc-title p {
            margin: 4px 0;
            font-size: 14px;
          }
          .section {
            margin-top: 16px;
            padding-top: 12px;
            border-top: 1px solid #d1d5db;
          }
          .company,
          .client {
            width: 48%;
          }
          .company h2,
          .client h2 {
            margin: 0 0 6px;
            font-size: 14px;
            text-transform: uppercase;
          }
          .company p,
          .client p {
            margin: 4px 0;
            font-size: 13px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 14px;
            font-size: 12px;
          }
          th,
          td {
            border: 1px solid #d1d5db;
            padding: 8px 7px;
            text-align: left;
          }
          th {
            background: #f3f4f6;
          }
          .summary {
            margin-top: 14px;
            align-items: flex-start;
          }
          .note-box {
            width: 54%;
            padding-top: 10px;
            font-size: 13px;
            font-style: italic;
          }
          .totals {
            width: 38%;
            margin-left: auto;
          }
          .totals-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 10px;
            border-bottom: 1px solid #d1d5db;
            font-size: 13px;
          }
          .totals-row.total {
            background: #f3f4f6;
            font-weight: 700;
          }
          .signature {
            margin-top: 18px;
            margin-left: auto;
            width: 42%;
            height: 90px;
            border: 1px solid #d1d5db;
            display: flex;
            align-items: flex-end;
            justify-content: center;
            padding-bottom: 10px;
            color: #9ca3af;
            font-size: 12px;
          }
          @media print {
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
            .page { padding: 10mm 12mm; }
          }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="header">
            <div class="logo-box">
              <img src="${logoUrl}" alt="Touch of Art" />
            </div>
            <div class="doc-title">
              <h1>BON DE LIVRAISON</h1>
              <p><strong>BL-${escapeHtml(orderId.slice(-8).toUpperCase() || "00000000")}</strong></p>
              <p>Date: ${escapeHtml(orderDate)}</p>
            </div>
          </div>

          <div class="section topline">
            <div class="company">
              <h2>TOUCH OF ART</h2>
              <p>Monastir, Tunisie</p>
              <p>Contact: Touch of Art</p>
            </div>
            <div class="client">
              <h2>Client</h2>
              <p><strong>${escapeHtml(getCustomerName(order))}</strong></p>
              <p>${escapeHtml(order.userEmail ?? "-")}</p>
              <p>${escapeHtml(order.shipping?.phone ?? "-")}</p>
              <p>${escapeHtml(order.shipping?.address ?? "-")}</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 7%;">N</th>
                <th style="width: 16%;">Ref.</th>
                <th>Designation</th>
                <th style="width: 12%;">Quantite</th>
                <th style="width: 16%;">P.U</th>
                <th style="width: 16%;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows || `<tr><td colspan="6" style="text-align:center;">Aucun article</td></tr>`}
            </tbody>
          </table>

          <div class="summary">
            <div class="note-box">
              Arrete le present bon de livraison a la somme de <strong>${escapeHtml(formatPrice(Number(order.total ?? 0)))}</strong>.
            </div>
            <div class="totals">
              <div class="totals-row">
                <span>Total HT</span>
                <span>${escapeHtml(formatPrice(Number(order.total ?? 0)))}</span>
              </div>
              <div class="totals-row">
                <span>Statut</span>
                <span>${escapeHtml(statusMap[order.status]?.label ?? order.status)}</span>
              </div>
              <div class="totals-row total">
                <span>Net a payer</span>
                <span>${escapeHtml(formatPrice(Number(order.total ?? 0)))}</span>
              </div>
            </div>
          </div>

          <div class="signature">Signature</div>
        </div>
        <script>
          window.addEventListener("load", function () {
            setTimeout(function () {
              window.print();
            }, 250);
          });
        </script>
      </body>
    </html>
  `;
};

const AdminOrders = () => {
  const { user, isAuthenticated } = useAuth();
  const [adminOrders, setAdminOrders] = useState<AdminOrder[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [openHistory, setOpenHistory] = useState<Record<string, boolean>>({});
  const [editingOrder, setEditingOrder] = useState<AdminOrder | null>(null);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchProducts = async () => {
    const res = await fetch(`${API_URL}/api/products`);
    if (!res.ok) throw new Error(`Erreur produits : ${res.status}`);
    const data = await res.json();
    setProducts(Array.isArray(data) ? data : []);
  };

  const fetchOrders = async (silent = false) => {
    if (!silent) setLoading(true);
    setFetchError(null);

    try {
      const res = await fetch(`${API_URL}/api/orders`);
      if (!res.ok) throw new Error(`Erreur serveur : ${res.status}`);
      const data = await res.json();
      setAdminOrders(Array.isArray(data) ? data : []);
      setLastRefresh(new Date());
    } catch (err: any) {
      console.error("fetchOrders error:", err);
      setFetchError(getReadableErrorMessage(err, "Impossible de charger les commandes"));
      if (!silent) {
        toast({
          title: "Erreur",
          description: getReadableErrorMessage(err, "Impossible de charger les commandes"),
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      await Promise.all([fetchOrders(), fetchProducts()]);
    };

    loadInitialData();
    intervalRef.current = setInterval(() => fetchOrders(true), POLL_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpdateStatus = async (orderId: string, status: string) => {
    try {
      const res = await fetch(`${API_URL}/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Impossible de mettre a jour le statut");

      const updatedOrder = await res.json();
      setAdminOrders((prev) =>
        prev.map((order) => (getOrderId(order) === orderId ? updatedOrder : order)),
      );

      if (editingOrder && getOrderId(editingOrder) === orderId) {
        setEditingOrder(updatedOrder);
      }

      toast({
        title: "Statut mis a jour",
        description: `Commande ${orderId} est maintenant ${statusMap[status]?.label || status}`,
      });
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Erreur",
        description: getReadableErrorMessage(err, "Impossible de mettre a jour la commande"),
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (order: AdminOrder) => {
    setEditingOrder(order);
    setEditForm(createEditForm(order));
  };

  const closeEditDialog = () => {
    if (savingEdit) return;
    setEditingOrder(null);
    setEditForm(null);
  };

  const handleEditFieldChange = (field: keyof Omit<EditFormState, "items">, value: string) => {
    setEditForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const buildEditableItemFromProduct = (productId: string): EditableOrderItem | null => {
    const product = products.find((entry) => (entry.id ?? entry._id) === productId);
    if (!product) return null;

    return {
      productId: product.id ?? product._id ?? "",
      name: product.name,
      price: Number(product.salePrice ?? product.price ?? 0),
      quantity: 1,
      stock: Number(product.stock ?? 0),
    };
  };

  const handleEditItemChange = (index: number, field: "productId" | "quantity", value: string) => {
    setEditForm((prev) => {
      if (!prev) return prev;

      const nextItems = [...prev.items];
      const currentItem = nextItems[index];
      if (!currentItem) return prev;

      if (field === "productId") {
        const replacement = buildEditableItemFromProduct(value);
        if (!replacement) return prev;
        nextItems[index] = { ...replacement, quantity: currentItem.quantity || 1 };
      } else {
        nextItems[index] = {
          ...currentItem,
          quantity: Math.max(1, Number(value || 1)),
        };
      }

      return { ...prev, items: nextItems };
    });
  };

  const handleAddItem = () => {
    if (products.length === 0) {
      toast({
        title: "Aucun produit",
        description: "Ajoutez d'abord des produits dans le catalogue.",
        variant: "destructive",
      });
      return;
    }

    const fallbackProduct = products.find((product) => {
      const productId = product.id ?? product._id ?? "";
      return !editForm?.items.some((item) => item.productId === productId);
    }) ?? products[0];

    const newItem = buildEditableItemFromProduct(fallbackProduct.id ?? fallbackProduct._id ?? "");
    if (!newItem) return;

    setEditForm((prev) => (prev ? { ...prev, items: [...prev.items, newItem] } : prev));
  };

  const handleRemoveItem = (index: number) => {
    setEditForm((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.filter((_, itemIndex) => itemIndex !== index),
      };
    });
  };

  const editTotal = useMemo(
    () => (editForm?.items ?? []).reduce((sum, item) => sum + item.price * item.quantity, 0),
    [editForm],
  );

  const handleSaveOrder = async () => {
    if (!editingOrder || !editForm) return;
    if (editForm.items.length === 0) {
      toast({
        title: "Commande vide",
        description: "Ajoutez au moins un article avant d'enregistrer.",
        variant: "destructive",
      });
      return;
    }

    const orderId = getOrderId(editingOrder);
    setSavingEdit(true);

    try {
      const payload = {
        userName: `${editForm.firstName} ${editForm.lastName}`.trim(),
        userEmail: editForm.userEmail.trim(),
        date: toDisplayDate(editForm.date),
        shipping: {
          firstName: editForm.firstName.trim(),
          lastName: editForm.lastName.trim(),
          phone: editForm.phone.trim(),
          address: editForm.address.trim(),
        },
        items: editForm.items.map((item) => ({
          product: {
            id: item.productId,
            name: item.name,
            price: item.price,
          },
          quantity: item.quantity,
        })),
        total: editTotal,
        note: editForm.note.trim() || "Commande modifiee depuis l'administration",
      };

      const res = await fetch(`${API_URL}/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const responseData = await res.json();
      if (!res.ok) throw new Error(responseData.message || "Impossible de modifier la commande");

      setAdminOrders((prev) =>
        prev.map((order) => (getOrderId(order) === orderId ? responseData : order)),
      );

      setEditingOrder(null);
      setEditForm(null);
      await fetchProducts();

      toast({
        title: "Commande modifiee",
        description: `Les articles de la commande ${orderId} ont ete mis a jour.`,
      });
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Erreur",
        description: getReadableErrorMessage(err, "Impossible de modifier la commande"),
        variant: "destructive",
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const handlePrint = (order: AdminOrder) => {
    const printWindow = window.open("", "_blank", "width=920,height=1200");
    if (!printWindow) {
      toast({
        title: "Impression bloquee",
        description: "Autorisez les pop-ups pour generer le bon de livraison.",
        variant: "destructive",
      });
      return;
    }

    printWindow.document.open();
    printWindow.document.write(buildPrintableOrderHtml(order));
    printWindow.document.close();
    printWindow.focus();
  };

  if (!isAuthenticated || user?.role !== "admin") {
    return <Navigate to="/login" replace />;
  }

  if (fetchError && adminOrders.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center gap-4 py-32">
            <p className="text-lg font-medium text-destructive">Erreur : {fetchError}</p>
            <p className="text-sm text-muted-foreground">Le backend est-il bien demarre sur le port 9000 ?</p>
            <Button onClick={() => fetchOrders()}>Reessayer</Button>
          </div>
        </main>
      </div>
    );
  }

  const pending = adminOrders.filter((order) => order.status === "pending").length;
  const accepted = adminOrders.filter((order) => order.status === "accepted").length;
  const rejected = adminOrders.filter((order) => order.status === "rejected").length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-7 w-7 text-primary" />
            <h1 className="font-display text-3xl font-bold">Commandes recues</h1>
            {adminOrders.length > 0 && (
              <span className="rounded-full bg-primary px-2.5 py-0.5 text-sm font-semibold text-primary-foreground">
                {adminOrders.length}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {lastRefresh && (
              <p className="text-xs text-muted-foreground">
                Actualise a {lastRefresh.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
            <Button variant="outline" size="sm" onClick={() => fetchOrders()} disabled={loading} className="gap-1.5">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Actualiser
            </Button>
          </div>
        </div>

        {adminOrders.length > 0 && (
          <div className="mb-6 grid grid-cols-3 gap-3">
            <div className="rounded-lg border bg-card p-3 text-center">
              <p className="text-2xl font-bold text-yellow-600">{pending}</p>
              <p className="text-xs text-muted-foreground">En attente</p>
            </div>
            <div className="rounded-lg border bg-card p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{accepted}</p>
              <p className="text-xs text-muted-foreground">Acceptees</p>
            </div>
            <div className="rounded-lg border bg-card p-3 text-center">
              <p className="text-2xl font-bold text-destructive">{rejected}</p>
              <p className="text-xs text-muted-foreground">Refusees</p>
            </div>
          </div>
        )}

        {loading && adminOrders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-12">
              <RefreshCw className="h-10 w-10 animate-spin text-muted-foreground/40" />
              <p className="mt-3 text-muted-foreground">Chargement des commandes...</p>
            </CardContent>
          </Card>
        ) : adminOrders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-12">
              <Package className="h-12 w-12 text-muted-foreground/40" />
              <p className="mt-3 text-muted-foreground">Aucune commande recue pour le moment.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {adminOrders.map((order) => {
              const orderId = getOrderId(order);
              const status = statusMap[order.status] || { label: order.status, variant: "secondary" as const };

              return (
                <Card
                  key={orderId}
                  className={
                    order.status === "pending"
                      ? "border-yellow-300"
                      : order.status === "accepted"
                        ? "border-green-300"
                        : order.status === "rejected"
                          ? "border-red-300"
                          : ""
                  }
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle className="font-mono text-sm">#{orderId}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant={status.variant}>{status.label}</Badge>
                        <span className="text-sm text-muted-foreground">{order.date}</span>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1 rounded-lg border p-3">
                        <h4 className="text-xs font-semibold uppercase text-muted-foreground">Client</h4>
                        <p className="text-sm font-medium">{getCustomerName(order)}</p>
                        <p className="text-sm text-muted-foreground">{order.userEmail ?? "-"}</p>
                        <p className="text-sm text-muted-foreground">Tel: {order.shipping?.phone ?? "-"}</p>
                        <p className="text-sm text-muted-foreground">Adresse: {order.shipping?.address ?? "-"}</p>
                      </div>

                      <div className="space-y-1 rounded-lg border p-3">
                        <h4 className="text-xs font-semibold uppercase text-muted-foreground">Articles</h4>
                        {(order.items ?? []).map((item, index) => {
                          const quantity = Number(item.quantity ?? 1);
                          const lineTotal = getUnitPrice(item) * quantity;

                          return (
                            <div key={index} className="flex justify-between text-sm">
                              <span>{item.product?.name ?? "Produit"} x {quantity}</span>
                              <span className="font-medium">{formatPrice(lineTotal)}</span>
                            </div>
                          );
                        })}
                        <div className="mt-1 flex justify-between border-t pt-1 text-sm font-bold">
                          <span>Total</span>
                          <span>{formatPrice(Number(order.total ?? 0))}</span>
                        </div>
                      </div>
                    </div>

                    {(order.history ?? []).length > 0 && (
                      <div className="border-t pt-3">
                        <button
                          type="button"
                          className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                          onClick={() => setOpenHistory((prev) => ({ ...prev, [orderId]: !prev[orderId] }))}
                        >
                          <History className="h-3.5 w-3.5" />
                          {openHistory[orderId] ? "Masquer" : "Voir"} l'historique ({order.history?.length})
                        </button>

                        {openHistory[orderId] && (
                          <ol className="relative ml-2 mt-3 space-y-3 border-l border-muted">
                            {[...(order.history ?? [])].reverse().map((entry, index) => (
                              <li key={index} className="ml-4">
                                <span
                                  className={`absolute -left-1.5 mt-1 h-3 w-3 rounded-full border-2 border-background ${statusColors[entry.status] ?? "bg-gray-400"}`}
                                />
                                <p className="text-xs font-semibold">{statusMap[entry.status]?.label ?? entry.status}</p>
                                <p className="text-xs text-muted-foreground">
                                  {entry.date} a {entry.time}
                                  {entry.note ? ` - ${entry.note}` : ""}
                                </p>
                              </li>
                            ))}
                          </ol>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap justify-end gap-2 border-t pt-3">
                      <Button size="sm" variant="outline" onClick={() => openEditDialog(order)}>
                        <Pencil className="mr-1 h-4 w-4" /> Modifier
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handlePrint(order)}>
                        <Printer className="mr-1 h-4 w-4" /> Imprimer
                      </Button>

                      {order.status === "pending" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-destructive text-destructive hover:bg-destructive/10"
                            onClick={() => handleUpdateStatus(orderId, "rejected")}
                          >
                            <XCircle className="mr-1 h-4 w-4" /> Refuser
                          </Button>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleUpdateStatus(orderId, "accepted")}
                          >
                            <CheckCircle className="mr-1 h-4 w-4" /> Accepter
                          </Button>
                        </>
                      )}

                      {order.status === "accepted" && (
                        <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(orderId, "shipped")}>
                          <Truck className="mr-1 h-4 w-4" /> Marquer comme expediee
                        </Button>
                      )}

                      {order.status === "shipped" && (
                        <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(orderId, "delivered")}>
                          <PartyPopper className="mr-1 h-4 w-4" /> Marquer comme livree
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <Dialog open={Boolean(editingOrder)} onOpenChange={(open) => !open && closeEditDialog()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Modifier la commande</DialogTitle>
            <DialogDescription>
              Vous pouvez ajouter des articles, changer les quantites ou supprimer des lignes.
            </DialogDescription>
          </DialogHeader>

          {editForm && (
            <div className="grid gap-5 py-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Prenom</label>
                  <Input
                    value={editForm.firstName}
                    onChange={(event) => handleEditFieldChange("firstName", event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Nom</label>
                  <Input
                    value={editForm.lastName}
                    onChange={(event) => handleEditFieldChange("lastName", event.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    value={editForm.userEmail}
                    onChange={(event) => handleEditFieldChange("userEmail", event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Telephone</label>
                  <Input
                    value={editForm.phone}
                    onChange={(event) => handleEditFieldChange("phone", event.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Adresse</label>
                <Textarea
                  value={editForm.address}
                  onChange={(event) => handleEditFieldChange("address", event.target.value)}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date</label>
                  <Input
                    type="date"
                    value={editForm.date}
                    onChange={(event) => handleEditFieldChange("date", event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Note d'historique</label>
                  <Input
                    value={editForm.note}
                    onChange={(event) => handleEditFieldChange("note", event.target.value)}
                    placeholder="Ex: Article remplace avant livraison"
                  />
                </div>
              </div>

              <div className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">Articles de la commande</h3>
                    <p className="text-xs text-muted-foreground">
                      Ajoutez ou supprimez des articles, puis ajustez les quantites.
                    </p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                    <Plus className="mr-1 h-4 w-4" /> Ajouter un article
                  </Button>
                </div>

                <div className="space-y-3">
                  {editForm.items.map((item, index) => (
                    <div key={`${item.productId}-${index}`} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[1.7fr_0.7fr_0.8fr_auto]">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Produit</label>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={item.productId}
                          onChange={(event) => handleEditItemChange(index, "productId", event.target.value)}
                        >
                          {products.map((product) => {
                            const productId = product.id ?? product._id ?? "";
                            const productPrice = Number(product.salePrice ?? product.price ?? 0);
                            return (
                              <option key={productId} value={productId}>
                                {product.name} - {formatPrice(productPrice)}
                              </option>
                            );
                          })}
                        </select>
                        <p className="text-xs text-muted-foreground">
                          Stock catalogue: {item.stock}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Quantite</label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(event) => handleEditItemChange(index, "quantity", event.target.value)}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Sous-total</label>
                        <div className="flex h-10 items-center rounded-md border border-input px-3 text-sm font-medium">
                          {formatPrice(item.price * item.quantity)}
                        </div>
                      </div>

                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemoveItem(index)}
                        >
                          <Trash2 className="mr-1 h-4 w-4" /> Supprimer
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end border-t pt-3">
                  <div className="rounded-lg bg-muted px-4 py-2 text-right">
                    <p className="text-xs text-muted-foreground">Nouveau total</p>
                    <p className="text-lg font-bold">{formatPrice(editTotal)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeEditDialog} disabled={savingEdit}>
              Annuler
            </Button>
            <Button onClick={handleSaveOrder} disabled={savingEdit}>
              {savingEdit ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminOrders;

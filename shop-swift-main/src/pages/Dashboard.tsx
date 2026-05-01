import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useRef, useState } from "react";
import { User, Package, LogOut, RefreshCw, CheckCircle2, XCircle, Clock, Truck, PartyPopper, Pencil, Save, X, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import { OrderHistoryEntry } from "@/types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:9000";

const statusColors: Record<string, string> = {
  pending:    "bg-yellow-400",
  accepted:   "bg-green-500",
  rejected:   "bg-red-500",
  processing: "bg-blue-400",
  shipped:    "bg-indigo-500",
  delivered:  "bg-emerald-500",
};

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  pending:    { label: "En attente",     variant: "secondary",    icon: <Clock className="h-3.5 w-3.5" /> },
  accepted:   { label: "Acceptée",       variant: "default",      icon: <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> },
  rejected:   { label: "Refusée",        variant: "destructive",  icon: <XCircle className="h-3.5 w-3.5" /> },
  processing: { label: "En traitement",  variant: "outline",      icon: <Clock className="h-3.5 w-3.5" /> },
  shipped:    { label: "Expédiée",       variant: "outline",      icon: <Truck className="h-3.5 w-3.5" /> },
  delivered:  { label: "Livrée",         variant: "default",      icon: <PartyPopper className="h-3.5 w-3.5" /> },
};

const POLL_INTERVAL = 30_000; // 30 secondes

const Dashboard = () => {
  const { user, orders, ordersLoading, isAuthenticated, logout, refreshOrders } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [openHistory, setOpenHistory] = useState<Record<string, boolean>>({});
  const [profileForm, setProfileForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [saving, setSaving] = useState(false);

  // Auto-refresh toutes les 30 secondes
  const refreshRef = useRef(refreshOrders);
  refreshRef.current = refreshOrders;

  useEffect(() => {
    if (!isAuthenticated) return;
    const id = setInterval(() => refreshRef.current(), POLL_INTERVAL);
    return () => clearInterval(id);
  }, [isAuthenticated]);

  if (!isAuthenticated) return <Navigate to="/login" />;

  const startEdit = () => {
    setProfileForm({ name: user?.name ?? "", email: user?.email ?? "", password: "", confirmPassword: "" });
    setEditMode(true);
  };

  const handleProfileSave = async () => {
    if (profileForm.password && profileForm.password !== profileForm.confirmPassword) {
      toast({ title: "Erreur", description: "Les mots de passe ne correspondent pas.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, string> = {};
      if (profileForm.name  && profileForm.name  !== user?.name)  body.name     = profileForm.name;
      if (profileForm.email && profileForm.email !== user?.email) body.email    = profileForm.email;
      if (profileForm.password)                                    body.password = profileForm.password;
      if (Object.keys(body).length === 0) { setEditMode(false); return; }
      const res = await fetch(`${API_URL}/api/users/${user?.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      const updated = await res.json();
      // Update localStorage
      const stored = JSON.parse(localStorage.getItem("shopswift_user") || "{}");
      localStorage.setItem("shopswift_user", JSON.stringify({ ...stored, ...updated }));
      toast({ title: "Profil mis à jour ✅" });
      setEditMode(false);
      // Reload page to refresh auth context
      window.location.reload();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Toutes les commandes, tri par date décroissante
  const pendingOrders = [...orders].sort((a, b) => b.id.localeCompare(a.id));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <h1 className="font-display text-3xl font-bold">Mon Compte</h1>

        <div className="mt-8 grid gap-8 md:grid-cols-3">
          {/* Profil */}
          <div className="rounded-lg border bg-card p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <User className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{user?.name}</p>
                <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>

            {editMode ? (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="pf-name" className="text-xs">Nom</Label>
                  <Input id="pf-name" value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="pf-email" className="text-xs">Email</Label>
                  <Input id="pf-email" type="email" value={profileForm.email} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="pf-pw" className="text-xs">Nouveau mot de passe <span className="text-muted-foreground">(optionnel)</span></Label>
                  <Input id="pf-pw" type="password" placeholder="Laisser vide pour garder l'actuel" value={profileForm.password} onChange={(e) => setProfileForm({ ...profileForm, password: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="pf-pw2" className="text-xs">Confirmer le mot de passe</Label>
                  <Input id="pf-pw2" type="password" value={profileForm.confirmPassword} onChange={(e) => setProfileForm({ ...profileForm, confirmPassword: e.target.value })} />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" className="flex-1" onClick={handleProfileSave} disabled={saving}>
                    <Save className="mr-1.5 h-3.5 w-3.5" />
                    {saving ? "Enregistrement…" : "Enregistrer"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditMode(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" size="sm" className="w-full" onClick={startEdit}>
                <Pencil className="mr-2 h-4 w-4" />
                Modifier le profil
              </Button>
            )}

            <Button variant="outline" className="w-full text-destructive hover:text-destructive" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              Déconnexion
            </Button>
          </div>

          {/* Commandes */}
          <div className="md:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-xl font-bold">
                <Package className="h-5 w-5" />
                Mes commandes
                {pendingOrders.length > 0 && (
                  <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                    {pendingOrders.length}
                  </span>
                )}
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refreshOrders()}
                disabled={ordersLoading}
                className="gap-1.5"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${ordersLoading ? "animate-spin" : ""}`} />
                Actualiser
              </Button>
            </div>
            <div className="mt-4 space-y-3">
              {ordersLoading && orders.length === 0 ? (
                <div className="rounded-lg border bg-card p-8 text-center">
                  <RefreshCw className="mx-auto h-8 w-8 animate-spin text-muted-foreground/40" />
                  <p className="mt-3 text-muted-foreground">Chargement des commandes…</p>
                </div>
              ) : pendingOrders.length === 0 ? (
                <div className="rounded-lg border bg-card p-8 text-center">
                  <Clock className="mx-auto h-10 w-10 text-muted-foreground/40" />
                  <p className="mt-3 text-muted-foreground">Aucune commande pour le moment.</p>
                  <p className="mt-1 text-xs text-muted-foreground">Explorez la boutique et passez votre première commande !</p>
                </div>
              ) : (
                pendingOrders.map((order) => {
                  const s = statusConfig[order.status] ?? { label: order.status, variant: "secondary" as const, icon: null };
                  return (
                    <div
                      key={order.id}
                      className={`rounded-lg border bg-card p-4 transition-colors ${
                        order.status === "accepted" ? "border-green-200 bg-green-50/30 dark:bg-green-950/10" :
                        order.status === "rejected" ? "border-red-200 bg-red-50/30 dark:bg-red-950/10" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs text-muted-foreground font-mono">#{order.id}</p>
                          <p className="text-sm text-muted-foreground">{order.date}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{order.total.toFixed(2)} DT</p>
                          <Badge variant={s.variant} className="mt-1 gap-1">
                            {s.icon}
                            {s.label}
                          </Badge>
                        </div>
                      </div>
                      {/* Articles */}
                      <div className="mt-3 space-y-1 border-t pt-3">
                        {order.items?.map((item, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{item.product?.name} × {item.quantity}</span>
                            <span>{((item.product?.price ?? 0) * item.quantity).toFixed(2)} DT</span>
                          </div>
                        ))}
                      </div>

                      {/* Historique des statuts */}
                      {(order.history ?? []).length > 0 && (
                        <div className="border-t pt-2 mt-2">
                          <button
                            type="button"
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => setOpenHistory((prev) => ({ ...prev, [order.id]: !prev[order.id] }))}
                          >
                            <History className="h-3 w-3" />
                            {openHistory[order.id] ? "Masquer" : "Voir"} l'historique
                          </button>
                          {openHistory[order.id] && (
                            <ol className="mt-2 relative border-l border-muted ml-2 space-y-2">
                              {[...(order.history ?? [])].reverse().map((entry: OrderHistoryEntry, i: number) => (
                                <li key={i} className="ml-3">
                                  <span className={`absolute -left-1 mt-1 h-2.5 w-2.5 rounded-full border-2 border-background ${statusColors[entry.status] ?? "bg-gray-400"}`} />
                                  <p className="text-xs font-semibold">{statusConfig[entry.status]?.label ?? entry.status}</p>
                                  <p className="text-xs text-muted-foreground">{entry.date} à {entry.time}{entry.note ? ` — ${entry.note}` : ""}</p>
                                </li>
                              ))}
                            </ol>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;

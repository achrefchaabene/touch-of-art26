import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart2, TrendingUp, ShoppingBag, Banknote, RefreshCw, CircleDollarSign } from "lucide-react";
import { API_URL } from "@/lib/api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from "recharts";

interface Stats {
  totalOrders: number;
  totalRevenue: number;
  totalProfit: number;
  byStatus: Record<string, number>;
  topProducts: { id: string; name: string; quantitySold: number; revenue: number; profit: number }[];
  revenueByMonth: { month: string; revenue: number; profit: number; orders: number }[];
}

const StatCard = ({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) => (
  <Card>
    <CardContent className="flex items-center gap-4 pt-6">
      <div className="rounded-full bg-primary/10 p-3">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </CardContent>
  </Card>
);

const AdminStats = () => {
  const { user, isAuthenticated } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/stats`);
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      setStats(await res.json());
    } catch (err: any) {
      setError(err.message || "Impossible de charger les statistiques");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  if (!isAuthenticated || user?.role !== "admin") return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart2 className="h-7 w-7 text-primary" />
            <h1 className="font-display text-3xl font-bold">Statistiques</h1>
          </div>
          <Button variant="outline" size="sm" onClick={fetchStats} disabled={loading} className="gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {error} — Le backend est-il démarré sur le port 9000 ?
          </div>
        )}

        {loading && !stats ? (
          <div className="flex items-center justify-center py-32">
            <RefreshCw className="h-10 w-10 animate-spin text-muted-foreground/40" />
          </div>
        ) : stats ? (
          <div className="space-y-8">
            {/* KPI Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard icon={ShoppingBag} label="Commandes totales" value={String(stats.totalOrders)} />
              <StatCard
                icon={Banknote}
                label="Chiffre d'affaires"
                value={`${stats.totalRevenue.toFixed(2)} DT`}
                sub="commandes acceptées/expédiées/livrées"
              />
              <StatCard
                icon={CircleDollarSign}
                label="Gain net"
                value={`${(stats.totalProfit ?? 0).toFixed(2)} DT`}
                sub="vente − achat sur commandes complétées"
              />
              <StatCard icon={BarChart2} label="Livrées" value={String(stats.byStatus.delivered ?? 0)} />
            </div>

            {/* Gain note — si aucun prix d'achat n'est renseigné */}
            {(stats.totalProfit ?? 0) === 0 && stats.totalRevenue > 0 && (
              <div className="rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:border-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300">
                💡 Le gain net est 0 car aucun produit n'a encore de <strong>prix d'achat</strong> renseigné.
                Éditez vos produits dans l'administration pour calculer vos marges.
              </div>
            )}

            {/* Revenus + Gain par mois */}
            <Card>
              <CardHeader><CardTitle>Revenus &amp; Gain — 6 derniers mois</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={stats.revenueByMonth}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} unit=" DT" />
                    <Tooltip formatter={(v: number, name: string) => [`${v.toFixed(2)} DT`, name === "revenue" ? "Chiffre d'affaires" : "Gain net"]} />
                    <Legend formatter={(v) => v === "revenue" ? "Chiffre d'affaires" : "Gain net"} />
                    <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="profit" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} strokeDasharray="4 2" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Top produits — tableau avec marge */}
            {stats.topProducts.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Produits les plus vendus</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="pb-2 font-medium">Produit</th>
                          <th className="pb-2 font-medium text-right">Unités</th>
                          <th className="pb-2 font-medium text-right">Chiffre d'affaires</th>
                          <th className="pb-2 font-medium text-right">Gain net</th>
                          <th className="pb-2 font-medium text-right">Marge</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.topProducts.map((p) => {
                          const margin = p.revenue > 0 ? (p.profit / p.revenue) * 100 : null;
                          return (
                            <tr key={p.id} className="border-b last:border-0">
                              <td className="py-2 font-medium">{p.name}</td>
                              <td className="py-2 text-right">{p.quantitySold}</td>
                              <td className="py-2 text-right">{p.revenue.toFixed(2)} DT</td>
                              <td className={`py-2 text-right font-semibold ${p.profit > 0 ? "text-green-600" : p.profit < 0 ? "text-red-500" : "text-muted-foreground"}`}>
                                {p.profit !== 0 ? `${p.profit.toFixed(2)} DT` : "—"}
                              </td>
                              <td className="py-2 text-right">
                                {margin !== null ? (
                                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${margin >= 20 ? "bg-green-100 text-green-700" : margin >= 0 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-600"}`}>
                                    {margin.toFixed(1)}%
                                  </span>
                                ) : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Status breakdown */}
            <Card>
              <CardHeader><CardTitle>Répartition des commandes</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                  {[
                    { key: "pending", label: "En attente", color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
                    { key: "accepted", label: "Acceptées", color: "text-green-600 bg-green-50 border-green-200" },
                    { key: "rejected", label: "Refusées", color: "text-red-600 bg-red-50 border-red-200" },
                    { key: "shipped", label: "Expédiées", color: "text-blue-600 bg-blue-50 border-blue-200" },
                    { key: "delivered", label: "Livrées", color: "text-primary bg-primary/5 border-primary/20" },
                  ].map(({ key, label, color }) => (
                    <div key={key} className={`rounded-lg border p-3 text-center ${color}`}>
                      <p className="text-2xl font-bold">{stats.byStatus[key] ?? 0}</p>
                      <p className="text-xs">{label}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </main>
    </div>
  );
};

export default AdminStats;

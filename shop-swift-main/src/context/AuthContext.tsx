import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { User, Order } from "@/types";
import { toast } from "@/hooks/use-toast";
import { API_URL } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  orders: Order[];
  adminOrders: Order[];
  ordersLoading: boolean;
  login: (email: string, password: string) => Promise<User | null>;
  register: (name: string, email: string, password: string) => Promise<User | null>;
  logout: () => void;
  placeOrder: (order: Omit<Order, "id" | "date" | "status">) => Promise<void>;
  updateOrderStatus: (orderId: string, status: Order["status"]) => Promise<void>;
  refreshOrders: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_KEY = "shopswift_user";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Restaurer l'utilisateur depuis localStorage au démarrage
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem(USER_KEY);
      return stored ? (JSON.parse(stored) as User) : null;
    } catch {
      return null;
    }
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [adminOrders, setAdminOrders] = useState<Order[]>([]);
  // Démarrer en "chargement" si un user existe déjà en session (évite le flash "aucune commande")
  const [ordersLoading, setOrdersLoading] = useState<boolean>(() => {
    try { return !!localStorage.getItem(USER_KEY); } catch { return false; }
  });

  // ─── Connexion ────────────────────────────────────────────────────────────
  const login = async (email: string, password: string): Promise<User | null> => {
    try {
      const res = await fetch(`${API_URL}/api/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Email ou mot de passe incorrect");
      }
      const data: User = await res.json();
      setUser(data);
      localStorage.setItem(USER_KEY, JSON.stringify(data));
      toast({ title: "Connexion réussie", description: `Bienvenue, ${data.name} !` });
      return data;
    } catch (err: any) {
      toast({ title: "Erreur de connexion", description: err.message, variant: "destructive" });
      return null;
    }
  };

  // ─── Inscription ──────────────────────────────────────────────────────────
  const register = async (name: string, email: string, password: string): Promise<User | null> => {
    try {
      const res = await fetch(`${API_URL}/api/users/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Impossible de créer le compte");
      }
      const data: User = await res.json();
      setUser(data);
      localStorage.setItem(USER_KEY, JSON.stringify(data));
      toast({ title: "Inscription réussie", description: "Votre compte a été créé." });
      return data;
    } catch (err: any) {
      toast({ title: "Erreur d'inscription", description: err.message, variant: "destructive" });
      return null;
    }
  };

  // ─── Déconnexion ──────────────────────────────────────────────────────────
  const logout = () => {
    setUser(null);
    setOrders([]);
    setAdminOrders([]);
    localStorage.removeItem(USER_KEY);
    toast({ title: "Déconnexion", description: "À bientôt !" });
  };

  // ─── Passer une commande ──────────────────────────────────────────────────
  const placeOrder = async (orderData: Omit<Order, "id" | "date" | "status">) => {
    try {
      const res = await fetch(`${API_URL}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });
      if (!res.ok) throw new Error("Impossible de passer la commande");
      const newOrder: Order = await res.json();
      setOrders((prev) => [newOrder, ...prev]);
      toast({ title: "Commande envoyée 🚀", description: "L'administrateur a reçu votre commande." });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  };

  // ─── Mettre à jour le statut (admin) ─────────────────────────────────────
  const updateOrderStatus = async (orderId: string, status: Order["status"]) => {
    try {
      const res = await fetch(`${API_URL}/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Impossible de mettre à jour le statut");
      const updated: Order = await res.json();
      setAdminOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      toast({ title: "Statut mis à jour" });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  };

  // ─── Rafraîchir les commandes (appelable depuis n'importe quel composant) ─
  const refreshOrders = async (currentUser = user) => {
    if (!currentUser) return;
    setOrdersLoading(true);
    try {
      if (currentUser.role === "admin") {
        const res = await fetch(`${API_URL}/api/orders`);
        const data = await res.json();
        setAdminOrders(data);
      } else {
        const res = await fetch(`${API_URL}/api/orders/user/${currentUser.id}`);
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setOrdersLoading(false);
    }
  };

  // ─── Charger les commandes selon le rôle après connexion ─────────────────
  useEffect(() => {
    if (!user) return;
    refreshOrders(user);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        orders,
        adminOrders,
        ordersLoading,
        login,
        register,
        logout,
        placeOrder,
        updateOrderStatus,
        refreshOrders,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

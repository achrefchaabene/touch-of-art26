import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import type { Product } from "@/types";
import { toast } from "@/hooks/use-toast";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:9000";

interface ProductContextType {
  products: Product[];
  loading: boolean;
  addProduct: (product: Omit<Product, "id">, imageFile?: File | null) => Promise<void>;
  updateProduct: (id: string, product: Partial<Product>, imageFile?: File | null) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  refreshProducts: () => Promise<void>;
  categories: string[];
  addCategory: (name: string) => Promise<void>;
  updateCategory: (oldName: string, newName: string) => Promise<void>;
  deleteCategory: (name: string) => Promise<void>;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

const getErrorMessage = async (response: Response, fallback: string) => {
  const errorPayload = await response.json().catch(() => ({}));
  return errorPayload.message || fallback;
};

export const ProductProvider = ({ children }: { children: ReactNode }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>(["Tous"]);
  const [loading, setLoading] = useState(true);

  const refreshProducts = async () => {
    try {
      const res = await fetch(`${API_URL}/api/products`);
      const prods: Product[] = await res.json();
      setProducts(prods);
    } catch {
      // silence
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [prodRes, catRes] = await Promise.all([
          fetch(`${API_URL}/api/products`),
          fetch(`${API_URL}/api/categories`),
        ]);
        const prods: Product[] = await prodRes.json();
        const cats: string[] = await catRes.json();
        setProducts(prods);
        setCategories(["Tous", ...cats]);
      } catch {
        toast({
          title: "Erreur",
          description: "Impossible de charger les produits.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const addProduct = async (product: Omit<Product, "id">, imageFile?: File | null) => {
    try {
      const formData = new FormData();
      Object.entries(product).forEach(([key, value]) => formData.append(key, String(value)));
      if (imageFile) formData.append("image", imageFile);

      const res = await fetch(`${API_URL}/api/products`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(await getErrorMessage(res, "Impossible de creer le produit."));
      }

      const newProduct: Product = await res.json();
      setProducts((prev) => [newProduct, ...prev]);
      toast({ title: "Produit cree", description: `${product.name} a ete ajoute.` });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>, imageFile?: File | null) => {
    try {
      const formData = new FormData();
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });
      if (imageFile) formData.append("image", imageFile);

      const res = await fetch(`${API_URL}/api/products/${id}`, {
        method: "PUT",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(await getErrorMessage(res, "Impossible de modifier le produit."));
      }

      const updated: Product = await res.json();
      setProducts((prev) => prev.map((product) => (product.id === id ? updated : product)));
      toast({ title: "Produit modifie", description: "Les modifications ont ete enregistrees." });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/api/products/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Impossible de supprimer le produit.");
      setProducts((prev) => prev.filter((product) => product.id !== id));
      toast({ title: "Produit supprime", variant: "destructive" });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  };

  const addCategory = async (name: string) => {
    try {
      const res = await fetch(`${API_URL}/api/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        throw new Error(await getErrorMessage(res, "Impossible de creer la categorie."));
      }
      setCategories((prev) => [...prev, name]);
      toast({ title: "Categorie creee", description: `${name} a ete ajoutee.` });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  };

  const updateCategory = async (oldName: string, newName: string) => {
    if (oldName === "Tous") return;
    try {
      const res = await fetch(`${API_URL}/api/categories/${encodeURIComponent(oldName)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      if (!res.ok) {
        throw new Error(await getErrorMessage(res, "Impossible de renommer la categorie."));
      }
      setCategories((prev) => prev.map((category) => (category === oldName ? newName : category)));
      setProducts((prev) =>
        prev.map((product) => (product.category === oldName ? { ...product, category: newName } : product)),
      );
      toast({ title: "Categorie modifiee", description: `${oldName} -> ${newName}` });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  };

  const deleteCategory = async (name: string) => {
    if (name === "Tous") return;
    try {
      const res = await fetch(`${API_URL}/api/categories/${encodeURIComponent(name)}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error(await getErrorMessage(res, "Impossible de supprimer la categorie."));
      }
      setCategories((prev) => prev.filter((category) => category !== name));
      toast({ title: "Categorie supprimee", variant: "destructive" });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  };

  return (
    <ProductContext.Provider
      value={{
        products,
        loading,
        addProduct,
        updateProduct,
        deleteProduct,
        refreshProducts,
        categories,
        addCategory,
        updateCategory,
        deleteCategory,
      }}
    >
      {children}
    </ProductContext.Provider>
  );
};

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error("useProducts must be used within ProductProvider");
  }
  return context;
};

import React, { createContext, useContext, useReducer, ReactNode } from "react";
import { CartItem, Product } from "@/types";
import { toast } from "@/hooks/use-toast";

interface CartState {
  items: CartItem[];
}

type CartAction =
  | { type: "ADD_ITEM"; product: Product }
  | { type: "REMOVE_ITEM"; productId: string }
  | { type: "UPDATE_QUANTITY"; productId: string; quantity: number }
  | { type: "CLEAR_CART" };

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case "ADD_ITEM": {
      const existing = state.items.find((i) => i.product.id === action.product.id);
      if (existing) {
        // Ne pas dépasser le stock disponible
        if (existing.quantity >= action.product.stock) return state;
        return {
          items: state.items.map((i) =>
            i.product.id === action.product.id ? { ...i, quantity: i.quantity + 1 } : i
          ),
        };
      }
      if (action.product.stock <= 0) return state;
      return { items: [...state.items, { product: action.product, quantity: 1 }] };
    }
    case "REMOVE_ITEM":
      return { items: state.items.filter((i) => i.product.id !== action.productId) };
    case "UPDATE_QUANTITY":
      if (action.quantity <= 0) {
        return { items: state.items.filter((i) => i.product.id !== action.productId) };
      }
      return {
        items: state.items.map((i) => {
          if (i.product.id !== action.productId) return i;
          // Limiter au stock disponible
          const capped = Math.min(action.quantity, i.product.stock);
          return { ...i, quantity: capped };
        }),
      };
    case "CLEAR_CART":
      return { items: [] };
    default:
      return state;
  }
};

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });

  const addItem = (product: Product) => {
    if (product.stock <= 0) {
      toast({ title: "Rupture de stock", description: `${product.name} n'est plus disponible.`, variant: "destructive" });
      return;
    }
    const existing = state.items.find((i) => i.product.id === product.id);
    if (existing && existing.quantity >= product.stock) {
      toast({ title: "Stock maximum atteint", description: `Vous ne pouvez pas commander plus de ${product.stock} unité(s).`, variant: "destructive" });
      return;
    }
    dispatch({ type: "ADD_ITEM", product });
    toast({ title: "Ajouté au panier", description: `${product.name} a été ajouté.` });
  };

  const removeItem = (productId: string) => {
    dispatch({ type: "REMOVE_ITEM", productId });
    toast({ title: "Retiré du panier", variant: "destructive" });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    dispatch({ type: "UPDATE_QUANTITY", productId, quantity });
  };

  const clearCart = () => dispatch({ type: "CLEAR_CART" });

  const totalItems = state.items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = state.items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items: state.items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};

export interface Product {
  id: string;
  name: string;
  barcode?: string;
  description: string;
  price: number;
  salePrice?: number | null;
  purchasePrice?: number | null;
  image: string;
  category: string;
  stock: number;
  rating: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
}

export interface ShippingInfo {
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
}

export interface OrderHistoryEntry {
  status: string;
  date: string;
  time: string;
  note?: string;
}

export interface Order {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  shipping: ShippingInfo;
  items: { product: Product; quantity: number }[];
  total: number;
  status: "pending" | "accepted" | "rejected" | "processing" | "shipped" | "delivered";
  date: string;
  history?: OrderHistoryEntry[];
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

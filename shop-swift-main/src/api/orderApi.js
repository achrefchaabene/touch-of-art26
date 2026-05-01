import { API_URL } from "@/lib/api";

export const createOrder = async (orderData) => {
  const res = await fetch(`${API_URL}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(orderData),
  });

  return res.json();
};

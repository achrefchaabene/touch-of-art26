const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const createOrder = async (orderData) => {
  const res = await fetch(`${API_URL}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(orderData),
  });

  return res.json();
};

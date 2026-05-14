const API_URL = (import.meta.env.VITE_API_URL || "").trim().replace(/\/+$/, "");

const PLACEHOLDER_IMAGE = "/placeholder.svg";

export const getPlaceholderImage = () => PLACEHOLDER_IMAGE;

export const resolveProductImage = (image?: string | null) => {
  if (!image) return PLACEHOLDER_IMAGE;

  const normalized = image.trim();
  if (!normalized) return PLACEHOLDER_IMAGE;

  if (
    normalized.startsWith("http://") ||
    normalized.startsWith("https://") ||
    normalized.startsWith("data:")
  ) {
    return normalized;
  }

  if (normalized.startsWith("//")) {
    return `${window.location.protocol}${normalized}`;
  }

  if (normalized.startsWith("/uploads/")) {
    return API_URL ? `${API_URL}${normalized}` : normalized;
  }

  if (normalized.startsWith("uploads/")) {
    return API_URL ? `${API_URL}/${normalized}` : `/${normalized}`;
  }

  return normalized;
};

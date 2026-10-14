const API_URL = (import.meta.env.VITE_API_URL || "").trim().replace(/\/+$/, "");

const PLACEHOLDER_IMAGE = "/placeholder.svg";

export const getPlaceholderImage = () => PLACEHOLDER_IMAGE;

const encodeUrl = (value: string) => {
  try {
    return encodeURI(value);
  } catch {
    return value;
  }
};

const normalizeAbsoluteUrl = (value: string) => {
  try {
    const url = new URL(value);

    // Some mobile browsers/webviews block insecure image URLs on an HTTPS page.
    if (
      typeof window !== "undefined" &&
      window.location.protocol === "https:" &&
      url.protocol === "http:" &&
      url.hostname !== "localhost" &&
      url.hostname !== "127.0.0.1"
    ) {
      url.protocol = "https:";
    }

    return url.toString();
  } catch {
    return encodeUrl(value);
  }
};

export const resolveProductImage = (image?: string | null) => {
  if (!image) return PLACEHOLDER_IMAGE;

  const normalized = image.trim();
  if (!normalized) return PLACEHOLDER_IMAGE;

  if (
    normalized.startsWith("http://") ||
    normalized.startsWith("https://") ||
    normalized.startsWith("data:")
  ) {
    return normalizeAbsoluteUrl(normalized);
  }

  if (normalized.startsWith("//")) {
    return normalizeAbsoluteUrl(`${window.location.protocol}${normalized}`);
  }

  if (normalized.startsWith("/uploads/")) {
    return API_URL ? normalizeAbsoluteUrl(`${API_URL}${normalized}`) : encodeUrl(normalized);
  }

  if (normalized.startsWith("uploads/")) {
    return API_URL
      ? normalizeAbsoluteUrl(`${API_URL}/${normalized}`)
      : encodeUrl(`/${normalized}`);
  }

  return encodeUrl(normalized);
};

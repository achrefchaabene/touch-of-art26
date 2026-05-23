import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "../uploads");
const cloudinaryFolder = process.env.CLOUDINARY_FOLDER || "touch-of-art/products";

await fs.promises.mkdir(uploadsDir, { recursive: true });

const isCloudinaryConfigured = () =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET,
  );

const isLocalUploadPath = (imagePath) =>
  typeof imagePath === "string" && imagePath.startsWith("/uploads/");

const getLocalUploadPath = (imagePath) => {
  if (!isLocalUploadPath(imagePath)) return null;
  return path.join(uploadsDir, path.basename(imagePath));
};

const saveLocally = async (file) => {
  const extension = path.extname(file.originalname || "") || ".bin";
  const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
  const filePath = path.join(uploadsDir, uniqueName);

  await fs.promises.writeFile(filePath, file.buffer);
  return `/uploads/${uniqueName}`;
};

const deleteLocalImage = async (imagePath) => {
  const filePath = getLocalUploadPath(imagePath);
  if (!filePath) return;

  try {
    await fs.promises.unlink(filePath);
  } catch (err) {
    if (err?.code !== "ENOENT") {
      console.warn(`Impossible de supprimer l'image locale ${filePath}: ${err.message}`);
    }
  }
};

const uploadToCloudinary = async (file) => {
  const timestamp = Math.floor(Date.now() / 1000);
  const signaturePayload = `folder=${cloudinaryFolder}&timestamp=${timestamp}${process.env.CLOUDINARY_API_SECRET}`;
  const signature = crypto.createHash("sha1").update(signaturePayload).digest("hex");

  const formData = new FormData();
  formData.append("file", new Blob([file.buffer], { type: file.mimetype }), file.originalname || "image");
  formData.append("api_key", process.env.CLOUDINARY_API_KEY);
  formData.append("timestamp", String(timestamp));
  formData.append("folder", cloudinaryFolder);
  formData.append("signature", signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: formData,
    },
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.secure_url) {
    throw new Error(payload?.error?.message || "Upload Cloudinary impossible.");
  }

  return payload.secure_url;
};

const getCloudinaryPublicId = (imagePath) => {
  if (typeof imagePath !== "string" || !imagePath.includes("res.cloudinary.com")) {
    return null;
  }

  try {
    const url = new URL(imagePath);
    const marker = "/upload/";
    const uploadIndex = url.pathname.indexOf(marker);
    if (uploadIndex === -1) return null;

    let publicId = url.pathname.slice(uploadIndex + marker.length);
    publicId = publicId.replace(/^v\d+\//, "");
    publicId = publicId.replace(/\.[^/.]+$/, "");
    return publicId || null;
  } catch {
    return null;
  }
};

const deleteCloudinaryImage = async (imagePath) => {
  const publicId = getCloudinaryPublicId(imagePath);
  if (!publicId || !isCloudinaryConfigured()) return;

  const timestamp = Math.floor(Date.now() / 1000);
  const signaturePayload = `public_id=${publicId}&timestamp=${timestamp}${process.env.CLOUDINARY_API_SECRET}`;
  const signature = crypto.createHash("sha1").update(signaturePayload).digest("hex");

  const formData = new FormData();
  formData.append("public_id", publicId);
  formData.append("api_key", process.env.CLOUDINARY_API_KEY);
  formData.append("timestamp", String(timestamp));
  formData.append("signature", signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/destroy`,
    {
      method: "POST",
      body: formData,
    },
  );

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    console.warn(`Suppression Cloudinary ignoree: ${payload?.error?.message || response.statusText}`);
  }
};

export const storeUploadedImage = async (file) => {
  if (!file) return "";

  if (isCloudinaryConfigured()) {
    return uploadToCloudinary(file);
  }

  return saveLocally(file);
};

export const deleteStoredImage = async (imagePath) => {
  if (!imagePath) return;

  if (isLocalUploadPath(imagePath)) {
    await deleteLocalImage(imagePath);
    return;
  }

  await deleteCloudinaryImage(imagePath);
};

export const getUploadsDir = () => uploadsDir;

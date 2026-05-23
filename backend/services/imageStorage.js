import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "../uploads");
const cloudinaryFolder = process.env.CLOUDINARY_FOLDER || "touch-of-art/products";
const MAX_IMAGE_WIDTH = Number(process.env.PRODUCT_IMAGE_MAX_WIDTH || 1600);
const JPEG_QUALITY = Number(process.env.PRODUCT_IMAGE_JPEG_QUALITY || 82);
const WEBP_QUALITY = Number(process.env.PRODUCT_IMAGE_WEBP_QUALITY || 82);

await fs.promises.mkdir(uploadsDir, { recursive: true });

const isCloudinaryConfigured = () =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET,
  );

const optimizeImage = async (file) => {
  if (!file?.buffer) return file;

  try {
    const source = sharp(file.buffer, { failOn: "none", animated: true }).rotate();
    const metadata = await source.metadata();
    const format = (metadata.format || "").toLowerCase();

    // Keep vector and animated assets intact so we don't break them.
    if (format === "svg" || format === "gif") {
      return file;
    }

    const shouldResize = Boolean(metadata.width && metadata.width > MAX_IMAGE_WIDTH);

    let pipeline = source;
    if (shouldResize) {
      pipeline = pipeline.resize({
        width: MAX_IMAGE_WIDTH,
        withoutEnlargement: true,
      });
    }

    let buffer = file.buffer;
    let extension = path.extname(file.originalname || "") || ".jpg";
    let mimeType = file.mimetype || "image/jpeg";

    if (format === "png") {
      buffer = await pipeline.png({ compressionLevel: 9, palette: true }).toBuffer();
      extension = ".png";
      mimeType = "image/png";
    } else if (format === "webp") {
      buffer = await pipeline.webp({ quality: WEBP_QUALITY }).toBuffer();
      extension = ".webp";
      mimeType = "image/webp";
    } else if (format === "jpeg" || format === "jpg") {
      buffer = await pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toBuffer();
      extension = ".jpg";
      mimeType = "image/jpeg";
    } else if (format === "avif") {
      buffer = await pipeline.webp({ quality: WEBP_QUALITY }).toBuffer();
      extension = ".webp";
      mimeType = "image/webp";
    } else {
      // Unknown raster format: resize if needed, then normalize to JPEG for browser friendliness.
      buffer = await pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toBuffer();
      extension = ".jpg";
      mimeType = "image/jpeg";
    }

    return {
      ...file,
      buffer,
      size: buffer.length,
      mimetype: mimeType,
      originalname: `${path.parse(file.originalname || "image").name}${extension}`,
    };
  } catch (err) {
    console.warn(`Optimisation ignoree pour ${file.originalname || "image"}: ${err.message}`);
    return file;
  }
};

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

  const optimizedFile = await optimizeImage(file);

  if (isCloudinaryConfigured()) {
    return uploadToCloudinary(optimizedFile);
  }

  return saveLocally(optimizedFile);
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

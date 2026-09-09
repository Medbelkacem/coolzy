import { mkdir, writeFile, unlink } from "node:fs/promises";
import { join, basename } from "node:path";
import { randomBytes } from "node:crypto";
import sharp, { type Sharp } from "sharp";
import { encode } from "blurhash";
import { ActionError } from "./action";

export type StoredImage = { url: string; thumbUrl: string; blurhash: string; width: number; height: number };

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/heic", "image/heif"]);
const LOCAL_DIR = join(process.cwd(), "uploads");

/**
 * Product photos: validated, resized (1200 + 400 WebP), blurhashed, and stored
 * in Vercel Blob. Without a Blob token (local dev) they go to ./uploads and are
 * served by /api/uploads/[name]. Never the filesystem in production.
 */
export async function storeImage(file: File, prefix = "products"): Promise<StoredImage> {
  if (!ALLOWED.has(file.type)) throw new ActionError("photoInvalid", { photo: "photoInvalid" });
  if (file.size > MAX_BYTES) throw new ActionError("photoTooLarge", { photo: "photoTooLarge" });
  const input = Buffer.from(await file.arrayBuffer());
  let base: Sharp;
  try {
    base = sharp(input, { failOn: "error" }).rotate();
    await base.metadata();
  } catch {
    throw new ActionError("photoInvalid", { photo: "photoInvalid" });
  }
  const main = await sharp(input).rotate().resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
  const thumb = await sharp(input).rotate().resize({ width: 480, height: 480, fit: "cover" }).webp({ quality: 78 }).toBuffer();
  const tiny = await sharp(input).rotate().resize(32, 32, { fit: "cover" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const blurhash = encode(new Uint8ClampedArray(tiny.data), tiny.info.width, tiny.info.height, 4, 4);
  const id = randomBytes(10).toString("hex");
  const url = await putFile(`${prefix}/${id}.webp`, main.data);
  const thumbUrl = await putFile(`${prefix}/${id}-thumb.webp`, thumb);
  return { url, thumbUrl, blurhash, width: main.info.width, height: main.info.height };
}

async function putFile(name: string, data: Buffer): Promise<string> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const res = await put(name, data, { access: "public", contentType: "image/webp", addRandomSuffix: false, cacheControlMaxAge: 60 * 60 * 24 * 365 });
    return res.url;
  }
  await mkdir(LOCAL_DIR, { recursive: true });
  const local = basename(name);
  await writeFile(join(LOCAL_DIR, local), data);
  return `/api/uploads/${local}`;
}

export async function removeImage(url: string | null | undefined): Promise<void> {
  if (!url) return;
  try {
    if (url.startsWith("/api/uploads/")) {
      await unlink(join(LOCAL_DIR, basename(url)));
    } else if (process.env.BLOB_READ_WRITE_TOKEN) {
      const { del } = await import("@vercel/blob");
      await del(url);
    }
  } catch {
    /* best effort */
  }
}

export const LOCAL_UPLOAD_DIR = LOCAL_DIR;

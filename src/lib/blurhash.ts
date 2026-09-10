import { decode } from "blurhash";
import sharp from "sharp";

const cache = new Map<string, string>();

/** Blurhash → tiny PNG data URL for next/image `blurDataURL`. Server only, memoised. */
export async function blurhashToDataURL(hash: string | null | undefined): Promise<string | undefined> {
  if (!hash) return undefined;
  const hit = cache.get(hash);
  if (hit) return hit;
  try {
    const w = 8, h = 8; // tiny: it is scaled up and blurred by the browser anyway
    const pixels = decode(hash, w, h);
    const png = await sharp(Buffer.from(pixels), { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
    const url = `data:image/png;base64,${png.toString("base64")}`;
    cache.set(hash, url);
    return url;
  } catch {
    return undefined;
  }
}

"use client";
import { useCallback, useRef, useState, useTransition } from "react";
import Cropper, { type Area } from "react-easy-crop";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { removeProductPhoto, uploadProductPhoto } from "@/app/(staff)/admin/menu/actions";
import { ErrorText } from "@/components/ui/ErrorText";
import { IconImage, IconX } from "@/components/ui/Icons";
import type { ErrorKey } from "@/lib/action";

type Props = { productId: string; photoUrl: string | null; blurDataURL?: string; name: string };

async function cropToBlob(src: string, area: Area): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new window.Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = src;
  });
  const size = Math.min(1200, Math.round(area.width));
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, size, size);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("blob"))), "image/jpeg", 0.92));
}

/** Pick → crop square → upload. The server re-encodes, resizes and blurhashes. */
export function PhotoUploader({ productId, photoUrl, blurDataURL, name }: Props) {
  const t = useTranslations("adminMenu");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [error, setError] = useState<ErrorKey | null>(null);
  const [pending, start] = useTransition();

  const onFile = (f: File | undefined) => {
    if (!f) return;
    setError(null);
    const reader = new FileReader();
    reader.onload = () => setSrc(String(reader.result));
    reader.readAsDataURL(f);
  };
  const onCropComplete = useCallback((_: Area, px: Area) => setArea(px), []);

  const apply = () =>
    start(async () => {
      if (!src || !area) return;
      try {
        const blob = await cropToBlob(src, area);
        const fd = new FormData();
        fd.append("photo", new File([blob], "photo.jpg", { type: "image/jpeg" }));
        const r = await uploadProductPhoto(productId, fd);
        if (!r.ok) setError(r.fieldErrors?.photo ?? r.error);
        else {
          setSrc(null);
          router.refresh();
        }
      } catch {
        setError("photoInvalid");
      }
    });

  const remove = () =>
    start(async () => {
      const r = await removeProductPhoto(productId);
      if (!r.ok) setError(r.error);
      else router.refresh();
    });

  return (
    <div className="flex flex-col gap-3">
      <span className="label">{t("fields.photo")}</span>
      <div className="flex flex-wrap items-start gap-4">
        <div className="photo photo-preview grid place-items-center text-[var(--fg-muted)]">
          {photoUrl ? <Image src={photoUrl} alt={name} width={280} height={280} sizes="280px" placeholder={blurDataURL ? "blur" : "empty"} blurDataURL={blurDataURL} /> : <IconImage width={36} height={36} />}
        </div>
        <div className="flex flex-col gap-2">
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} aria-label={t("photo.choose")} />
          <button type="button" className="btn btn-quiet" onClick={() => inputRef.current?.click()} disabled={pending}>{photoUrl ? t("photo.change") : t("photo.choose")}</button>
          {photoUrl ? <button type="button" className="btn btn-danger" onClick={remove} disabled={pending}>{t("photo.remove")}</button> : null}
          <p className="max-w-[28ch] text-sm text-[var(--fg-muted)]">{photoUrl ? t("photo.help") : t("photo.none")}</p>
        </div>
      </div>
      <ErrorText error={error} />

      {src ? (
        <div role="dialog" aria-modal="true" aria-label={t("photo.cropTitle")} className="fixed inset-0 z-50 grid place-items-center bg-[rgba(14,12,11,.7)] p-4">
          <div className="surface flex w-full max-w-md flex-col gap-4 p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg">{t("photo.cropTitle")}</h2>
              <button type="button" className="btn btn-quiet btn-icon" aria-label={t("cancel")} onClick={() => setSrc(null)}><IconX /></button>
            </div>
            <div className="crop-area">
              <Cropper image={src} crop={crop} zoom={zoom} aspect={1} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete} />
            </div>
            <label className="flex items-center gap-3 text-sm">
              <span className="w-14">{t("photo.zoom")}</span>
              <input type="range" min={1} max={3} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-full" />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn btn-quiet" onClick={() => setSrc(null)} disabled={pending}>{t("cancel")}</button>
              <button type="button" className="btn btn-primary" onClick={apply} disabled={pending || !area}>{pending ? t("photo.uploading") : t("photo.apply")}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

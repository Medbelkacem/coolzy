"use client";
import { useTranslations } from "next-intl";
import type { ErrorKey } from "@/lib/action";

export function ErrorText({ error, className = "" }: { error: ErrorKey | string | null | undefined; className?: string }) {
  const t = useTranslations("errors");
  if (!error) return null;
  return <p role="alert" className={`field-error ${className}`}>{(t as unknown as (k: string) => string)(error)}</p>;
}

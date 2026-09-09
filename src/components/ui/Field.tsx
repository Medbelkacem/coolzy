"use client";
import { useId, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes, type ReactNode } from "react";
import { useTranslations } from "next-intl";

type Base = { label: string; name: string; help?: string; error?: string; errorNs?: string; className?: string };

function Msg({ help, error, errorNs, id }: { help?: string; error?: string; errorNs?: string; id: string }) {
  const tErr = useTranslations("errors");
  const tNs = useTranslations(errorNs as never);
  if (error) {
    const text = errorNs ? (tNs as unknown as (k: string) => string)(error) : (tErr as unknown as (k: string) => string)(error);
    return <p id={id} className="field-error" role="alert">{text}</p>;
  }
  return help ? <p id={id} className="mt-1 text-sm text-[var(--fg-muted)]">{help}</p> : null;
}

export function Field({ label, name, help, error, errorNs, className = "", ...rest }: Base & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="label">{label}{rest.required ? <span aria-hidden="true"> *</span> : null}</label>
      <input id={id} name={name} className="input" aria-invalid={error ? true : undefined} aria-describedby={`${id}-m`} {...rest} />
      <Msg id={`${id}-m`} help={help} error={error} errorNs={errorNs} />
    </div>
  );
}

export function TextareaField({ label, name, help, error, errorNs, className = "", ...rest }: Base & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="label">{label}{rest.required ? <span aria-hidden="true"> *</span> : null}</label>
      <textarea id={id} name={name} className="textarea" aria-invalid={error ? true : undefined} aria-describedby={`${id}-m`} {...rest} />
      <Msg id={`${id}-m`} help={help} error={error} errorNs={errorNs} />
    </div>
  );
}

export function SelectField({ label, name, help, error, errorNs, className = "", children, ...rest }: Base & SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="label">{label}{rest.required ? <span aria-hidden="true"> *</span> : null}</label>
      <select id={id} name={name} className="select" aria-invalid={error ? true : undefined} aria-describedby={`${id}-m`} {...rest}>{children}</select>
      <Msg id={`${id}-m`} help={help} error={error} errorNs={errorNs} />
    </div>
  );
}

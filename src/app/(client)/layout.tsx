import { PwaRegister } from "@/components/pwa/PwaRegister";

/** The dark room. Every client route renders inside the inverted world. */
export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-world="dark" className="min-h-dvh bg-[var(--bg)] text-[var(--fg)]">
      {children}
      <PwaRegister />
    </div>
  );
}

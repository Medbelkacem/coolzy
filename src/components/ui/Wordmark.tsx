export function Wordmark({ className = "", size = 22 }: { className?: string; size?: number }) {
  return (
    <span className={`wordmark font-display font-display-italic leading-none ${className}`} style={{ fontSize: size }} translate="no">
      Coolzy
    </span>
  );
}

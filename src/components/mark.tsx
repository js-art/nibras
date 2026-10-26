export function Mark({
  className = "h-8 w-8",
  tone = "ink",
  src,
  alt = "",
}: {
  className?: string;
  tone?: "ink" | "light";
  /** Custom logo URL; when set, replaces the default drop mark. */
  src?: string;
  alt?: string;
}) {
  if (src?.trim()) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- brand URLs are editor-supplied and may be remote or local
      <img
        src={src.trim()}
        alt={alt}
        className={`rounded-lg object-contain ${className}`}
      />
    );
  }

  const ground = tone === "light" ? "#e7f2ec" : "var(--palm-deep)";
  const drop = tone === "light" ? "var(--palm-deep)" : "#e7f2ec";
  const core = "#e4c27a";
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill={ground} />
      <path d="M16 6.5c-3.2 4.2-5 7.2-5 10.2a5 5 0 0 0 10 0c0-3-1.8-6-5-10.2Z" fill={drop} />
      <circle cx="16" cy="16.5" r="1.7" fill={core} />
    </svg>
  );
}

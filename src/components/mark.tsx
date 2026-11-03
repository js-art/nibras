export function Mark({
  className = "h-8 w-8",
  src,
  alt = "",
}: {
  className?: string;
  /** Accepted so existing call sites keep working. The mark reads on both light and dark. */
  tone?: "ink" | "light";
  /** Custom logo URL. An empty value uses the Savat1 mark. */
  src?: string;
  alt?: string;
}) {
  const logo = src?.trim() || "/brand/mark.png";
  return (
    // eslint-disable-next-line @next/next/no-img-element -- brand URLs are editor-supplied and may be remote or local
    <img src={logo} alt={alt} className={`object-contain ${className}`} />
  );
}

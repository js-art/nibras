const ribbons = {
  a: "M0 16C200 2 420 34 680 14C940 0 1160 32 1440 10L1440 38C1160 58 940 26 680 42C420 60 200 28 0 44Z",
  b: "M0 12C240 30 480 2 740 20C1000 38 1220 6 1440 16L1440 42C1220 62 1000 30 740 48C480 66 240 34 0 40Z",
} as const;

export function Seam({
  base,
  into,
  variant = "a",
}: {
  base: string;
  into: string;
  variant?: keyof typeof ribbons;
}) {
  return (
    <svg
      viewBox="0 0 1440 56"
      preserveAspectRatio="none"
      aria-hidden
      className="block h-12 w-full sm:h-14"
      style={{ background: `linear-gradient(${base} 0 50%, ${into} 50% 100%)` }}
    >
      <path fill="#e4c27a" d={ribbons[variant]} />
    </svg>
  );
}

import { avatarSrc, initials, initialsColor } from "@/lib/format";

/**
 * Circular avatar used across the app.
 * Renders the uploaded/remote image when available, otherwise branded initials.
 */
export function Avatar({
  name,
  srcKey,
  size = 40,
}: {
  name: string;
  srcKey?: string | null;
  size?: number;
}) {
  const src = avatarSrc(srcKey);
  const style = { width: size, height: size };

  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={name}
        style={style}
        className="rounded-full object-cover shrink-0 bg-[color:var(--line)]"
        loading="lazy"
      />
    );
  }

  return (
    <span
      style={{ ...style, fontSize: Math.round(size * 0.36) }}
      className={`rounded-full shrink-0 inline-flex items-center justify-center text-white font-bold ${initialsColor(name)}`}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

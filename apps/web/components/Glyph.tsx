import { N, rects } from "@termina/glyph";

/**
 * A glyph, rendered as real SVG elements.
 *
 * The original injected an SVG string; building elements instead means glyph
 * data can never become markup, which matters now that some of it arrives
 * from strangers.
 */
export function Glyph({
  pixels,
  size,
  title,
  className,
}: {
  pixels: string;
  size?: number;
  title?: string;
  className?: string;
}) {
  const runs = rects(pixels);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${N} ${N}`}
      {...(size ? { width: size, height: size } : {})}
      shapeRendering="crispEdges"
      fill="currentColor"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      {runs.map((r) => (
        <rect key={`${r.x}-${r.y}-${r.w}`} x={r.x} y={r.y} width={r.w} height={1} />
      ))}
    </svg>
  );
}

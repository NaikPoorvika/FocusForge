import type { SVGProps } from "react";

/**
 * Decorative botanical sprig — pure SVG, inherits color from `currentColor`.
 * Purely presentational; safe to place absolutely with opacity.
 */
export function LeafSprig({ className, ...rest }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...rest}
    >
      <path d="M100 190 C 100 140, 90 90, 60 40" />
      <path d="M92 160 C 60 155, 45 140, 40 118 C 65 118, 82 130, 92 160 Z" fill="currentColor" fillOpacity="0.28" />
      <path d="M100 140 C 130 133, 148 118, 152 96 C 128 96, 110 108, 100 140 Z" fill="currentColor" fillOpacity="0.28" />
      <path d="M88 108 C 60 102, 46 84, 46 62 C 68 66, 82 82, 88 108 Z" fill="currentColor" fillOpacity="0.22" />
      <path d="M92 80 C 118 74, 134 60, 136 40 C 116 42, 100 56, 92 80 Z" fill="currentColor" fillOpacity="0.22" />
      <path d="M78 56 C 60 48, 50 32, 52 14 C 70 20, 80 34, 78 56 Z" fill="currentColor" fillOpacity="0.16" />
    </svg>
  );
}

export function LeafCorner({ className, ...rest }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 240 240"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...rest}
    >
      <path d="M10 230 C 60 200, 110 160, 150 100 C 175 62, 200 30, 230 10" />
      <path d="M60 200 C 90 195, 115 180, 128 156 C 100 152, 78 168, 60 200 Z" fill="currentColor" fillOpacity="0.25" />
      <path d="M120 148 C 150 148, 172 134, 182 108 C 156 106, 132 120, 120 148 Z" fill="currentColor" fillOpacity="0.25" />
      <path d="M170 92 C 194 92, 212 78, 220 56 C 198 56, 178 68, 170 92 Z" fill="currentColor" fillOpacity="0.20" />
    </svg>
  );
}

import { FlatCompat } from "@eslint/eslintrc";

/* Next's shareable config is still eslintrc-shaped, so it is bridged into flat
   config rather than pinning ESLint back to 8. `next lint` is deprecated in
   Next 15 and removed in 16, so the lint script calls eslint directly. */
const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const config = [
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Glyph data is not an image; the SVG components are the point.
      "@next/next/no-img-element": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
];

export default config;

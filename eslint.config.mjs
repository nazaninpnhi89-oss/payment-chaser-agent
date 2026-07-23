import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import { defineConfig, globalIgnores } from "eslint/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = defineConfig([
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // Pure business-logic modules: no DB, no env, no request object, no Next runtime.
    files: [
      "lib/tier.ts",
      "lib/interest.ts",
      "lib/csv.ts",
      "lib/prompt.ts",
      "lib/money.ts",
      "lib/dates.ts",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@/lib/db*", "@/lib/db/**"], message: "Pure /lib modules must not touch the database." },
            { group: ["@/lib/env", "@/lib/env*"], message: "Pure /lib modules must not read environment variables." },
            { group: ["next", "next/*"], message: "Pure /lib modules must not import Next.js runtime." },
          ],
        },
      ],
    },
  },
  {
    // Only the repository layer may talk to the database directly.
    files: ["**/*.{ts,tsx}"],
    ignores: ["lib/repositories/**", "lib/db/**", "scripts/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@/lib/db*", "@/lib/db/**"], message: "Only lib/repositories/** may import lib/db directly." },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;

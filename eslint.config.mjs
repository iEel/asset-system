import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "output/**",
    "build/**",
    "coverage/**",
    ".worktrees/**",
    "next-env.d.ts",
    // The E2E suite's report and results (git-ignored): Playwright writes its trace viewer's bundled JS into them.
    "e2e-report/**",
    "e2e-results/**",
  ]),
]);

export default eslintConfig;

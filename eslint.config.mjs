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
    "build/**",
    "next-env.d.ts",
    // git worktree 사본 — 별도 프로젝트 복사본이라 린트 대상에서 제외.
    ".claude/**",
    // 일회용 운영 스크립트.
    "scripts/**",
  ]),
]);

export default eslintConfig;

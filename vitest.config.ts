import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// tsconfig 의 "@/*" → 프로젝트 루트 별칭을 vitest 에도 동일하게 매핑.
// (소스 파일들이 내부적으로 '@/lib/...' 를 import 하므로 테스트에서 이 해석이 필요.)
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
  },
});

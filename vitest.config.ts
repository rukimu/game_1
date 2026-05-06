import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Phase 4-a (Cycle 51): vitest 単体テスト基盤。
// - tsconfigPaths で @/* alias を解決
// - tests/ 直下の *.test.ts を pick up
// - Prisma を直接叩く統合テストは scripts/smoke_*.ts 側の責務、ここは
//   pure function のみを対象にする (DB セットアップ無しに高速で回す)
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    globals: false,
  },
});

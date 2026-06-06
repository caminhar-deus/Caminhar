// Ao alterar as exportações do barrel, atualize este snapshot com:
// npx jest tests/unit/components/Performance/index.test.js --updateSnapshot
import { describe, it, expect } from "@jest/globals";
import * as PerformanceComponents from "../../../../components/Performance/index.js";

describe("[Barrel] Performance Components Index", () => {
  it("deve exportar a estrutura esperada do barrel Performance", () => {
    expect(Object.keys(PerformanceComponents).sort()).toMatchSnapshot();
  });

  it("deve exportar o componente ImageOptimized como referência crítica", () => {
    expect(PerformanceComponents.ImageOptimized).toBeDefined();
  });
});
// Ao alterar as exportações do barrel, atualize este snapshot com:
// npx jest tests/unit/components/Layout/index.test.js --updateSnapshot
import { describe, it, expect } from "@jest/globals";
import * as LayoutComponents from "../../../../components/Layout/index.js";

describe("[Barrel] Layout Components Index", () => {
  it("deve exportar a estrutura esperada do barrel Layout", () => {
    expect(Object.keys(LayoutComponents).sort()).toMatchSnapshot();
  });

  it("deve exportar o componente Container como referência crítica", () => {
    expect(LayoutComponents.Container).toBeDefined();
  });
});
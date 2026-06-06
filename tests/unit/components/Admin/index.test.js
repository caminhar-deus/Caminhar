// Ao alterar as exportações do barrel, atualize este snapshot com:
// npx jest tests/unit/components/Admin/index.test.js --updateSnapshot
import { describe, it, expect } from "@jest/globals";
import * as AdminComponents from "../../../../components/Admin/index.js";

describe("[Barrel] Admin Components Index", () => {
  it("deve exportar a estrutura esperada do barrel Admin", () => {
    expect(Object.keys(AdminComponents).sort()).toMatchSnapshot();
  });

  it("deve exportar o componente AdminCrudBase como referência crítica", () => {
    expect(AdminComponents.AdminCrudBase).toBeDefined();
  });
});
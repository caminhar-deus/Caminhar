// Ao alterar as exportações do barrel, atualize este snapshot com:
// npx jest tests/unit/components/SEO/index.test.js --updateSnapshot
import { describe, it, expect } from "@jest/globals";
import DefaultExport, * as SEOComponents from "../../../../components/SEO/index.js";

describe("[Barrel] Componentes SEO - Index Exports", () => {
  it("deve exportar a estrutura esperada do barrel SEO", () => {
    expect(Object.keys(SEOComponents).sort()).toMatchSnapshot();
  });

  it("deve ter o default export igual ao SEOHead", () => {
    expect(DefaultExport).toBeDefined();
    expect(SEOComponents.SEOHead).toBeDefined();
    expect(DefaultExport).toBe(SEOComponents.SEOHead);
  });
});
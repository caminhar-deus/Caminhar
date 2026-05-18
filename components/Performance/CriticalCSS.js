/**
 * CriticalCSS - Componente para inline de CSS crítico
 * 
 * Props:
 * - css: String com CSS crítico (obrigatório)
 * - id: ID único para o style (opcional)
 * 
 * O CSS crítico está em './styles/criticalCSSRaw.js' como string JavaScript,
 * evitando conflitos com o Turbopack do Next.js que exige CSS global
 * apenas em pages/_app.js.
 */

import criticalStyles from './styles/criticalCSSRaw.js';

export default function CriticalCSS({ css, id = 'critical-css' }) {
  const stylesToUse = css || criticalStyles;
  if (!stylesToUse) return null;

  return (
    <style
      id={id}
      dangerouslySetInnerHTML={{ __html: stylesToUse }}
      // Critical CSS é render-blocking por design
    />
  );
}

/**
 * Helper para extrair CSS crítico das variáveis CSS
 * 
 * NOTA: O CSS foi movido para 'styles/criticalCSSRaw.js' em 18/05/2026.
 * Esta função é mantida para compatibilidade com chamadas existentes.
 * Use o import direto de './styles/criticalCSSRaw.js' para novos usos.
 */
export function extractCriticalCSS() {
  return criticalStyles;
}

/**
 * Remove CSS crítico após carregamento do CSS principal
 * (chamar em useEffect no _app.js)
 * 
 * Implementa fallback: se o CSS principal falhar ao carregar,
 * o CSS crítico NÃO é removido, garantindo que a página
 * mantenha ao menos os estilos essenciais visíveis.
 */
export function removeCriticalCSS(id = 'critical-css') {
  if (typeof document === 'undefined') return;

  const style = document.getElementById(id);
  if (!style) return;

  // Verifica se o CSS principal foi carregado com sucesso
  // Checa folhas de estilo <link> (excluindo inline styles e critical-css)
  const mainStylesheets = Array.from(document.styleSheets).filter(
    (sheet) =>
      sheet.href &&
      !sheet.href.includes(id) &&
      sheet.cssRules
  );

  if (mainStylesheets.length === 0) {
    // CSS principal ainda não carregou ou falhou ao carregar
    // Mantém o CSS crítico como fallback de emergência
    return;
  }

  // CSS principal carregou com sucesso, pode remover o crítico
  style.remove();
}
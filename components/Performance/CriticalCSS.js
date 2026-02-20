/**
 * CriticalCSS - Componente para inline de CSS crítico
 * 
 * Props:
 * - css: String com CSS crítico (obrigatório)
 * - id: ID único para o style (opcional)
 */

export default function CriticalCSS({ css, id = 'critical-css' }) {
  if (!css) return null;

  return (
    <style
      id={id}
      dangerouslySetInnerHTML={{ __html: css }}
      // Critical CSS é render-blocking por design
      // Remove após carregamento completo via JavaScript
    />
  );
}

/**
 * Helper para extrair CSS crítico das variáveis CSS
 */
export function extractCriticalCSS() {
  return `
    /* Critical CSS - Above the fold */
    
    /* Reset básico */
    *,*::before,*::after{box-sizing:border-box}
    html,body{margin:0;padding:0}
    
    /* Previne FOIT/FOUT */
    html{font-family:system-ui,-apple-system,sans-serif}
    
    /* Layout crítico */
    body{
      min-height:100vh;
      line-height:1.6;
      color:#333;
      background:#fff;
    }
    
    /* Container principal */
    .container{
      width:100%;
      max-width:1200px;
      margin:0 auto;
      padding:0 20px;
    }
    
    /* Previne CLS em imagens */
    img{
      max-width:100%;
      height:auto;
    }
    
    /* Skip link para acessibilidade */
    .skip-link{
      position:absolute;
      top:-40px;
      left:0;
      background:#000;
      color:#fff;
      padding:8px;
      text-decoration:none;
      z-index:100;
    }
    
    .skip-link:focus{
      top:0;
    }
    
    /* Loading states */
    .skeleton{
      background:linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%);
      background-size:200% 100%;
      animation:loading 1.5s infinite;
    }
    
    @keyframes loading{
      0%{background-position:200% 0}
      100%{background-position:-200% 0}
    }
    
    /* Reduz motion para acessibilidade */
    @media(prefers-reduced-motion:reduce){
      *,*::before,*::after{
        animation-duration:0.01ms!important;
        animation-iteration-count:1!important;
        transition-duration:0.01ms!important;
      }
    }
  `;
}

/**
 * Remove CSS crítico após carregamento do CSS principal
 * (chamar em useEffect no _app.js)
 */
export function removeCriticalCSS(id = 'critical-css') {
  if (typeof document === 'undefined') return;
  
  const style = document.getElementById(id);
  if (style) {
    style.remove();
  }
}

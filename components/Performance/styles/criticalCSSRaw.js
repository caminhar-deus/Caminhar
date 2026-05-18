/**
 * criticalCSSRaw - CSS crítico como string raw
 * 
 * Arquivo separado para facilitar manutenção do CSS sem precisar
 * editar o componente CriticalCSS.js diretamente.
 * 
 * NOTA: Usamos arquivo .js em vez de .css para evitar conflitos com
 * o Turbopack do Next.js, que exige que CSS global seja importado
 * apenas em pages/_app.js
 */
const criticalCSS = `
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
  color:var(--color-text-primary, #333);
  background:var(--color-bg-primary, #fff);
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
  color:var(--color-text-inverse, #fff);
  padding:8px;
  text-decoration:none;
  z-index:100;
}

.skip-link:focus{
  top:0;
}

/* Loading states */
.skeleton{
  background:linear-gradient(90deg,var(--color-bg-secondary, #f0f0f0) 25%,var(--color-bg-tertiary, #e0e0e0) 50%,var(--color-bg-secondary, #f0f0f0) 75%);
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

export default criticalCSS;
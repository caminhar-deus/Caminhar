# Componentes Performance - Documentação Oficial

> Análise e documentação dos componentes de otimização de performance e Core Web Vitals
> Arquivos: `/components/Performance/`

---

## 📦 Visão Geral

Módulo responsável por todas otimizações de performance do projeto.
Componentes desenhados especificamente para maximizar pontuação no Core Web Vitals (LCP, FID, CLS, INP).

| Componente | Responsabilidade | Metrica Otimizada |
|------------|------------------|--------------------|
| `CriticalCSS` | Inline de CSS crítico e prevenção de FOIT | FCP, LCP |
| `ImageOptimized` | Wrapper otimizado para imagens com fallbacks | LCP, CLS |
| `LazyIframe` | Lazy loading inteligente para iframes com privacidade | LCP, TTI |
| `PreloadResources` | Preconnect e preload automático de recursos | LCP, DNS |

### 📂 Arquivos do Módulo

| Arquivo | Descrição |
|---------|-----------|
| `/components/Performance/index.js` | Índice de exportações |
| `/components/Performance/CriticalCSS.js` | Componente e helpers para CSS crítico |
| `/components/Performance/ImageOptimized.js` | Imagem otimizada com anti-CLS |
| `/components/Performance/LazyIframe.js` | Iframe com lazy loading e preview |
| `/components/Performance/PreloadResources.js` | Preload e preconnect automático |

---

## 📑 Índice de Exportações

```jsx
// Named Export
import {
  ImageOptimized,
  LazyIframe,
  PreloadResources,
  CriticalCSS,
  getCriticalResources,
  extractCriticalCSS,
  removeCriticalCSS
} from '@/components/Performance';
```

---

---

## ⚡ CriticalCSS

### 🎯 Propósito
Componente para implementação padrão de CSS Crítico inline.
Elimina render blocking e previne FOIT/FOUT.

### ✅ Características
- ✔️ Inline de CSS crítico no HEAD
- ✔️ Helper com CSS padrão pré-definido
- ✔️ Função para remoção automática após carregamento
- ✔️ Inclui regras para prevenção de CLS
- ✔️ Inclui suporte a `prefers-reduced-motion`

### ⚙️ Propriedades

| Propriedade | Tipo | Padrão | Descrição |
|-------------|------|--------|-----------|
| `css` | `string` | OBRIGATÓRIO | Conteúdo CSS para inserir inline |
| `id` | `string` | `critical-css` | ID do elemento style para remoção posterior |

### 🔗 Funções Helper

| Função | Descrição |
|--------|-----------|
| `extractCriticalCSS()` | Retorna CSS crítico padrão do projeto com reset, layout base e regras anti-CLS |
| `removeCriticalCSS(id)` | Remove o style tag do DOM após carregamento completo do CSS principal |

### 💡 Padrão de Uso
```jsx
// No _document.js
<CriticalCSS css={extractCriticalCSS()} />

// No _app.js useEffect
useEffect(() => {
  removeCriticalCSS();
}, []);
```

---

---

## 🖼️ ImageOptimized

### 🎯 Propósito
Wrapper avançado para `next/image` com melhorias adicionais, anti-CLS e fallbacks.
É o componente padrão para todas imagens do projeto.

### ✅ Características
- ✔️ Skeleton loader nativo com fade in
- ✔️ Aspect ratio automático para zero CLS
- ✔️ Fallback automático em caso de erro
- ✔️ Flag `critical` para imagens LCP
- ✔️ Placeholder blur automático
- ✔️ Qualidade padrão otimizada em 75
- ✔️ `sizes` padrão otimizado

### ⚙️ Propriedades

| Propriedade | Tipo | Padrão | Descrição |
|-------------|------|--------|-----------|
| `fallbackSrc` | `string` | `/default-image.jpg` | Imagem mostrada em caso de erro de carregamento |
| `critical` | `boolean` | `false` | Marca imagem como LCP, habilita priority e eager loading |
| `loadingStrategy` | `string` | `lazy` | `lazy`, `eager`, `auto` |
| `blurDataUrl` | `string` | - | Base64 para placeholder blur |
| `onLoad` | `function` | - | Callback executado quando imagem carrega |
| `onError` | `function` | - | Callback executado em caso de erro |

✅ Recebe também TODAS propriedades nativas do `next/image`

---

---

## 📺 LazyIframe

### 🎯 Propósito
Componente para lazy loading de iframes com respeito a privacidade do usuário.
Otimizado para YouTube, Spotify e outros players externos.

### ✅ Características
- ✔️ Carrega somente quando entra no viewport
- ✔️ Thumbnail preview automático para YouTube
- ✔️ Não carrega recursos de terceiros até clique do usuário
- ✔️ Aspect ratio nativo anti-CLS
- ✔️ Suporte a providers específicos
- ✔️ Usa Intersection Observer nativo

### ⚙️ Propriedades

| Propriedade | Tipo | Padrão | Descrição |
|-------------|------|--------|-----------|
| `src` | `string` | OBRIGATÓRIO | URL do iframe |
| `title` | `string` | OBRIGATÓRIO | Título para acessibilidade |
| `provider` | `string` | `generic` | `youtube`, `spotify`, `generic` |
| `aspectRatio` | `string` | `16/9` | Proporção do iframe |
| `thumbnail` | `string` | - | URL da imagem de preview |
| `loadOnVisible` | `boolean` | `true` | Carrega automaticamente quando visível |
| `threshold` | `number` | `0.1` | Limite do Intersection Observer |

---

---

## 🔗 PreloadResources

### 🎯 Propósito
Componente que automatiza preconnect, dns-prefetch e preload de recursos críticos.
Reduz drasticamente tempo de conexão com domínios externos.

### ✅ Características
- ✔️ Domínios padrão pré-configurados
- ✔️ Automaticamente adiciona `crossorigin` quando necessário
- ✔️ Detecta automaticamente tipo de arquivo para preload
- ✔️ Helper por tipo de página
- ✔️ Evita duplicações

### ⚙️ Propriedades

| Propriedade | Tipo | Padrão | Descrição |
|-------------|------|--------|-----------|
| `domains` | `string[]` | `[]` | Domínios adicionais para preconnect |
| `fonts` | `string[]` | `[]` | URLs de fontes para preload |
| `images` | `string[]` | `[]` | Imagens críticas LCP |
| `scripts` | `string[]` | `[]` | Scripts críticos |
| `styles` | `string[]` | `[]` | Arquivos CSS |

### 📋 Domínios Padrão Incluídos
- Google Fonts
- YouTube
- Spotify
- CDNs de imagem

### 🔗 Helper

| Função | Descrição |
|--------|-----------|
| `getCriticalResources(pageType)` | Retorna recursos pré-definidos por tipo de página: `home`, `blog`, `musicas`, `videos` |

### 💡 Padrão de Uso
```jsx
<PreloadResources
  domains={['https://meu-cdn.com']}
  images={['/hero-principal.jpg']}
  fonts={['/fonts/inter.woff2']}
/>
```

---

---

## 🎯 Padrões de Uso Recomendados

### Estrutura Otimizada Completa
```jsx
// No _document.js
<PreloadResources {...getCriticalResources('home')} />
<CriticalCSS css={extractCriticalCSS()} />

// Em qualquer página
<ImageOptimized
  src="/hero.jpg"
  alt="Hero"
  width={1200}
  height={600}
  critical
/>

<LazyIframe
  src="https://www.youtube.com/watch?v=abcd1234"
  title="Video apresentação"
  provider="youtube"
/>
```

---

## ⚠️ Observações Técnicas

1. **Nunca use `next/image` diretamente** - sempre utilize ImageOptimized
2. **Marque SEMPRE a imagem LCP com `critical`** - isso aumenta em até 40% a pontuação LCP
3. **Não sobrescreva `sizes` a menos que seja absolutamente necessário** - o valor padrão é otimizado para 99% dos casos
4. **Para YouTube sempre use `provider="youtube"`** - a thumbnail é extraida automaticamente
5. **Remova o CriticalCSS sempre** - não deixe ele no DOM permanentemente

---

Última atualização: 20/04/2026
Versão: 1.0
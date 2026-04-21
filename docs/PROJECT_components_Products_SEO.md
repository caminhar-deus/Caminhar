# Documentação Componentes Products e SEO

Documentação oficial dos componentes `/components/Products/*` e `/components/SEO/*` do projeto Caminhar.

---

## 📚 Índice

1. [Componentes Products](#componentes-products)
   - [ProductCard.js](#productcardjs)
   - [ProductList.js](#productlistjs)
2. [Componentes SEO](#componentes-seo)
   - [Head.js](#headjs)
   - [index.js](#indexjs)

---

## 📦 Componentes Products

Módulo responsável pela exibição e listagem de produtos no sistema.

---

### ✅ ProductCard.js
**Arquivo**: `/components/Products/ProductCard.js`

| Característica | Valor |
|---|---|
| **Tipo** | Componente de apresentação |
| **Dependências** | React |
| **Estado interno** | 3 estados locais |
| **Linhas** | 176 |
| **Autocontido** | ✅ (possui estilos próprios internos) |

#### Propósito
Componente para exibição individual de cada produto, com carrossel de imagens, lightbox e links de compra para múltiplas plataformas.

#### Funcionalidades Principais:
- ✅ Carrossel de imagens com navegação manual
- ✅ Loading state para imagens com transição suave
- ✅ Lightbox / Tela Cheia para visualização ampliada
- ✅ Tratamento para múltiplas imagens e imagem única
- ✅ Integração nativa com Mercado Livre, Shopee e Amazon
- ✅ Descrição com truncamento inteligente (3 linhas)
- ✅ Tratamento para quando não existem imagens
- ✅ Estados completamente gerenciados internamente

#### Props Recebidas:
| Prop | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `product` | Object | ✅ | Objeto completo do produto |

#### Estrutura do Objeto Produto Esperado:
```javascript
{
  id: number,
  title: string,
  description: string,
  price: string,
  images: string, // URLs separadas por quebra de linha
  link_ml: string,
  link_shopee: string,
  link_amazon: string,
  position: number
}
```

#### Observações Técnicas:
- O componente não utiliza arquivos CSS externos, todos estilos estão inline e centralizados
- Navegação circular no carrossel (última imagem → primeira e vice-versa)
- Lightbox com backdrop blur e z-index alto (9999)
- Todos links externos possuem `rel="noreferrer"` e abrem em nova aba
- Imagens possuem `object-fit: contain` para preservar proporção original

---

### ✅ ProductList.js
**Arquivo**: `/components/Products/ProductList.js`

| Característica | Valor |
|---|---|
| **Tipo** | Componente container / smart component |
| **Dependências** | React, ProductCard |
| **Estado interno** | 10 estados locais |
| **Linhas** | 186 |
| **Gerenciamento de dados** | ✅ Fetch próprio da API |

#### Propósito
Componente principal da página de produtos, responsável por listagem completa, filtros, busca e paginação.

#### Funcionalidades Principais:
- ✅ Busca por texto com debounce (500ms)
- ✅ Filtro por faixa de preço (mínimo e máximo)
- ✅ Paginação com 12 itens por página
- ✅ Tratamento completo de estados: Loading, Erro, Vazio
- ✅ Ordenação customizada por `position` e `id`
- ✅ Layout responsivo em grid
- ✅ Prevenção de Layout Shift com altura mínima fixa
- ✅ Reset automático para página 1 ao alterar filtros

#### Fluxo de Dados:
1. Usuário interage com filtros
2. Debounce aguarda 500ms sem interação
3. Estado debounced é atualizado
4. Effect dispara requisição para `/api/products`
5. Resultado é ordenado no frontend
6. Produtos são renderizados com `ProductCard`

#### Observações Técnicas:
- API é chamada automaticamente ao alterar página ou filtros
- Ordenação é feita no frontend pois prioriza posição customizada
- Container com `min-height: 600px` evita pulo da interface
- Todos campos de busca são controlados
- Paginação desativa botões quando nos limites (primeira / última página)

---

## 🔍 Componentes SEO

Módulo de otimização para motores de busca e meta tags.

---

### ✅ Head.js
**Arquivo**: `/components/SEO/Head.js`

| Característica | Valor |
|---|---|
| **Tipo** | Componente wrapper |
| **Dependências** | Next/Head, Next Router, siteConfig |
| **Props** | 23 propriedades configuráveis |
| **Linhas** | 182 |
| **Padrões do projeto** | ✅ Configurações globais padrão |

#### Propósito
Componente centralizado para gerenciamento completo de todas meta tags SEO, Open Graph, Twitter Cards e configurações globais do cabeçalho.

#### Funcionalidades Principais:
- ✅ Meta tags básicas (title, description, keywords)
- ✅ Canonical URL automático com base na rota atual
- ✅ Open Graph completo para compartilhamento social
- ✅ Twitter Cards com `summary_large_image`
- ✅ Meta tags específicas para artigos
- ✅ Configuração de Robots (index/noindex)
- ✅ Favicons, PWA e meta tags Apple
- ✅ Preconnect e DNS Prefetch para domínios externos
- ✅ Geo tags, Theme Color e Viewport
- ✅ Suporte a meta tags customizadas via children

#### Props Principais:
| Prop | Tipo | Padrão | Obrigatório |
|---|---|---|---|
| `title` | String | - | ✅ |
| `description` | String | - | ✅ |
| `image` | String | `defaultImage` | ➖ |
| `type` | String | `website` | ➖ |
| `noindex` | Boolean | `false` | ➖ |
| `canonical` | String | URL atual | ➖ |
| `publishedAt` | String (ISO) | - | ➖ |
| `author` | String | - | ➖ |
| `tags` | Array | `[]` | ➖ |

#### Observações Técnicas:
- Título é automaticamente adicionado o sufixo `| Nome do Site`
- Imagens relativas são convertidas para URL absoluta automaticamente
- Keywords são deduplicadas automaticamente
- Query params são removidas da URL para Open Graph
- Para tipo `article` meta tags adicionais são injetadas automaticamente
- Lista de domínios pré-conectados é gerenciada centralmente

---

### ✅ index.js
**Arquivo**: `/components/SEO/index.js`

| Característica | Valor |
|---|---|
| **Tipo** | Arquivo de exportação / Barrel File |
| **Função** | Ponto de entrada público do módulo SEO |
| **Exports** | Componente + Schemas + Utilitários |

#### Propósito
Arquivo central para exportações públicas do módulo SEO, padronizando importações no restante do projeto.

#### Exports Disponíveis:
```javascript
// Principal
export { default as SEOHead } from './Head';
export { default } from './Head';

// Schemas de Dados Estruturados
export { 
  OrganizationSchema, 
  WebsiteSchema, 
  ArticleSchema, 
  BreadcrumbSchema, 
  MusicSchema, 
  VideoSchema 
} from './StructuredData';

// Utilitários e Configuração
export { siteConfig, getCanonicalUrl, getImageUrl } from '../../lib/seo/config';
```

#### Padrão de Uso:
```javascript
// Importação correta (sem necessidade de apontar para Head.js)
import SEOHead from '@/components/SEO';
```

---

## 📊 Dados Estruturados (Schema.org)

Submódulo dentro de `/components/SEO/StructuredData/` responsável pela implementação dos schemas do Schema.org para dados estruturados.

---

### ✅ ArticleSchema.js
**Arquivo**: `/components/SEO/StructuredData/ArticleSchema.js`

| Característica | Valor |
|---|---|
| **Tipo** | Schema Component |
| **Schema Type** | `Article` + `BlogPosting` |
| **Props** | 13 propriedades |
| **Linhas** | 84 |

#### Propósito
Schema.org completo para artigos e posts do blog, seguindo as melhores práticas do Google Search.

#### Funcionalidades Principais:
- ✅ Implementa `BlogPosting` que é um subtipo específico de Article
- ✅ Inclui automaticamente dados da organização e autor padrão
- ✅ Formatação automática de datas para padrão ISO
- ✅ Conversão automática de imagens relativas para URL absoluta
- ✅ Suporte completo a todas propriedades recomendadas pelo Google
- ✅ Propriedades opcionais são injetadas condicionalmente

#### Props Principais:
| Prop | Tipo | Obrigatório |
|---|---|---|
| `title` | String | ✅ |
| `description` | String | ✅ |
| `publishedAt` | String (ISO) | ✅ |
| `url` | String | ✅ |
| `image` | String | ➖ |
| `author` | String | ➖ |
| `tags` | Array | ➖ |
| `wordCount` | Number | ➖ |

---

### ✅ BreadcrumbSchema.js
**Arquivo**: `/components/SEO/StructuredData/BreadcrumbSchema.js`

| Característica | Valor |
|---|---|
| **Tipo** | Schema Component |
| **Schema Type** | `BreadcrumbList` |
| **Props** | 1 propriedade |
| **Linhas** | 52 |

#### Propósito
Schema para navegação estruturada (breadcrumbs), utilizado pelo Google para exibir caminhos nos resultados de busca.

#### Funcionalidades Principais:
- ✅ Adiciona automaticamente o item "Início" se não for informado
- ✅ Converte URLs relativas para absolutas automaticamente
- ✅ Gera posição numérica automaticamente para cada item
- ✅ Valida e normaliza as URLs recebidas

#### Exemplo de Uso:
```javascript
<BreadcrumbSchema
  items={[
    { name: 'Blog', url: '/blog' },
    { name: 'Título do Post', url: '/blog/slug-do-post' },
  ]}
/>
```

---

### ✅ MusicSchema.js
**Arquivo**: `/components/SEO/StructuredData/MusicSchema.js`

| Característica | Valor |
|---|---|
| **Tipo** | Schema Component |
| **Schema Type** | `MusicRecording` + `AudioObject` |
| **Props** | 15 propriedades |
| **Linhas** | 97 |

#### Propósito
Schema especializado para músicas e gravações de áudio, com suporte a integração com Spotify e Youtube.

#### Funcionalidades Principais:
- ✅ Implementa tipo `MusicRecording` padrão Schema.org
- ✅ Suporte a objeto `AudioObject` para arquivos de áudio
- ✅ Integração com links do Spotify e Youtube via propriedade `sameAs`
- ✅ Suporte a letra da música, álbum, gênero, duração e data de lançamento
- ✅ Fallback automático para descrição padrão

---

### ✅ OrganizationSchema.js
**Arquivo**: `/components/SEO/StructuredData/OrganizationSchema.js`

| Característica | Valor |
|---|---|
| **Tipo** | Schema Component |
| **Schema Type** | `Organization` |
| **Props** | 5 propriedades |
| **Linhas** | 55 |

#### Propósito
Schema da organização/empresa, utilizado globalmente para identificar o projeto nos motores de busca.

#### Funcionalidades Principais:
- ✅ Implementa tipo `Organization` com extensão para `NGO`
- ✅ Valores padrão carregados automaticamente do siteConfig
- ✅ Inclui informações de contato, redes sociais e logo
- ✅ Lista de áreas de conhecimento do projeto
- ✅ Normaliza automaticamente o logo para formato ImageObject

---

### ✅ WebsiteSchema.js
**Arquivo**: `/components/SEO/StructuredData/WebsiteSchema.js`

| Característica | Valor |
|---|---|
| **Tipo** | Schema Component |
| **Schema Type** | `WebSite` |
| **Props** | 3 propriedades |
| **Linhas** | 47 |

#### Propósito
Schema do site principal, implementa funcionalidade de busca direta nos resultados do Google.

#### Funcionalidades Principais:
- ✅ Implementa tipo `WebSite` padrão Schema.org
- ✅ Configura `SearchAction` para busca diretamente nos resultados do Google
- ✅ Todas propriedades possuem valores padrão do projeto
- ✅ Inclui categoria principal do conteúdo

---

### ✅ VideoSchema.js
**Arquivo**: `/components/SEO/StructuredData/VideoSchema.js`

| Característica | Valor |
|---|---|
| **Tipo** | Schema Component |
| **Schema Type** | `VideoObject` |
| **Props** | 14 propriedades |
| **Linhas** | 97 |

#### Propósito
Schema especializado para vídeos, com suporte completo a integração Youtube e propriedades recomendadas pelo Google.

#### Funcionalidades Principais:
- ✅ Implementa tipo `VideoObject` completo
- ✅ Suporte a dados do Youtube (ID, embed, url)
- ✅ Contador de visualizações utilizando `InteractionCounter`
- ✅ Suporte a transcrição do vídeo
- ✅ Formatação automática de datas
- ✅ Dados de qualidade e categoria do conteúdo

---

### ✅ StructuredData / index.js
**Arquivo**: `/components/SEO/StructuredData/index.js`

| Característica | Valor |
|---|---|
| **Tipo** | Arquivo de exportação |
| **Função** | Ponto de entrada dos Schemas |
| **Exports** | 6 Schemas diferentes |

#### Exports Disponíveis:
```javascript
export { default as OrganizationSchema } from './OrganizationSchema';
export { default as WebsiteSchema } from './WebsiteSchema';
export { default as ArticleSchema } from './ArticleSchema';
export { default as BreadcrumbSchema } from './BreadcrumbSchema';
export { default as MusicSchema } from './MusicSchema';
export { default as VideoSchema } from './VideoSchema';
```

---

## 📋 Resumo Geral

| Módulo | Complexidade | Manutenibilidade | Dependências Externas |
|---|---|---|---|
| ProductCard | Baixa | Alta | 0 |
| ProductList | Média | Alta | 1 |
| SEO Head | Média | Alta | 3 |
| SEO Index | Muito Baixa | Alta | 0 |

✅ Todos componentes são autocontidos
✅ Seguem padrões do projeto
✅ Possuem tratamento de erros e estados borda
✅ Documentados internamente
✅ Sem código morto ou funcionalidades obsoletas

---

*Última atualização: 20/04/2026*
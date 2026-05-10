# Relatório de Correções e Melhorias — Pasta `/examples`

## 1. Código Morto / Comentado — `blog-post-seo-example.js`

**Localização:** `/examples/blog-post-seo-example.js` (linhas 219-241)

**Problema:** As funções `getStaticProps` e `getStaticPaths` estão completamente comentadas. Contêm apenas código placeholder que nunca será executado. Isso gera ruído visual e falsa impressão de funcionalidade.

**Impacto:** Engana desenvolvedores que podem copiar o exemplo como referência e levar código inútil para produção.

**Sugestão:** Remover as funções `getStaticProps` e `getStaticPaths` por completo, ou substituí-las por um comentário explicativo sobre como implementá-las.

---

## 2. Duplicidade de Dados — `blog-post-seo-example.js`

**Localização:** `/examples/blog-post-seo-example.js` (linhas 106-125 e linhas 62-65)

**Problema:** O breadcrumb é renderizado de duas formas diferentes:
1. Via componente `<BreadcrumbSchema items={breadcrumbItems} />` (linha 101) — Structured Data JSON-LD
2. Via HTML manual com microdados Schema.org (linhas 106-125) — Marcação inline

**Impacto:** Redundância e duplicidade de markup. A forma JSON-LD (componente) já é suficiente e recomendada pelo Google. A versão HTML inline aumenta o payload desnecessariamente.

**Sugestão:** Remover o breadcrumb HTML manual (linhas 106-125) e manter apenas o componente `<BreadcrumbSchema>`.

---

## 3. Hardcoded de Dados — `blog-post-seo-example.js`

**Localização:** `/examples/blog-post-seo-example.js` (linhas 42-55)

**Problema:** Os dados do post são definidos como estado local (`useState`) com valores fixos (hardcoded). Isso pode dar a impressão incorreta de que os dados devem ser gerenciados via estado React, quando na verdade viriam de uma API ou banco.

**Impacto:** Pode induzir desenvolvedores a usar `useState` para dados estáticos ou de servidor, em vez de props do Next.js ou SSR/SSG.

**Sugestão:** Trocar para props recebidas via `getStaticProps`, como indicado no final do arquivo, ou adicionar um comentário explicativo sobre a abordagem correta.

---

## 4. Imagem com Blur Data URL Inválida — `blog-post-seo-example.js`

**Localização:** `/examples/blog-post-seo-example.js` (linha 154)

**Problema:** O `blurDataUrl` contém um valor placeholder genérico (`data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...`) que não representa uma imagem real. Um desenvolvedor pode copiar esse código e esquecer de gerar o blur correto.

**Impacto:** Quebra visual do placeholder blur (imagem corrompida) se usado sem gerar o base64 real da imagem.

**Sugestão:** Substituir por um comentário indicando como gerar o `blurDataUrl` (ex.: via `plaiceholder` ou `next/blur`), ou usar um placeholder inline mínimo válido.

---

## 5. Acessibilidade: Links de Compartilhamento sem Texto Descritivo — `blog-post-seo-example.js`

**Localização:** `/examples/blog-post-seo-example.js` (linhas 188-211)

**Problema:** Os botões de compartilhamento usam `aria-label` (bom), mas o texto visível é apenas o nome da rede social (ex.: "Facebook", "Twitter"). Não há indicação visual clara do que será compartilhado.

**Impacto:** Usuários de leitores de tela ouvem "Compartilhar no Facebook", mas usuários visuais veem apenas "Facebook", que é vago.

**Sugestão:** Usar texto visível mais descritivo, como "Compartilhar no Facebook" em vez de apenas "Facebook".

---

## 6. Tag `<meta>` com itemProp fora de contexto — `blog-post-seo-example.js`

**Localização:** `/examples/blog-post-seo-example.js` (linha 112)

**Problema:** `<meta itemProp="position" content="1" />` está dentro de um elemento `<li>` sem um itemScope Schema.org no próprio elemento de breadcrumb. Isso pode não ser interpretado corretamente por bots.

**Impacto:** Structured Data de breadcrumb pode não ser reconhecida se a implementação não seguir o padrão exato esperado pelos parsers.

**Sugestão:** Já que o breadcrumb JSON-LD (via componente) já cobre essa necessidade, remover o HTML manual resolve este problema.

---

## 7. Prop `blurDataUrl` sem o `placeholder` Explícito — `blog-post-seo-example.js`

**Localização:** `/examples/blog-post-seo-example.js` (linhas 146-155)

**Problema:** O `ImageOptimized` recebe `placeholder="blur"` e `blurDataUrl`, mas o componente `ImageOptimized` do Next.js `Image` pode não ser compatível com `blurDataUrl` a menos que `placeholder` também seja configurado corretamente. O exemplo está correto, porém os valores mockados podem quebrar.

**Impacto:** Médio — documentação pode ser copiada incorretamente.

**Sugestão:** Incluir comentário de alerta para gerar blurDataUrl válido em produção.

---

## 8. Import Não Utilizado — `homepage-seo-example.js`

**Localização:** `/examples/homepage-seo-example.js` (linha 8)

**Problema:** `getCriticalResources` é importado na linha 7 e usado na linha 18, mas as funções `PreloadResources` e `ImageOptimized` são os únicos componentes efetivamente consumidos. O `criticalResources` é obtido mas pode ser subutilizado.

**Impacto:** Baixo, mas quebra o princípio de importações mínimas necessárias.

**Sugestão:** Verificar se `getCriticalResources` retorna o formato esperado por `PreloadResources` e documentar essa interface.

---

## 9. Ausência de Tratamento de Erro — Todos os exemplos

**Localização:** `/examples/blog-post-seo-example.js`, `/examples/homepage-seo-example.js`, `/examples/musicas-seo-example.js`, `/examples/videos-seo-example.js`

**Problema:** Nenhum dos exemplos implementa tratamento de erro para:
- Falha no carregamento de dados (ex.: música/vídeo inexistente)
- Falha no LazyIframe (embed não carregou)
- Falha na imagem (src quebrada)

**Impacto:** Exemplos incompletos; desenvolvedores podem não incluir fallbacks em produção.

**Sugestão:** Adicionar estados de erro e fallback visual em cada exemplo (ex.: imagem placeholder, mensagem "Conteúdo indisponível").

---

## 10. Dados Mockados sem Contexto — `musicas-seo-example.js` e `videos-seo-example.js`

**Localização:** `/examples/musicas-seo-example.js` e `/examples/videos-seo-example.js`

**Problema:** Ambos os exemplos recebem `{ musica }` e `{ video }` como props sem demonstrar de onde vêm os dados (API, banco, SSG). Isso pode confundir sobre a origem dos dados.

**Impacto:** Exemplo ambíguo para novos desenvolvedores.

**Sugestão:** Adicionar comentário indicando a origem esperada dos dados (ex.: "// musica viria de getServerSideProps ou getStaticProps").

---

## Resumo das Ações Recomendadas

| # | Categoria | Item | Prioridade |
|---|-----------|------|------------|
| 1 | **Correção** | Código morto em `getStaticProps`/`getStaticPaths` comentados | Alta |
| 2 | **Duplicidade** | Breadcrumb renderizado em JSON-LD e HTML manual | Alta |
| 3 | **Qualidade** | Dados hardcoded com `useState` em vez de props | Média |
| 4 | **Performance** | Blur data URL inválido/padrão | Alta |
| 5 | **Acessibilidade** | Links de compartilhamento com texto vago | Média |
| 6 | **Duplicidade** | Microdados Schema.org inline redundantes | Alta |
| 7 | **Qualidade** | blurDataUrl sem validação real | Média |
| 8 | **Performance** | Import subutilizado de `getCriticalResources` | Baixa |
| 9 | **Correção** | Ausência de tratamento de erro em todos os exemplos | Alta |
| 10 | **Qualidade** | Dados mockados sem contexto de origem | Média |
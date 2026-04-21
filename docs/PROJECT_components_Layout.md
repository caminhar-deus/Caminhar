# Componentes Layout - Documentação Oficial

> Análise e documentação dos componentes de layout base do projeto
> Arquivos: `/components/Layout/`

---

## 📦 Visão Geral

Módulo responsável por toda a estrutura de layout responsiva do projeto.
Contém os blocos fundamentais para construção de interfaces consistentes.

| Componente | Responsabilidade | Tipo |
|------------|------------------|------|
| `Container` | Centralização, limitação de largura e padding responsivo | Estrutura Base |
| `Grid` | Sistema de grid flexível e responsivo | Organização de Conteúdo |
| `Stack` | Empilhamento vertical/horizontal com Flexbox | Alinhamento de Itens |
| `Sidebar` | Layout com sidebar colapsável e mobile first | Layout de Página |

### 📂 Arquivos do Módulo

| Arquivo | Descrição |
|---------|-----------|
| `/components/Layout/index.js` | Índice de exportações públicas |
| `/components/Layout/Container.js` | Componente Container |
| `/components/Layout/Container.module.css` | Estilos Container |
| `/components/Layout/Grid.js` | Componente Grid |
| `/components/Layout/Grid.module.css` | Estilos Grid |
| `/components/Layout/Stack.js` | Componente Stack |
| `/components/Layout/Stack.module.css` | Estilos Stack |
| `/components/Layout/Sidebar.js` | Componente Sidebar |
| `/components/Layout/Sidebar.module.css` | Estilos Sidebar |

---

## 📑 Índice de Exportações

Todos componentes são exportados via arquivo `index.js` podendo ser importados de duas formas:

```jsx
// Named Export (recomendado)
import { Container, Grid, Stack, Sidebar } from '@/components/Layout';

// Default Export
import Container from '@/components/Layout/Container';
```

---

---

## 🔲 Container

### 🎯 Propósito
Componente padrão para centralização de conteúdo com limitação de largura máxima e espaçamento horizontal responsivo. É o fundação de todas as páginas do projeto.

### 📂 Arquivos
- **Componente**: `/components/Layout/Container.js`
- **Estilos**: `/components/Layout/Container.module.css`

### ✅ Características
- ✔️ 6 tamanhos pré-definidos
- ✔️ Padding responsivo automatico
- ✔️ Modo fluido
- ✔️ Sub-componentes especializados
- ✔️ Suporte a customização de elemento HTML

### ⚙️ Propriedades

| Propriedade | Tipo | Padrão | Valores Possíveis | Descrição |
|-------------|------|--------|-------------------|-----------|
| `size` | `string` | `xl` | `sm`, `md`, `lg`, `xl`, `2xl`, `full` | Largura máxima do container |
| `centered` | `boolean` | `true` | `true` / `false` | Centraliza horizontalmente |
| `fluid` | `boolean` | `false` | `true` / `false` | Ignora largura máxima, mantém apenas padding |
| `as` | `string` | `div` | `div`, `section`, `article`, `main` | Elemento HTML a ser renderizado |
| `className` | `string` | `` | Qualquer classe | Classes adicionais |

### 📏 Tamanhos Definidos

| Tamanho | Valor Max Width |
|---------|-----------------|
| `sm` | 640px |
| `md` | 768px |
| `lg` | 1024px |
| `xl` | 1280px |
| `full` | 100% |

### 📱 Padding Responsivo
| Breakpoint | Padding Horizontal |
|------------|--------------------|
| Mobile | 1rem |
| >= 640px | 1.5rem |
| >= 1024px | 2rem |

### 🔗 Sub-componentes

| Nome | Descrição | Padding Vertical |
|------|-----------|------------------|
| `Container.Section` | Container para seções completas | 3rem / 4rem / 6rem responsivo |
| `Container.Article` | Container otimizado para conteúdo de texto | 2rem / 3rem + max-width 768px |

---

---

## 🧩 Grid

### 🎯 Propósito
Sistema de grid nativo CSS Grid completo, flexível e totalmente responsivo.
Suporta layouts fixos, automáticos e dinâmicos.

### 📂 Arquivos
- **Componente**: `/components/Layout/Grid.js`
- **Estilos**: `/components/Layout/Grid.module.css`

### ✅ Características
- ✔️ Sistema de 12 colunas
- ✔️ 7 níveis de espaçamento
- ✔️ Controle total de alinhamento
- ✔️ Suporte a colspan e rowspan
- ✔️ Modo Auto Grid
- ✔️ Grid responsivo breakpoints inteligentes
- ✔️ Fallbacks mobile automáticos

### ⚙️ Propriedades (Grid Principal)

| Propriedade | Tipo | Padrão | Valores Possíveis | Descrição |
|-------------|------|--------|-------------------|-----------|
| `columns` | `number` | `3` | 1 a 12 | Número de colunas fixas |
| `gap` | `string` | `md` | `none`, `xs`, `sm`, `md`, `lg`, `xl`, `2xl` | Espaçamento entre itens |
| `align` | `string` | `stretch` | `start`, `center`, `end`, `stretch` | Alinhamento vertical |
| `justify` | `string` | `start` | `start`, `center`, `end`, `between`, `around`, `evenly` | Alinhamento horizontal |

### 📏 Valores de Gap

| Tamanho | Valor |
|---------|-------|
| `none` | 0 |
| `xs` | 0.5rem |
| `sm` | 0.75rem |
| `md` | 1rem |
| `lg` | 1.5rem |
| `xl` | 2rem |
| `2xl` | 3rem |

---

### 🔗 Variantes Especiais

#### 🔹 Grid.Item
Item individual do grid com suporte a posicionamento avançado

| Propriedade | Tipo | Descrição |
|-------------|------|-----------|
| `colSpan` | `number` | Número de colunas que o item ocupará (1-12) |
| `colStart` | `number` | Coluna onde o item iniciará |
| `rowSpan` | `number` | Número de linhas que o item ocupará |

#### 🔹 Grid.Auto
Grid com colunas automáticas que se ajustam dinamicamente conforme espaço disponível

| Propriedade | Tipo | Padrão | Descrição |
|-------------|------|--------|-----------|
| `minWidth` | `string` | `250px` | Largura mínima dos itens |

#### 🔹 Grid.Responsive
Grid com número de colunas diferente por breakpoint

| Propriedade | Tipo | Padrão | Descrição |
|-------------|------|--------|-----------|
| `columns` | `object` | `{ default: 1, sm: 2, md: 3, lg: 4, xl: 5 }` | Mapeamento colunas por breakpoint |

---

### 📱 Responsividade Automática
O Grid já possui fallbacks responsivos pré-configurados:

| Breakpoint | Comportamento |
|------------|---------------|
| < 640px | Todos grids de 2 a 6 colunas viram 1 coluna |
| < 768px | Todos grids de 7 a 12 colunas viram 2 colunas |
| 640px - 1023px | Grids de 4 a 6 colunas viram 2 colunas |

---

---

## 🎯 Padrões de Uso Recomendados

### Estrutura Padrão de Página
```jsx
<Container>
  <Container.Section>
    <Grid columns={3} gap="lg">
      <Grid.Item>Conteúdo 1</Grid.Item>
      <Grid.Item>Conteúdo 2</Grid.Item>
      <Grid.Item>Conteúdo 3</Grid.Item>
    </Grid>
  </Container.Section>
</Container>
```

### Grid Responsivo
```jsx
<Grid.Responsive 
  columns={{ default: 1, sm: 2, md: 3, lg: 4 }} 
  gap="xl"
>
  {items.map(item => <Card {...item} />)}
</Grid.Responsive>
```

### Grid Automático
```jsx
<Grid.Auto minWidth="280px" gap="md">
  {cards.map(card => <Card {...card} />)}
</Grid.Auto>
```

---

## ⚠️ Observações Técnicas

1. **Nunca use margin horizontal diretamente** - sempre utilize o Container para padding e centralização
2. **Evite aninhar Containers** - não é necessário e causa padding duplicado
3. **Grid.Item é opcional** - use apenas quando precisar de colspan/rowspan
4. **Todos componentes recebem props adicionais** - suporta `id`, `data-*`, `aria-*`, etc
5. **Valores padrão são otimizados** - na maioria dos casos não precisa alterar props padrão

---

---

## 📚 Stack

### 🎯 Propósito
Componente utilitário para empilhamento de itens vertical e horizontal baseado em Flexbox.
É o componente ideal para alinhamento e espaçamento consistente entre elementos.

### ✅ Características
- ✔️ Direção vertical e horizontal
- ✔️ 7 níveis de espaçamento
- ✔️ Controle total de alinhamento
- ✔️ Suporte a wrap
- ✔️ Modo inline
- ✔️ Alinhamento individual por item
- ✔️ Divisores automáticos
- ✔️ Responsividade automática

### ⚙️ Propriedades

| Propriedade | Tipo | Padrão | Valores Possíveis | Descrição |
|-------------|------|--------|-------------------|-----------|
| `direction` | `string` | `vertical` | `vertical`, `horizontal`, `row`, `column` | Direção do empilhamento |
| `spacing` | `string` | `md` | `none`, `xs`, `sm`, `md`, `lg`, `xl`, `2xl` | Espaçamento entre itens |
| `align` | `string` | `stretch` | `start`, `center`, `end`, `stretch`, `baseline` | Alinhamento dos itens |
| `justify` | `string` | `start` | `start`, `center`, `end`, `between`, `around`, `evenly` | Distribuição dos itens |
| `wrap` | `boolean` | `false` | `true` / `false` | Permite quebra de linha |
| `inline` | `boolean` | `false` | `true` / `false` | Utiliza display inline-flex |

### 🔗 Variantes e Atalhos

| Nome | Descrição |
|------|-----------|
| `Stack.VStack` | Atalho para Stack vertical |
| `Stack.HStack` | Atalho para Stack horizontal |
| `Stack.Item` | Item individual com suporte a grow/shrink |
| `Stack.Divider` | Divisor automático vertical/horizontal |

### 📱 Responsividade
Stack horizontal automaticamente vira vertical em telas menores que 768px mantendo o mesmo espaçamento.

---

---

## 📱 Sidebar

### 🎯 Propósito
Componente completo de layout com sidebar colapsável, otimizado para desktop e mobile.
Suporta modo overlay em mobile, animações suaves e acessibilidade.

### ✅ Características
- ✔️ Colapsável com animação suave
- ✔️ Posição esquerda ou direita
- ✔️ 3 tamanhos pré-definidos
- ✔️ Modo overlay nativo para mobile
- ✔️ Botão toggle automático
- ✔️ Sub-componentes de navegação prontos
- ✔️ Totalmente acessível
- ✔️ Escondido automaticamente na impressão

### ⚙️ Propriedades

| Propriedade | Tipo | Padrão | Valores Possíveis | Descrição |
|-------------|------|--------|-------------------|-----------|
| `sidebar` | `ReactNode` | - | Qualquer conteúdo | Conteúdo da sidebar |
| `collapsed` | `boolean` | `false` | `true` / `false` | Estado colapsado |
| `onCollapse` | `function` | - | Callback | Função chamada ao colapsar |
| `position` | `string` | `left` | `left`, `right` | Posição da sidebar |
| `width` | `string` | `md` | `sm`, `md`, `lg` | Largura da sidebar |
| `collapsible` | `boolean` | `true` | `true` / `false` | Permite colapsar |
| `mobileOverlay` | `boolean` | `true` | `true` / `false` | Mostrar overlay em mobile |

### 📏 Tamanhos

| Tamanho | Largura Normal | Largura Colapsada |
|---------|-----------------|--------------------|
| `sm` | 200px | 64px |
| `md` | 260px | 72px |
| `lg` | 320px | 80px |

### 🔗 Sub-componentes

| Nome | Descrição |
|------|-----------|
| `Sidebar.Nav` | Container para navegação |
| `Sidebar.NavItem` | Item de navegação com ícone, label e badge |
| `Sidebar.Section` | Seção com título na sidebar |
| `Sidebar.Header` | Cabeçalho fixo |
| `Sidebar.Footer` | Rodapé fixo |

---

---

## 🎯 Padrões de Uso Recomendados

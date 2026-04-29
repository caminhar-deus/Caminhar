# Documentação - Componentes Admin / Fields, Managers & Tools

> **Localização**: `/components/Admin/`
> **Última atualização**: 20/04/2026
> **Versão**: 1.1

---

## 📋 Sumário

| Categoria | Componente | Arquivo | Propósito Principal |
|---|---|---|---|
| 📝 **Fields** | `ImageUploadField` | `/fields/ImageUploadField.js` | Upload de imagens com preview e integração nativa |
| 📝 **Fields** | `TextAreaField` | `/fields/TextAreaField.js` | Campo de texto multi linhas com contador de caracteres |
| 📝 **Fields** | `TextField` | `/fields/TextField.js` | Campo de texto padrão multi-tipos |
| 📝 **Fields** | `ToggleField` | `/fields/ToggleField.js` | Interruptor booleano com status visual |
| 📝 **Fields** | `UrlField` | `/fields/UrlField.js` | Campo URL com validação inteligente e preview embed |
| ⚙️ **Managers** | `BackupManager` | `/Managers/BackupManager.js` | Gerenciador de backups do banco de dados |
| ⚙️ **Managers** | `CacheManager` | `/Managers/CacheManager.js` | Gerenciador de cache Redis |
| 🔧 **Tools** | `IntegrityCheck` | `/Tools/IntegrityCheck.js` | Verificação de integridade do sistema |
| 🔧 **Tools** | `RateLimitViewer` | `/Tools/RateLimitViewer.js` | Visualizador de status do Rate Limiting |

---

## 🎯 Padrão Comum de Todos os Campos

Todos os componentes seguem o mesmo padrão de interface:
- Usam o `Admin.module.css` para estilos base
- Aceitam `name`, `label`, `onChange`, `value` como props obrigatórias
- Suportam estados de erro, hint de ajuda e classes customizadas
- Possuem validação de PropTypes
- Interface consistente com todo sistema Admin
- Retornam eventos no formato padrão React `{ target: { name, value } }`

---

---

## 1. 🖼️ ImageUploadField.js

### Propósito
Campo completo para upload de imagens com preview integrado, suporte a upload customizado ou nativo via API.

### Principais Características
✅ Campo texto para URL manual + botão upload
✅ Preview automático da imagem selecionada
✅ Estado de loading durante upload
✅ Suporta handler de upload customizado
✅ Upload padrão integrado com endpoint `/api/upload-image`
✅ Tratamento de erros nativo
✅ Tipos de arquivo aceitos: somente imagens

### Props
| Prop | Tipo | Obrigatório | Padrão | Descrição |
|---|---|:---:|---|---|
| `name` | `string` | ✅ | - | Nome do campo no formulário |
| `label` | `string` | ✅ | - | Texto do label |
| `value` | `string` | ✅ | - | URL atual da imagem |
| `onChange` | `Function` | ✅ | - | Callback quando valor altera |
| `onUpload` | `Function` | ❌ | - | Handler customizado de upload (recebe File) |
| `uploadEndpoint` | `string` | ❌ | `/api/upload-image` | Endpoint para upload padrão |
| `uploadType` | `string` | ❌ | `post` | Tipo enviado no formulário |
| `required` | `boolean` | ❌ | `false` | Marca campo obrigatório |
| `error` | `string` | ❌ | - | Mensagem de erro externa |
| `hint` | `string` | ❌ | - | Texto de ajuda |
| `placeholder` | `string` | ❌ | `https://... ou faça upload` | Placeholder do input |

### Observações
- Se `onUpload` for fornecido substitui completamente o fluxo nativo de upload
- Retorna diretamente a URL final para o onChange
- Bloqueia interações durante upload

---

## 2. 📝 TextAreaField.js

### Propósito
Campo de texto multi linhas padrão para o painel administrativo.

### Principais Características
✅ Contador automático de caracteres quando `maxLength` é definido
✅ Resize vertical habilitado
✅ Herda todas as propriedades nativas do `<textarea>`
✅ Altura mínima padrão 80px

### Props
| Prop | Tipo | Obrigatório | Padrão | Descrição |
|---|---|:---:|---|---|
| `name` | `string` | ✅ | - | Nome do campo |
| `label` | `string` | ✅ | - | Label do campo |
| `value` | `string` | ✅ | - | Valor atual |
| `onChange` | `Function` | ✅ | - | Handler de alteração |
| `rows` | `number` | ❌ | `3` | Quantidade de linhas visíveis |
| `maxLength` | `number` | ❌ | - | Limite máximo de caracteres |
| `required` | `boolean` | ❌ | `false` | Campo obrigatório |
| `error` | `string` | ❌ | - | Mensagem de erro |
| `hint` | `string` | ❌ | - | Texto de ajuda |

### Observações
- Todas props adicionais são repassadas diretamente para o elemento textarea nativo
- Contador aparece automaticamente no canto inferior direito quando maxLength existe

---

## 3. ✏️ TextField.js

### Propósito
Campo de texto padrão base para todos os inputs de linha única no Admin.

### Principais Características
✅ Suporta todos os tipos nativos de input HTML
✅ Padrão de interface uniforme com todos os campos
✅ Validação de tipos permitidos através PropTypes

### Props
| Prop | Tipo | Obrigatório | Padrão | Descrição |
|---|---|:---:|---|---|
| `name` | `string` | ✅ | - | Nome do campo |
| `label` | `string` | ✅ | - | Label do campo |
| `value` | `string` | ✅ | - | Valor atual |
| `onChange` | `Function` | ✅ | - | Handler de alteração |
| `type` | `string` | ❌ | `text` | Tipo do input |
| `required` | `boolean` | ❌ | `false` | Campo obrigatório |
| `error` | `string` | ❌ | - | Mensagem de erro |
| `hint` | `string` | ❌ | - | Texto de ajuda |

### Tipos Permitidos
`text`, `email`, `password`, `number`, `tel`, `search`

### Observações
- Componente mais utilizado no sistema, base para maioria dos formulários
- Todas props extras são repassadas diretamente para o input nativo

---

## 4. 🔘 ToggleField.js

### Propósito
Campo booleano (interruptor) com status visual colorido e labels customizáveis.

### Principais Características
✅ Badge de status com cor dinâmica
✅ Labels de status customizáveis
✅ Suporta estado desabilitado
✅ Layout alinhado horizontalmente

### Props
| Prop | Tipo | Obrigatório | Padrão | Descrição |
|---|---|:---:|---|---|
| `name` | `string` | ✅ | - | Nome do campo |
| `label` | `string` | ✅ | - | Texto principal do campo |
| `checked` | `boolean` | ✅ | - | Estado atual |
| `onChange` | `Function` | ✅ | - | Handler de alteração |
| `description` | `string` | ❌ | - | Texto descritivo abaixo |
| `disabled` | `boolean` | ❌ | `false` | Desabilita interação |
| `activeLabel` | `string` | ❌ | `Publicado` | Texto quando ativo |
| `inactiveLabel` | `string` | ❌ | `Rascunho` | Texto quando inativo |

### Observações
- Verde = Ativo / Amarelo = Inativo
- Todo elemento é clicável, não apenas o checkbox
- Opacidade reduzida quando desabilitado

---

## 5. 🔗 UrlField.js

### Propósito
Campo especializado para URLs com validação inteligente por plataforma e preview embed nativo.

### Principais Características
✅ Validação nativa de URL
✅ Suporte especial para YouTube e Spotify
✅ Extração automática de IDs das plataformas
✅ Preview embed integrado
✅ Validação customizada suportada
✅ Placeholders específicos por plataforma

### Props
| Prop | Tipo | Obrigatório | Padrão | Descrição |
|---|---|:---:|---|---|
| `name` | `string` | ✅ | - | Nome do campo |
| `label` | `string` | ✅ | - | Label do campo |
| `value` | `string` | ✅ | - | URL atual |
| `onChange` | `Function` | ✅ | - | Handler de alteração |
| `platform` | `string` | ❌ | `generic` | Tipo de plataforma |
| `showPreview` | `boolean` | ❌ | `false` | Habilita preview embed |
| `validate` | `Function` | ❌ | - | Função de validação customizada |
| `required` | `boolean` | ❌ | `false` | Campo obrigatório |
| `error` | `string` | ❌ | - | Mensagem de erro externa |
| `hint` | `string` | ❌ | - | Texto de ajuda |

### Plataformas Suportadas
| Plataforma | Funcionalidades |
|---|---|
| `youtube` | Valida URL, extrai ID, renderiza embed player |
| `spotify` | Valida URL, extrai ID, renderiza embed player |
| `generic` | Apenas valida formato de URL válido |

### Observações
- Validação ocorre em tempo real enquanto usuário digita
- Erros de validação interna tem precedência sobre erros externos
- Preview é carregado automaticamente quando URL é válida e `showPreview=true`

---

---

## ⚙️ Managers

Componentes de gerenciamento de sistema para o painel administrativo.

---

### 6. 💾 BackupManager.js

### Propósito
Componente para visualização e criação de backups do banco de dados diretamente pelo painel Admin.

### Principais Características
✅ Exibe informações do último backup realizado
✅ Botão para criação de backup manual
✅ Confirmação antes de executar ação
✅ Status visual de loading e mensagens de feedback
✅ Atualização automática após criação de novo backup

### Funcionalidades
- Carrega informações automaticamente ao montar o componente
- Faz requisição GET para `/api/admin/backups` para obter status
- Faz requisição POST para o mesmo endpoint para criar novo backup
- Exibe nome, data formatada em pt-BR e tamanho do arquivo
- Tratamento de erros e mensagens amigáveis para o usuário

### Observações
- Backups automáticos são realizados diariamente pelo sistema
- Este componente permite apenas criar backups manuais adicionais
- Utiliza credenciais incluídas nas requisições para autenticação

---

### 7. 🗄️ CacheManager.js

### Propósito
Componente para **monitoramento em tempo real** e limpeza do cache Redis do sistema.

### Principais Características
✅ Aviso de confirmação com alerta sobre impacto na performance
✅ Feedback visual usando react-hot-toast
✅ Estado de loading durante operação
✅ Tratamento completo de erros
✅ Monitoramento em tempo real do status do Redis
✅ Exibe métricas de erros, fallbacks e estatísticas
✅ Status visual colorido (verde/vermelho) conforme conectividade
✅ Carrega dados automaticamente ao abrir a aba

### Funcionalidades
- **Método GET**: Busca e exibe métricas de monitoramento do cache
- **Método POST/DELETE**: Executa limpeza completa do cache Redis
- Exibe status de conexão, contador de erros, ativações de fallback e última falha
- Mostra toast de loading, sucesso ou erro nas operações

### Observações
- Botão em cor vermelha para indicar ação destrutiva
- É recomendado utilizar apenas quando alterações não estiverem aparecendo no frontend
- Limpar o cache causa aumento temporário de carga no banco de dados

---

---

## 🔧 Tools

Ferramentas administrativas e visualizadores de status do sistema.

---

### 8. ✅ IntegrityCheck.js

### Propósito
Componente placeholder para verificação de integridade do sistema operacional.

### Estado Atual
🔴 **Componente ainda não implementado**
- Apenas estrutura básica criada
- Apenas título e texto fixo
- Nenhuma funcionalidade implementada

---

### 9. 🚦 RateLimitViewer.js

### Propósito
Componente para visualização do status do sistema de Rate Limiting.

### Estado Atual
🟡 **Implementação Parcial**
- Exibe status fixo: `Ativo (Middleware)`
- Não há integração com API ou dados reais
- Apenas estrutura visual básica

---

---

## 📌 Informações Gerais

### Arquitetura
- Todos componentes são Functional Components com Hooks
- Nenhuma dependência externa além do React e PropTypes
- Sem estado global, 100% controlados
- Zero efeitos colaterais internos

### Estilos
- Todos usam a classe base `styles.formGroup`
- Estilos de erro e hint são uniformes
- Cores seguem padrão Bootstrap:
  - Erro: `#dc3545`
  - Sucesso: `#d4edda`
  - Aviso: `#fff3cd`

### Utilização
Todos os campos são utilizados da mesma forma nos formulários CRUD Admin:

```jsx
<NomeDoCampo
  name="nome_campo"
  label="Nome do Campo"
  value={formValues.nome_campo}
  onChange={handleChange}
  required
  hint="Texto de ajuda para o usuário"
  error={errors.nome_campo}
/>
```

---
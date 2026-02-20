# Admin CRUD Components

Sistema de componentes reutilizáveis para eliminar duplicação de código nos painéis administrativos.

## Estrutura

```
components/Admin/
├── AdminCrudBase.js          # Componente base genérico para CRUD
├── AdminMusicasNew.js        # CRUD de Músicas (refatorado)
├── AdminVideosNew.js         # CRUD de Vídeos (refatorado)
├── AdminPostsNew.js          # CRUD de Posts (refatorado)
├── fields/
│   ├── TextField.js          # Campo de texto
│   ├── TextAreaField.js      # Campo de textarea
│   ├── ImageUploadField.js   # Upload de imagens com preview
│   ├── ToggleField.js        # Switch booleano
│   └── UrlField.js           # Input de URL com validação
├── index.js                  # Exportações centralizadas
└── README.md                 # Documentação
```

## Uso Básico

```jsx
import AdminCrudBase from './AdminCrudBase';
import TextField from './fields/TextField';
import ToggleField from './fields/ToggleField';
import { z } from 'zod';

const schema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório')
});

const fields = [
  {
    name: 'nome',
    component: TextField,
    label: 'Nome',
    required: true
  },
  {
    name: 'ativo',
    component: ToggleField,
    label: 'Ativo'
  }
];

const columns = [
  { key: 'id', header: 'ID' },
  { key: 'nome', header: 'Nome' },
  { key: 'ativo', header: 'Status' }
];

function MeuCrud() {
  return (
    <AdminCrudBase
      apiEndpoint="/api/admin/meus-itens"
      title="Meus Itens"
      fields={fields}
      columns={columns}
      initialFormData={{ nome: '', ativo: false }}
      validationSchema={schema}
    />
  );
}
```

## Campos Disponíveis

### TextField
Campo de texto simples com suporte a validação.

```jsx
{
  name: 'email',
  component: TextField,
  label: 'Email',
  type: 'email',
  required: true,
  placeholder: 'exemplo@email.com'
}
```

### TextAreaField
Campo de texto multilinha com contador de caracteres.

```jsx
{
  name: 'descricao',
  component: TextAreaField,
  label: 'Descrição',
  rows: 5,
  maxLength: 500
}
```

### UrlField
Campo de URL com validação e preview (YouTube/Spotify).

```jsx
{
  name: 'url_youtube',
  component: UrlField,
  label: 'Vídeo do YouTube',
  platform: 'youtube',
  showPreview: true
}
```

### ImageUploadField
Upload de imagens com preview e input de URL manual.

```jsx
{
  name: 'imagem',
  component: ImageUploadField,
  label: 'Imagem',
  uploadType: 'post'
}
```

### ToggleField
Switch booleano para status publicado/rascunho.

```jsx
{
  name: 'publicado',
  component: ToggleField,
  label: 'Publicar',
  description: 'Se desmarcado, será salvo como rascunho'
}
```

## Props do AdminCrudBase

| Prop | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| apiEndpoint | string | Sim | Endpoint base da API |
| title | string | Sim | Título do painel |
| fields | array | Sim | Configuração dos campos |
| columns | array | Sim | Configuração das colunas |
| initialFormData | object | Sim | Dados iniciais do formulário |
| validationSchema | ZodSchema | Não | Schema Zod para validação |
| usePagination | boolean | Não | Se usa paginação (default: false) |
| itemsPerPage | number | Não | Itens por página (default: 10) |

## Colunas da Tabela

### Coluna Simples
```jsx
{ key: 'titulo', header: 'Título' }
```

### Coluna com Formatação
```jsx
{
  key: 'data',
  header: 'Data',
  format: (value) => new Date(value).toLocaleDateString()
}
```

### Coluna com Renderização Customizada
```jsx
{
  key: 'status',
  header: 'Status',
  render: (item, value) => (
    <span style={{ color: value ? 'green' : 'red' }}>
      {value ? 'Ativo' : 'Inativo'}
    </span>
  )
}
```

## Hook useAdminCrud

Para casos que precisam de mais controle, use o hook diretamente:

```jsx
import { useAdminCrud } from '../../hooks/useAdminCrud';

function MeuComponente() {
  const {
    items,
    loading,
    formData,
    isEditing,
    handleInputChange,
    handleSubmit,
    handleDelete
  } = useAdminCrud({
    apiEndpoint: '/api/admin/itens',
    initialFormData: { nome: '' }
  });

  // Renderização customizada
}
```

## Migração de Componentes Antigos

### Antes (AdminMusicas.js)
~150 linhas de código repetitivo

### Depois (AdminMusicasNew.js)
~60 linhas de configuração declarativa

Vantagens:
- Menos código para manter
- Consistência de UI/UX
- Validação centralizada
- Feedback visual com toast
- Paginação automática

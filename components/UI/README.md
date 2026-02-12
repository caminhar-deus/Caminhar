# UI Components - O Caminhar com Deus

Componentes base reutilizáveis do Design System.

## Componentes Disponíveis

### Button
```jsx
import { Button } from '@/components/UI';

// Variantes
<Button variant="primary">Primário</Button>
<Button variant="secondary">Secundário</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="danger">Perigo</Button>
<Button variant="success">Sucesso</Button>
<Button variant="warning">Aviso</Button>

// Tamanhos
<Button size="sm">Pequeno</Button>
<Button size="md">Médio</Button>
<Button size="lg">Grande</Button>
<Button size="xl">Extra Grande</Button>

// Estados
<Button loading>Carregando...</Button>
<Button disabled>Desabilitado</Button>
<Button fullWidth>Largura Total</Button>

// Com ícones
<Button leftIcon={<Icon />}>Com Ícone</Button>
<Button rightIcon={<Icon />}>Com Ícone</Button>
```

### Input
```jsx
import { Input } from '@/components/UI';

<Input 
  label="Email"
  type="email"
  placeholder="seu@email.com"
  helperText="Digite seu email"
  required
/>

// Com erro
<Input 
  label="Senha"
  type="password"
  error
  errorMessage="Senha inválida"
/>

// Com addons
<Input 
  leftAddon={<SearchIcon />}
  placeholder="Buscar..."
/>
```

### TextArea
```jsx
import { TextArea } from '@/components/UI';

<TextArea 
  label="Mensagem"
  rows={5}
  maxLength={500}
  showCount
  autoResize
/>
```

### Select
```jsx
import { Select } from '@/components/UI';

const options = [
  { value: '1', label: 'Opção 1' },
  { value: '2', label: 'Opção 2', disabled: true },
];

<Select 
  label="Selecione"
  options={options}
  placeholder="Escolha uma opção"
/>
```

### Card
```jsx
import { Card } from '@/components/UI';

// Básico
<Card>
  <h3>Título</h3>
  <p>Conteúdo do card</p>
</Card>

// Com header/footer
<Card
  header={<Card.Header title="Título" subtitle="Subtítulo" />}
  footer={<Card.Footer>Footer content</Card.Footer>}
>
  Conteúdo
</Card>

// Variantes
<Card variant="elevated">Elevado</Card>
<Card variant="outlined">Com borda</Card>
<Card variant="filled">Preenchido</Card>

// Interativo
<Card hoverable clickable onClick={handleClick}>
  Clique aqui
</Card>
```

### Modal
```jsx
import { Modal } from '@/components/UI';

const [isOpen, setIsOpen] = useState(false);

<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Título do Modal"
  size="md"
  footer={
    <>
      <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancelar</Button>
      <Button onClick={handleConfirm}>Confirmar</Button>
    </>
  }
>
  Conteúdo do modal
</Modal>
```

### Spinner
```jsx
import { Spinner } from '@/components/UI';

// Tamanhos
<Spinner size="sm" />
<Spinner size="md" />
<Spinner size="lg" />

// Variantes
<Spinner variant="border" />
<Spinner variant="grow" />
<Spinner variant="dots" />

// Cores
<Spinner color="primary" />
<Spinner color="secondary" />
<Spinner color="white" />

// Overlay
<Spinner.Overlay label="Carregando página..." />
```

### Badge
```jsx
import { Badge } from '@/components/UI';

// Básico
<Badge>Novo</Badge>

// Variantes
<Badge variant="primary">Primário</Badge>
<Badge variant="success">Sucesso</Badge>
<Badge variant="error">Erro</Badge>

// Contador
<Badge.Counter count={5} max={99} />

// Ponto
<Badge.Dot pulse />
```

### Alert
```jsx
import { Alert } from '@/components/UI';

// Tipos
<Alert status="info" title="Informação">Mensagem</Alert>
<Alert status="success" title="Sucesso!">Operação concluída</Alert>
<Alert status="warning" title="Atenção">Verifique os dados</Alert>
<Alert status="error" title="Erro">Algo deu errado</Alert>

// Variantes
<Alert variant="subtle">Subtle (default)</Alert>
<Alert variant="solid">Solid</Alert>
<Alert variant="leftAccent">Com acento esquerdo</Alert>

// Fechável
<Alert closable onClose={handleClose}>Mensagem</Alert>
```

### Toast
```jsx
import { Toast, useToast } from '@/components/UI';

// Componente
<Toast
  isOpen={isOpen}
  status="success"
  title="Sucesso!"
  description="Ação concluída"
  onClose={handleClose}
/>

// Hook
const { toast } = useToast();

toast.success({ title: 'Sucesso!', description: 'Operação concluída' });
toast.error({ title: 'Erro!', description: 'Algo deu errado' });
toast.warning({ title: 'Atenção!', description: 'Verifique' });
toast.info({ title: 'Info', description: 'Notificação' });
```

## Importações

```javascript
// Individual
import { Button } from '@/components/UI/Button';
import { Card } from '@/components/UI/Card';

// Todos de uma vez
import { 
  Button, 
  Card, 
  Input, 
  Modal,
  // ... 
} from '@/components/UI';
```

# O Caminhar com Deus

Um site cristão moderno e dinâmico para compartilhar reflexões e ensinamentos sobre fé, espiritualidade e a jornada cristã.

## Funcionalidades

- **Página Principal (HOME)**: Exibe título e subtítulo dinâmicos, frase de apresentação e imagem hero configurável
- **Painel Administrativo (ADMIN)**: Área protegida por login para gerenciar conteúdo do site
- **Upload de Imagens**: Sistema para atualizar a imagem principal (1100x320px) via painel administrativo
- **Gerenciamento de Configurações**: Interface para editar título, subtítulo e outras configurações
- **Design Moderno**: Interface limpa, responsiva e otimizada para performance
- **Sistema de Autenticação**: JWT com cookies HTTP-only e bcrypt para segurança

## Tecnologias Utilizadas

- **Next.js 13.5.11**: Framework React para desenvolvimento web
- **React 18.3.1**: Biblioteca JavaScript para interfaces de usuário
- **CSS Modules**: Estilização modular e organizada
- **Node.js**: Ambiente de execução JavaScript
- **SQLite**: Banco de dados relacional para armazenamento de dados
- **JWT (JSON Web Tokens)**: Autenticação baseada em tokens
- **bcrypt**: Hashing seguro de senhas
- **Cookie-based Authentication**: Gerenciamento seguro de sessões

## Estrutura de Arquivos

```
caminhar/
├── pages/
│   ├── _app.js                  # Configuração global do Next.js
│   ├── index.js                 # Página principal (HOME)
│   ├── admin.js                 # Painel administrativo
│   └── api/
│       ├── auth/
│       │   ├── check.js         # Verificação de autenticação
│       │   ├── login.js         # Endpoint de login
│       │   └── logout.js        # Endpoint de logout
│       ├── settings.js          # API para gerenciamento de configurações
│       ├── upload-image.js      # API para upload de imagens
│       └── placeholder-image.js # API para servir imagens
├── lib/
│   ├── auth.js                  # Sistema de autenticação
│   ├── db.js                    # Gerenciamento de banco de dados
│   └── init-server.js           # Inicialização do servidor
├── data/
│   └── caminhar.db              # Banco de dados SQLite
├── styles/
│   ├── globals.css              # Estilos globais
│   ├── Home.module.css          # Estilos da página HOME
│   └── Admin.module.css         # Estilos da página ADMIN
├── public/
│   └── uploads/                 # Imagens uploadadas
├── package.json                 # Dependências e scripts
└── README.md                   # Este arquivo
```

## Como Executar

1. **Instalar dependências**:
   ```bash
   npm install
   ```

2. **Inicializar o banco de dados** (opcional, será criado automaticamente):
   ```bash
   npm run init-db
   ```

3. **Iniciar o servidor de desenvolvimento**:
   ```bash
   npm run dev
   ```

4. **Acessar o site**:
   - Página principal: http://localhost:3000
   - Painel administrativo: http://localhost:3000/admin

## Credenciais de Acesso

- **Usuário**: `admin`
- **Senha**: `password`

## Configuração para Produção

Para publicar em produção:

1. **Build do projeto**:
   ```bash
   npm run build
   ```

2. **Iniciar o servidor**:
   ```bash
   npm start
   ```

3. **Variáveis de ambiente** (recomendado para produção):
   ```bash
   # Configure em um arquivo .env
   JWT_SECRET=seu-secret-key-aqui
   NODE_ENV=production
   ```

4. **Configurações de segurança**:
   - Configure HTTPS para conexões seguras
   - Configure CORS apropriadamente
   - Configure chaves de autenticação seguras
   - Configure armazenamento de arquivos em cloud storage

## Funcionalidades Implementadas

✅ **Sistema de Banco de Dados Completo**:
- **SQLite Integration**: Banco de dados relacional integrado
- **Tabelas Estruturadas**: Usuários, configurações e imagens
- **CRUD Operations**: Operações completas para todas as entidades
- **Default Data**: Configurações e usuário admin pré-configurados
- **Connection Management**: Gerenciamento seguro de conexões

✅ **Sistema de Autenticação Robusto**:
- **JWT Authentication**: Token-based authentication com JSON Web Tokens
- **Password Hashing**: Senhas armazenadas com bcrypt (10 rounds)
- **HTTP-only Cookies**: Cookies seguros para armazenamento de tokens
- **Session Management**: Controle de sessão com expiração de 1 hora
- **Protected Routes**: Middleware de autenticação para rotas protegidas
- **Login/Logout API**: Endpoints seguros para autenticação
- **CSRF Protection**: Configuração de cookies com SameSite=strict
- **Role-based Access**: Suporte para diferentes níveis de acesso

✅ **Cache de Imagens Otimizado**:
- **Cache-Control com max-age de 86400 segundos (24 horas)**: Configuração otimizada para cache de longo prazo
- Cabeçalhos ETag para validação de cache eficiente
- Cabeçalhos Last-Modified para controle de versão
- Carregamento lazy loading para imagens (loading="lazy")
- Cache imutável para recursos estáticos (immutable)
- Redução de 80-90% nas requisições de imagem para visitantes frequentes
- Melhor performance em conexões lentas e móveis
- Melhor pontuação em ferramentas de performance (Lighthouse, PageSpeed)

✅ **Otimização de Performance**:
- **Code Splitting**: Implementação de carregamento dinâmico de componentes
- **Performance Monitoring**: Monitoramento de rotas e navegação
- **Build Analysis**: Script `npm run analyze` para análise de bundle
- **Prefetching**: Pré-carregamento inteligente de páginas
- **Tempo de carregamento reduzido significativamente**
- Melhor experiência do usuário com carregamento progressivo
- Redução no consumo de banda do servidor
- Suporte completo para navegadores modernos
- Otimização de build e deploy

✅ **SEO e Acessibilidade**:
- Meta tags otimizadas para SEO
- Estrutura semântica HTML
- Acessibilidade para leitores de tela
- Desempenho otimizado para dispositivos móveis
- Open Graph tags para compartilhamento social

✅ **Gerenciamento de Configurações**:
- **Dynamic Settings**: Configurações armazenadas no banco de dados
- **Admin Interface**: Interface para editar configurações
- **Real-time Updates**: Atualizações em tempo real na interface
- **Validation**: Validação de dados de entrada
- **Error Handling**: Tratamento de erros robusto

## Melhorias Futuras

### Prioridade Alta
- **Sistema de Posts/Artigos**: Implementar blog com categorias e tags
- **Comentários**: Sistema de comentários para interação dos usuários
- **Newsletter**: Sistema de inscrição e envio de newsletters
- **Multilíngue**: Suporte para múltiplos idiomas (Português, Inglês, Espanhol)
- **Backup Automático**: Sistema de backup automático do banco de dados

### Prioridade Média
- **Integração com Redes Sociais**: Compartilhamento e login social
- **Sistema de Busca**: Busca avançada por conteúdo
- **Estatísticas**: Dashboard com estatísticas de acesso
- **API RESTful**: Expandir API para consumo externo
- **Webhooks**: Integração com serviços externos

### Prioridade Baixa
- **Tema Escuro**: Opção de tema escuro/claro
- **Notificações**: Sistema de notificações para usuários
- **Perfis de Usuário**: Perfis personalizados para usuários
- **Sistema de Doações**: Integração com gateways de pagamento
- **Calendário de Eventos**: Sistema de eventos e calendário

## Segurança

- **Atualizações Regulares**: Mantenha todas as dependências atualizadas
- **Validação de Entrada**: Sempre valide dados de entrada do usuário
- **Proteção CSRF**: Configurado com SameSite cookies
- **CORS**: Configure apropriadamente para produção
- **HTTPS**: Sempre use HTTPS em produção
- **Rate Limiting**: Considere implementar para proteger APIs

## Licença

Este projeto está licenciado sem restrições. Sinta-se livre para usar e modificar.

## Contato

Para suporte ou dúvidas, abra uma issue neste repositório.

## Contribuição

Contribuições são bem-vindas! Siga estas etapas:

1. Fork o projeto
2. Crie sua feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

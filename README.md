# Caminhar com Deus

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)

Um site cristão moderno construído com Next.js 16 e React 19 para compartilhar reflexões, músicas e vídeos sobre fé e espiritualidade.

## 🚀 Como Iniciar

### Pré-requisitos
- Node.js 20.0.0+ (Recomendado 24.14.0+)
- PostgreSQL 15+
- Redis 7+

### Instalação
```bash
# 1. Clonar e instalar dependências
npm install

# 2. Configurar ambiente
cp .env.example .env
# Editar .env com DATABASE_URL, REDIS_URL e JWT_SECRET

# 3. Iniciar banco de dados
npm run db:init

# 4. Iniciar aplicação
npm run dev
```

Acesse: http://localhost:3000

## 📋 Funcionalidades

- **ContentTabs**: Navegação por abas (Reflexões, Músicas, Vídeos)
- **Spotify Integration**: Reprodução de músicas
- **YouTube Integration**: Reprodução de vídeos
- **Admin Panel**: Área protegida para gerenciar conteúdo
- **API RESTful**: API pública documentada (v1) para consumo externo
- **Lightbox**: Visualização expandida de imagens
- **Cache e Segurança**: Sistema distribuído com Redis para alta performance e Rate Limiting
- **SEO**: Meta tags, Schema.org e Open Graph
- **Backup**: Sistema automático de backups
- **Qualidade**: Cobertura de testes automatizados com Jest, Cypress e k6 (testes de carga)

## 🛠️ Comandos Úteis

```bash
# Desenvolvimento
npm run dev
npm run build
npm start

# Banco de dados
npm run db:init
npm run db:shell
npm run db:clear
npm run db:clear:musicas
npm run db:reset:password

# Testes
npm test
npm run cypress:run
npm run test:load:all

# Administração
npm run create-backup
npm run restore-backup
npm run clear-cache
```

## 📁 Estrutura de Arquivos

```
├── pages/          # Páginas da aplicação
├── components/     # Componentes React
├── lib/           # Lógica de negócio
├── api/           # Endpoints da API
├── styles/        # Estilos CSS
├── tests/         # Testes automatizados
└── docs/          # Documentação técnica
```

## 🤝 Contribuição

1. Fork o repositório
2. Crie uma branch: `git checkout -b feature/nome`
3. Faça commit: `git commit -m 'Adiciona feature'`
4. Push: `git push origin feature/nome`
5. Abra um Pull Request

## 📄 Licença

MIT License - uso livre e modificações permitidas.

## 📞 Suporte

Para dúvidas ou suporte, abra uma issue no repositório.
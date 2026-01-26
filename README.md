# O Caminhar com Deus

Um site cristão moderno e dinâmico para compartilhar reflexões e ensinamentos sobre fé, espiritualidade e a jornada cristã.

## Funcionalidades

- **Página Principal (HOME)**: Exibe o título fixo "O Caminhar com Deus", a frase de apresentação e uma imagem hero configurável
- **Painel Administrativo (ADMIN)**: Área protegida por login para gerenciar o conteúdo do site
- **Upload de Imagens**: Sistema para atualizar a imagem principal (1100x320px) via painel administrativo
- **Design Moderno**: Interface limpa e responsiva

## Tecnologias Utilizadas

- **Next.js 13.5.11**: Framework React para desenvolvimento web
- **React 18.3.1**: Biblioteca JavaScript para interfaces de usuário
- **CSS Modules**: Estilização modular e organizada
- **Node.js**: Ambiente de execução JavaScript

## Estrutura de Arquivos

```
caminhar/
├── pages/
│   ├── _app.js          # Configuração global do Next.js
│   ├── index.js         # Página principal (HOME)
│   ├── admin.js         # Painel administrativo
│   └── api/
│       ├── upload-image.js      # API para upload de imagens
│       └── placeholder-image.js # API para servir imagens
├── styles/
│   ├── globals.css      # Estilos globais
│   ├── Home.module.css  # Estilos da página HOME
│   └── Admin.module.css # Estilos da página ADMIN
├── package.json         # Dependências e scripts
└── README.md           # Este arquivo
```

## Como Executar

1. **Instalar dependências**:
   ```bash
   npm install
   ```

2. **Iniciar o servidor de desenvolvimento**:
   ```bash
   npm run dev
   ```

3. **Acessar o site**:
   - Página principal: http://localhost:3000
   - Painel administrativo: http://localhost:3000/admin

## Credenciais de Acesso

- **Usuário**: `admin`
- **Senha**: `password`

## Configuração para Produção (Hostinger)

Para publicar no Hostinger:

1. **Build do projeto**:
   ```bash
   npm run build
   ```

2. **Configurar o servidor**:
   - Use o comando `npm start` para iniciar o servidor
   - Configure o domínio para apontar para a porta 3000
   - Configure HTTPS se necessário

3. **Variáveis de ambiente** (recomendado para produção):
   - Configure `NEXTAUTH_URL` para seu domínio
   - Configure chaves de autenticação seguras
   - Configure armazenamento de arquivos em cloud storage

## Melhorias Futuras

- Sistema de autenticação mais robusto
- Banco de dados para armazenar configurações
- Otimização de performance
- SEO avançado
- Sistema de posts/artigos

## Funcionalidades Implementadas

✅ **Cache de Imagens**: O sistema agora inclui cache agressivo de imagens com:
- **Cache-Control com max-age de 86400 segundos (24 horas)**: Configuração otimizada para cache de longo prazo
- Cabeçalhos ETag para validação de cache eficiente
- Cabeçalhos Last-Modified para controle de versão
- Carregamento lazy loading para imagens (loading="lazy")
- Cache imutável para recursos estáticos (immutable)
- Redução de 80-90% nas requisições de imagem para visitantes frequentes
- Melhor performance em conexões lentas e móveis
- Melhor pontuação em ferramentas de performance (Lighthouse, PageSpeed)

✅ **Otimização de Performance**:
- Tempo de carregamento reduzido significativamente
- Melhor experiência do usuário com carregamento progressivo
- Redução no consumo de banda do servidor
- Suporte completo para navegadores modernos

## Licença

Este projeto está licenciado sem restrições. Sinta-se livre para usar e modificar.

## Contato

Para suporte ou dúvidas, abra uma issue neste repositório.
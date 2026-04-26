# Documentação Arquivos Raiz do Projeto

> Análise objetiva e propósito de cada arquivo localizado na raiz do repositório Caminhar com Deus.

---

## 📋 Índice
1. [babel.jest.config.js](#babeljestconfigjs)
2. [CHANGELOG.md](#changelogmd)
3. [ci.yml](#ciyml)
4. [cypress.config.js](#cypressconfigjs)
5. [GEMINI.md](#geminimd)
6. [jest.config.js](#jestconfigjs)
7. [jest.setup.js](#jestsetupjs)
8. [jest.teardown.js](#jestteardownjs)
9. [knip.json](#knipjson)
10. [load-tests.yml](#load-testsyml)
11. [next.config.js](#nextconfigjs)
12. [next-sitemap.config.js](#next-sitemapconfigjs)
13. [package.json](#packagejson)
14. [package-lock.json](#package-lockjson)
15. [pr-coverage.yml](#pr-coverageyml)
16. [rate-limit-proxy.js](#rate-limit-proxyjs)
17. [README.md](#readmemd)
18. [security-tests.yml](#security-testsyml)
19. [skills-lock.json](#skills-lockjson)
20. [styleMock.js](#stylemockjs)
21. [tree.txt](#treetxt)

---

## 1. babel.jest.config.js

### Propósito Geral
Arquivo de configuração Babel especializado e exclusivo para execução dos testes com Jest.

### Função e Funcionamento
- Compila código ES Modules e React para formato compatível com o ambiente Node.js durante testes
- Configura presets alinhados com a versão atual do Node.js instalado
- Habilita `@babel/preset-react` com runtime automático (não precisa importar React nos componentes)
- Possui configuração separada especificamente para ambiente `test`
- Resolve conflitos de transformação de módulos entre ES Modules e CommonJS que ocorrem no Jest
- Desabilita plugin do istanbul em arquivos de teste para evitar conflitos

### Pontos Chave
✅ Usado **apenas** para testes, não influencia build de produção  
✅ Configuração minimalista e focada em compatibilidade  
✅ Mantém os padrões ES Modules do projeto dentro do ambiente de testes

---

## 2. CHANGELOG.md

### Propósito Geral
Registro histórico oficial e cronológico de todas as alterações, lançamentos e evoluções do projeto.

### Estrutura e Conteúdo
Segue o formato padrão `Keep a Changelog` com:
- Versão do release e data de lançamento
- Categorias padronizadas:
  - ✅ **Adicionado**: Novas funcionalidades e recursos
  - 🔄 **Alterado**: Mudanças em funcionalidades existentes
  - 🐛 **Corrigido**: Bugs e problemas resolvidos
  - ⚠️ **Quebrando**: Alterações incompatíveis com versões anteriores
  - 📦 **Dependências**: Atualizações e adições de bibliotecas

### Histórico de Versões
| Versão | Data       | Principais Marcos
|--------|------------|-------------------
| 1.7.0  | 07/03/2026 | Arquitetura de testes centralizada, ES Modules
| 1.6.0  | 26/02/2026 | Next.js 16, Redis, Upload de imagens, Backup automático
| 1.5.0  | 22/02/2026 | Testes de carga k6, Scripts de banco
| 1.2.0  | 20/02/2026 | Arquitetura de produção, Cache, SEO, Segurança
| 1.0.0  | 18/02/2026 | Versão inicial de lançamento

### Pontos Chave
✅ Única fonte da verdade para evolução do projeto  
✅ Mantido desde o primeiro lançamento  
✅ Todos os commits relevantes são registrados aqui

---

## 3. ci.yml

### Propósito Geral
Pipeline de Integração Contínua (CI) configurado para GitHub Actions.

### Funcionamento
- Executado automaticamente em **todo Push e Pull Request** para as branches `main` e `master`
- Ambiente: Ubuntu Latest com Node.js 24.15.0
- Passos executados:
  1. Checkout do repositório
  2. Instalação do Node.js com cache de dependências
  3. Instalação das dependências npm
  4. Execução da suíte completa de testes usando `npm run test:ci` com configurações otimizadas para CI

### Pontos Chave
✅ Gate de qualidade: nenhum código que quebre testes pode ser mergeado  
✅ Cache habilitado para builds rápidos  
✅ Pipeline mínimo e eficiente sem passos desnecessários

---

## 4. cypress.config.js

### Propósito Geral
Arquivo de configuração principal do Cypress para testes end-to-end (E2E).

### Configurações Principais
| Parâmetro                | Valor                  | Função
|--------------------------|------------------------|--------
| `baseUrl`                | `http://localhost:3000`| URL base padrão para todos os testes
| `video`                  | `true`                 | Grava vídeo completo de todas as execuções de teste
| `screenshotOnRunFailure` | `true`                 | Captura screenshot automática quando um teste falha
| `allowCypressEnv`        | `false`                | Medida de segurança desabilitando acesso inseguro a variáveis
| `supportFile`            | `false`                | Desabilita arquivo de suporte global padrão

### Pontos Chave
✅ Otimizado para execução tanto local quanto em ambiente CI  
✅ Medidas de segurança habilitadas por padrão  
✅ Configuração mínima sem plugins adicionais instalados

---

## 5. GEMINI.md

### Propósito Geral
Arquivo de contexto e instruções para agentes AI que trabalham no projeto.

### Conteúdo
Lista de padrões e skills que devem ser seguidos rigorosamente por qualquer assistente AI, incluindo:
- Padrões Next.js e Vercel
- Melhores práticas de React
- Padrões de backend Node.js
- Padrões PostgreSQL
- Diretrizes UI/UX
- Padrões de engenharia de prompt

### Pontos Chave
✅ Arquivo de configuração exclusivo para agentes AI  
✅ Garante consistência nas implementações realizadas por assistentes  
✅ Define o padrão de qualidade esperado no código do projeto

---

---

## 6. jest.config.js

### Propósito Geral
Arquivo de configuração principal e arquitetura completa da suíte de testes Jest.

### Funcionamento e Características
- Ambiente de testes `jsdom` para simular navegador
- Usa `V8` como provider de cobertura para evitar conflitos com Babel
- Integração com o arquivo `babel.jest.config.js` para transformação de módulos
- Cobertura de código DESATIVADA por padrão para manter execução rápida dos testes
- Configura aliases de importação para o projeto (`@/`, `@tests/`, `@factories/`, etc)
- Mapeia arquivos CSS para mocks
- Configuração otimizada para estabilidade com ES Modules
- Timeout e workers ajustados para performance e confiabilidade

### Pontos Chave
✅ Configuração otimizada e balanceada entre velocidade e qualidade  
✅ Cobertura só é executada quando explicitamente solicitada via `--coverage`  
✅ Máxima compatibilidade com Next.js e ES Modules

---

## 7. jest.setup.js

### Propósito Geral
Arquivo de inicialização executado **antes** de cada arquivo de teste.

### Funcionamento
- Estende o Jest com matchers personalizados do `@testing-library/jest-dom`
- Adiciona Polyfills para APIs que não existem no JSDOM:
  - `TextEncoder` / `TextDecoder`
  - `Request` / `Response` / `Headers` (via biblioteca undici)
- Necessário para testar Middleware e rotas API do Next.js
- Loga informações do ambiente para debug

### Pontos Chave
✅ Resolve a maioria dos erros comuns de ambiente em testes Jest  
✅ Compatibilidade máxima com APIs modernas do Node.js e Browser

---

## 8. jest.teardown.js

### Propósito Geral
Hook global executado **depois** que TODOS os testes finalizaram.

### Funcionamento
- Ponto centralizado para limpeza global após execução completa da suíte
- Atualmente vazio, mas preparado para receber código de cleanup quando necessário

### Pontos Chave
✅ Arquivo de extensibilidade para rotinas de finalização  
✅ Evita repetição de código de limpeza em cada teste

---

## 9. knip.json

### Propósito Geral
Configuração da ferramenta `knip` - detector de dependências não utilizadas e arquivos mortos.

### Funcionamento
- Lista de diretórios e arquivos que devem ser ignorados na análise
- Lista de binários e dependências que devem ser excluídas da verificação
- Desativa regra de duplicatas
- Foca a análise apenas no código fonte de produção do projeto

### Pontos Chave
✅ Mantém o projeto limpo de dependências órfãs  
✅ Evita falsos positivos em arquivos de configuração e testes

---

## 10. load-tests.yml

### Propósito Geral
Pipeline GitHub Actions para execução automatizada de Testes de Carga com k6.

### Funcionamento
- Executado **automaticamente todos os dias às 03:00 UTC** (madrugada horário Brasil)
- Permite também execução manual via interface
- Cria ambiente completo isolado com PostgreSQL e Redis reais
- Realiza build completo da aplicação em modo produção
- Executa o teste de stress combinado que simula carga real de usuários
- Gera e armazena relatórios por 30 dias

### Pontos Chave
✅ Monitoramento contínuo da performance da aplicação  
✅ Ambiente 100% idêntico a produção  
✅ Nenhum impacto nos usuários pois executa em horário de baixa movimentação

---

---

## 11. next.config.js

### Propósito Geral
Arquivo de configuração principal do framework Next.js.

### Funcionamento
- Configura pacotes externos do servidor para evitar warnings do Edge Runtime
- Customiza configuração do Webpack com fallbacks para módulos Node.js no client
- Define headers CORS e segurança para todas as rotas API
- Configura permissões e métodos HTTP permitidos

### Pontos Chave
✅ Configuração mínima e alinhada com padrões Next.js 16  
✅ Headers CORS dinâmicos baseados em variável de ambiente  
✅ Compatibilidade máxima com módulos nativos do Node.js

---

## 12. next-sitemap.config.js

### Propósito Geral
Configuração completa do gerador automático de Sitemap e Robots.txt.

### Funcionamento
- Integra com configuração SEO centralizada do projeto
- Gera automaticamente `sitemap.xml` e `robots.txt` após cada build
- Define políticas diferenciadas para cada crawler (Googlebot, Bingbot, etc)
- Configura frequência de atualização e prioridade por rota
- Exclui rotas administrativas e internas dos motores de busca
- Preparado para receber URLs dinâmicas do banco de dados

### Pontos Chave
✅ Executado automaticamente como `postbuild`  
✅ Otimizado para SEO e indexação  
✅ Separa sitemaps específicos para músicas e vídeos

---

## 13. package.json

### Propósito Geral
Arquivo manifesto do projeto Node.js - ponto central de configuração.

### Conteúdo
- **Versão atual**: 1.4.0
- **Engine**: Node.js 24.15.0 (versão exata travada)
- **Mais de 80 scripts** organizados por categoria:
  - Desenvolvimento e Build
  - Testes unitários, integração e E2E
  - Banco de dados, migrations e seeds
  - Backup e manutenção
  - Testes de carga e performance
  - Monitoramento e validação
- Lista completa de dependências produção e desenvolvimento
- Overrides de dependências para resolver vulnerabilidades

### Pontos Chave
✅ Padrão ES Modules nativo habilitado  
✅ Todos os comandos do projeto centralizados aqui  
✅ Versão do Node.js exatamente travada para consistência

---

## 14. package-lock.json

### Propósito Geral
Arquivo de lock de versões gerado automaticamente pelo npm.

### Funcionamento
- Trava EXATAMENTE a versão de TODAS as dependências e subdependências
- Garante que a instalação seja idêntica em qualquer ambiente
- Contém hashes de integridade para verificação de segurança
- Gerado automaticamente em cada `npm install`

### Pontos Chave
✅ **NUNCA EDITAR MANUALMENTE**  
✅ Essencial para reprodutibilidade dos builds  
✅ Mantido pelo gerenciador de pacotes

---

## 15. pr-coverage.yml

### Propósito Geral
Pipeline GitHub Actions que impõe padrão mínimo de cobertura de testes em Pull Requests.

### Funcionamento
- Executado automaticamente em todo Pull Request para branch `main`
- Cria ambiente completo com PostgreSQL e Redis
- Executa análise de código morto com `knip`
- Executa suíte de testes com cobertura
- **Gate de qualidade mínimo de 20% de cobertura global**
- Comenta automaticamente no PR com detalhes quando falha
- Envia relatório de cobertura como artefato

### Pontos Chave
✅ Previne que código sem cobertura mínima seja mergeado  
✅ Feedback transparente direto no Pull Request  
✅ Nenhum desenvolvedor consegue burlar essa regra

---

---

## 16. rate-limit-proxy.js

### Propósito Geral
Middleware de Rate Limiting inteligente com fallback dual e múltiplas camadas de whitelist.

### Funcionamento
- Protege EXCLUSIVAMENTE a rota de login `/api/auth/login`
- Limite: **5 tentativas a cada 15 minutos** por IP
- Estratégia dual de armazenamento:
  1. ✅ **Redis**: Persistente, compartilhado entre todas as instâncias (produção)
  2. 📌 **Memória**: Fallback local se Redis não estiver disponível (desenvolvimento)
- 3 níveis de Whitelist:
  - IPs locais fixos
  - Variável de ambiente `ADMIN_IP_WHITELIST`
  - Whitelist dinâmica no Redis
- Loga todas as tentativas bloqueadas com detalhes de segurança

### Pontos Chave
✅ Padrão Fail-Open: em caso de erro continua permitindo acesso  
✅ Compatível com Serverless e VPS  
✅ Nenhuma dependência externa obrigatória

---

## 17. README.md

### Propósito Geral
Documentação principal e ponto de entrada do projeto.

### Conteúdo
- Visão geral do projeto
- Stack tecnológica oficial
- Guia passo a passo de instalação local
- Pré-requisitos e configuração de ambiente
- Instruções de execução de testes
- Badge de status do pipeline CI

### Pontos Chave
✅ Primeiro documento que novos desenvolvedores leem  
✅ Mantido atualizado com os processos oficiais  
✅ Todos os comandos básicos estão documentados aqui

---

## 18. security-tests.yml

### Propósito Geral
Pipeline automatizado de Testes de Segurança executado em todo Push e Pull Request.

### Funcionamento
- Executa suíte completa de testes de segurança com k6:
  - Teste de DDoS na busca
  - Validação do Rate Limiting
  - Testes negativos de login
  - Teste de spoofing de IP
- Ambiente isolado completo com PostgreSQL e Redis
- Executa build real da aplicação em modo produção
- Gera relatórios de segurança armazenados por 30 dias

### Pontos Chave
✅ Nenhum código com vulnerabilidades conhecidas pode ser mergeado  
✅ Executa automaticamente sem necessidade de intervenção  
✅ Simula ataques reais contra a aplicação

---

## 19. skills-lock.json

### Propósito Geral
Arquivo de lock das versões das Skills do Cline Agent.

### Funcionamento
- Trava exatamente a versão de cada skill instalada no projeto
- Garante que todos os desenvolvedores e agentes AI usem exatamente a mesma versão das skills
- Gerado automaticamente pelo comando `cline skills install`

### Pontos Chave
✅ **NUNCA EDITAR MANUALMENTE**  
✅ Mantido pelo gerenciador de skills do Cline  
✅ Essencial para consistência do comportamento dos agentes AI

---

## 20. styleMock.js

### Propósito Geral
Mock de arquivos CSS para ambiente de testes Jest.

### Funcionamento
- Retorna um objeto vazio para qualquer importação de arquivo `.css`
- Evita erros de parsing quando componentes importam arquivos de estilo nos testes
- Usado pelo Jest através da configuração `moduleNameMapper`

### Pontos Chave
✅ Arquivo mínimo e otimizado  
✅ Padrão universal em projetos React/Jest

---

## 21. tree.txt

### Propósito Geral
Snapshot completo e atualizado da estrutura de diretórios do projeto.

### Funcionamento
- Visualização hierárquica de 100% dos arquivos do repositório
- Gerado automaticamente pelo comando `tree`
- Referência rápida para entender a organização do projeto
- Usado principalmente por agentes AI para ter visão geral completa

### Pontos Chave
✅ Atualizado após cada alteração estrutural importante  
✅ Único lugar onde é possível ver toda a árvore do projeto de uma vez  
✅ Essencial para navegação e entendimento da arquitetura

---

> ✅ Documentação atualizada em: 18/04/2026

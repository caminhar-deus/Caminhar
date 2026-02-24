# 🛡️ Segurança - O Caminhar com Deus

Este documento descreve as práticas, políticas e implementações de segurança adotadas no projeto "O Caminhar com Deus".

## 1. Visão Geral

A segurança é um pilar fundamental da arquitetura do projeto. Adotamos uma abordagem de **defesa em profundidade**, implementando camadas de segurança desde a infraestrutura até a aplicação e o banco de dados.

## 2. Autenticação e Autorização

### JWT (JSON Web Tokens)
- **Implementação**: Utilizamos tokens JWT assinados com algoritmo HS256.
- **Armazenamento**: Os tokens são armazenados exclusivamente em **Cookies HTTP-only**, prevenindo ataques de XSS (Cross-Site Scripting) que poderiam roubar tokens armazenados em `localStorage`.
- **Expiração**: Tokens possuem tempo de vida curto (1 hora) para minimizar riscos em caso de comprometimento.
- **Segredo**: A chave de assinatura (`JWT_SECRET`) é configurada via variáveis de ambiente e nunca exposta no código.

### Proteção de Senhas
- **Hashing**: Todas as senhas são hashadas utilizando **bcrypt** antes de serem persistidas no banco de dados.
- **Sal**: O bcrypt gera e gerencia o sal automaticamente, protegendo contra ataques de Rainbow Table.

## 3. Proteção de API

### Rate Limiting (Limitação de Taxa)
Para proteger contra ataques de força bruta e DDoS (Negação de Serviço), implementamos um sistema robusto de Rate Limiting:
- **Tecnologia**: Redis (via Upstash) para controle distribuído e persistente.
- **Fallback**: Em caso de falha do Redis, o sistema degrada graciosamente para um controle em memória.
- **Limites**:
    - Rotas públicas: 100 requisições por 15 minutos por IP.
    - Login: Limites mais estritos para prevenir força bruta.
- **Whitelist**: Suporte a lista de IPs confiáveis (`ADMIN_IP_WHITELIST`) para administradores.

### Validação de Entrada (Input Validation)
- **Schema Validation**: Utilizamos a biblioteca **Zod** para validar rigorosamente todos os dados de entrada nas APIs.
- **Sanitização**: Previne injeção de dados maliciosos e garante que apenas dados esperados sejam processados.

### CORS (Cross-Origin Resource Sharing)
- **Configuração**: O CORS é configurado para permitir apenas origens confiáveis (`ALLOWED_ORIGINS`) em produção, bloqueando requisições não autorizadas de navegadores.

## 4. Segurança de Infraestrutura

### HTTPS e SSL
- **Criptografia em Trânsito**: Todo o tráfego é criptografado via TLS/SSL.
- **Certificados**: Gerenciados via Certbot (Let's Encrypt) no Nginx.
- **Redirecionamento**: Todo tráfego HTTP é forçado para HTTPS.

### Banco de Dados (PostgreSQL)
- **Conexão Segura**: Em produção, a conexão com o banco de dados exige SSL (`rejectUnauthorized: false` para compatibilidade com alguns provedores de nuvem, mas sempre criptografado).
- **SQL Injection**: Utilizamos **Queries Parametrizadas** (Prepared Statements) através do driver `pg`, eliminando o risco de injeção de SQL.

### Servidor
- **Usuário Não-Root**: A aplicação roda sob um usuário com privilégios limitados, nunca como root.
- **Firewall**: Configuração de UFW permitindo apenas portas essenciais (22, 80, 443).
- **Headers de Segurança**: O Nginx é configurado para remover headers que expõem versões de software (`Server`, `X-Powered-By`).

## 5. Gerenciamento de Dados e Uploads

### Upload de Arquivos
- **Validação**: Verificação rigorosa de tipos MIME (apenas imagens permitidas) e tamanho de arquivo.
- **Armazenamento**: Em ambientes VPS, o armazenamento é local e protegido. Em ambientes serverless, recomenda-se o uso de S3/Blob Storage.

### Backups
- **Segurança**: Os arquivos de backup (`.gz`) contêm dados sensíveis e são armazenados em diretório protegido com permissões restritas (600).
- **Sanitização de Logs**: Logs de testes e operações removem automaticamente tokens e senhas antes de serem salvos.

## 6. Monitoramento e Auditoria

### Testes de Segurança
- **Automatizados**: A suíte de testes inclui verificações de segurança (`npm run test:security`), rodando `npm audit` e verificações de vulnerabilidades conhecidas.
- **Testes de Carga**: Cenários de k6 simulam ataques (DDoS, IP Spoofing) para validar a resiliência do Rate Limiting.

### Logs
- **Auditoria**: Logs de acesso e erro são mantidos para auditoria forense em caso de incidentes.
- **Privacidade**: Garantimos que dados sensíveis (PII, senhas, tokens) não sejam logados.

## 7. Política de Vulnerabilidades

Se você descobrir uma vulnerabilidade de segurança neste projeto, por favor, **NÃO** abra uma issue pública.
Envie um e-mail para `security@caminhar.com` ou entre em contato diretamente com os mantenedores.

---

**Última atualização:** 24/02/2026
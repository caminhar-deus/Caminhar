# 🛡️ Segurança - O Caminhar com Deus

## 🚀 Versão: v1.4.0

Este documento descreve as práticas, políticas e implementações de segurança adotadas no projeto "O Caminhar com Deus".

**Última Atualização:** 07/03/2026
**Versão:** 1.4.0

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
- **Testes de Carga**: Cenários de k6 simulam ataques (DDoS, IP Spoofing, força bruta) para validar a resiliência do Rate Limiting.
- **Testes de Segurança**: Validação completa de segurança do sistema e proteções contra ataques comuns.
- **Testes de Cross-Browser**: Compatibilidade verificada em diferentes navegadores para prevenir vulnerabilidades específicas.
- **Testes de Mobile**: Responsividade e usabilidade validadas em dispositivos móveis para segurança em plataformas móveis.

### Logs
- **Auditoria**: Logs de acesso e erro são mantidos para auditoria forense em caso de incidentes.
- **Privacidade**: Garantimos que dados sensíveis (PII, senhas, tokens) não sejam logados.
- **Sanitização**: Logs de testes e operações removem automaticamente tokens e senhas antes de serem salvos.
- **Monitoramento em Tempo Real**: Sistema de monitoramento de segurança em tempo real para detecção de ameaças.

## 7. Escopo de Segurança

### Cobertura
- Aplicações web e APIs
- Infraestrutura e servidores
- Banco de Dados e backups
- Uploads e arquivos estáticos
- Autenticação e autorização

### Exclusões
- Segurança física dos servidores
- Segurança de redes de terceiros
- Segurança de dispositivos dos usuários

## 8. Resposta a Incidentes de Segurança

### Procedimentos
1. **Identificação**: Detecção de incidente de segurança
2. **Contenção**: Isolamento da ameaça
3. **Eradicação**: Remoção da causa raiz
4. **Recuperação**: Restauração dos serviços
5. **Lições Aprendidas**: Análise pós-incidente

### Comunicação
- **Internamente**: Comunicação imediata com equipe de segurança
- **Externamente**: Comunicação com usuários conforme necessidade
- **Autoridades**: Notificação conforme requisitos legais

## 9. Conformidade Legal

### LGPD (Lei Geral de Proteção de Dados)
- **Tratamento de Dados**: Conformidade total com requisitos da LGPD
- **Direitos dos Titulares**: Garantia dos direitos de acesso, retificação, exclusão e portabilidade de dados
- **Notificação de Incidentes**: Comunicação em até 72 horas conforme exigido
- **Testes de Privacidade**: Validação de conformidade com LGPD nos testes automatizados
- **Documentação**: Registros de tratamento de dados e consentimentos mantidos

### GDPR (Regulamento Geral de Proteção de Dados)
- **Conformidade UE**: Total conformidade para usuários da União Europeia
- **Consentimento Informado**: Tratamento de dados com consentimento explícito e informado
- **Direitos dos Usuários**: Direito de acesso, retificação, exclusão e portabilidade de dados garantidos
- **Testes de Conformidade**: Verificação automática de conformidade GDPR nos testes de carga
- **Proteção de Dados**: Implementação de medidas técnicas e organizacionais para proteção de dados

### Outras Conformidades
- **OWASP**: Implementação de práticas recomendadas de segurança OWASP
- **ISO 27001**: Alinhamento com requisitos de segurança da informação
- **Testes de Segurança**: Validação completa de segurança do sistema e proteções

## 10. Exemplos de Código Seguro

### Validação de Entrada
```javascript
// Seguro: Uso de Zod para validação
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

// Inseguro: Validação manual
// if (req.body.email && req.body.password) { ... }
```

### Consulta ao Banco de Dados
```javascript
// Seguro: Queries parametrizadas
const result = await db.query(
  'SELECT * FROM users WHERE email = $1',
  [email]
);

// Inseguro: Concatenação direta
// const result = await db.query(`SELECT * FROM users WHERE email = '${email}'`);
```

## 11. Política de Vulnerabilidades

### Relato de Vulnerabilidades
Se você descobrir uma vulnerabilidade de segurança neste projeto, por favor, **NÃO** abra uma issue pública.
Envie um e-mail para `security@caminhar.com` ou entre em contato diretamente com os mantenedores.

### Processo de Resposta
1. **Recebimento**: Vulnerabilidades são recebidas e analisadas em até 24 horas
2. **Validação**: Confirmação da existência e impacto da vulnerabilidade
3. **Priorização**: Classificação de criticidade (Baixa, Média, Alta, Crítica)
4. **Correção**: Desenvolvimento e implementação da correção
5. **Testes**: Validação da correção através de testes automatizados
6. **Comunicação**: Notificação aos usuários sobre a correção

### Critérios de Classificação
- **Crítica**: Exposição de dados sensíveis, execução remota de código, bypass de autenticação
- **Alta**: Vulnerabilidades que podem comprometer a integridade do sistema
- **Média**: Vulnerabilidades que podem causar indisponibilidade ou degradação de serviço
- **Baixa**: Vulnerabilidades de baixo impacto ou difícil exploração

### Reconhecimento
Agradecemos publicamente aos pesquisadores de segurança que reportam vulnerabilidades de forma responsável, após a correção ser implementada.

### Testes de Segurança
- **Automatizados**: Testes de segurança integrados ao pipeline CI/CD
- **Manuais**: Análises de segurança periódicas
- **Pentesting**: Testes de penetração regulares
- **Monitoramento**: Monitoramento contínuo de vulnerabilidades conhecidas

---

**Última atualização:** 07/03/2026

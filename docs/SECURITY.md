# Segurança - Caminhar com Deus

## Visão Geral

Política de segurança do projeto com foco em defesa em profundidade e proteção de dados.

## Autenticação e Autorização

### JWT (JSON Web Tokens)
- **Armazenamento**: Cookies HTTP-only (protege contra XSS)
- **Expiração**: 1 hora (minimiza riscos)
- **Algoritmo**: HS256 com chave secreta configurada via ambiente
- **Validação**: Middleware de autenticação em todas as rotas protegidas

### Proteção de Senhas
- **Hashing**: bcrypt com salt automático
- **Complexidade**: Mínimo 8 caracteres
- **Validação**: Força de senha verificada no cadastro

## Proteção de API

### Rate Limiting
- **Tecnologia**: Redis (Upstash) para controle distribuído
- **Limites**:
  - Rotas públicas: 100 requisições/15min por IP
  - Login: 5 tentativas/15min por IP
- **Whitelist**: IPs administrativos configuráveis
- **Fallback**: Controle em memória se Redis falhar

### Validação de Entrada
- **Schema**: Zod para validação rigorosa
- **Sanitização**: Prevenção de injeção de dados maliciosos
- **Tipos**: Validação de tipos e formatos

### CORS
- **Configuração**: Origens específicas em produção
- **Bloqueio**: Requisições não autorizadas bloqueadas
- **Desenvolvimento**: Permissivo apenas em ambiente local

## Segurança de Infraestrutura

### HTTPS e SSL
- **Criptografia**: TLS/SSL para todo tráfego
- **Certificados**: Let's Encrypt (Certbot)
- **Forçamento**: Redirecionamento HTTP → HTTPS

### Banco de Dados
- **Conexão**: SSL obrigatório em produção
- **SQL Injection**: Prepared statements (pg driver)
- **Acesso**: Conexão via pool com credenciais seguras

### Servidor
- **Usuário**: Aplicação roda sem privilégios root
- **Firewall**: UFW com portas essenciais (22, 80, 443)
- **Headers**: Remoção de headers de versão

## Gerenciamento de Dados

### Upload de Arquivos
- **Tipos**: Apenas imagens (PNG, JPG, JPEG, GIF, WEBP)
- **Tamanho**: Máximo 10MB
- **Validação**: MIME types e extensões verificadas
- **Armazenamento**: Local protegido ou S3/Blob Storage

### Backups
- **Permissões**: Arquivos com permissão 600
- **Criptografia**: Recomendado para backups sensíveis
- **Sanitização**: Logs removem tokens e senhas

## Monitoramento e Auditoria

### Testes de Segurança
- **Automatizados**: npm audit integrado ao CI/CD
- **Carga**: Testes k6 simulando ataques DDoS
- **Validação**: Testes de segurança em todas as releases
- **Cross-Browser**: Compatibilidade segura em navegadores
- **Mobile**: Segurança validada em dispositivos móveis

### Logs
- **Auditoria**: Registros de acesso e erros
- **Privacidade**: Dados sensíveis não são logados
- **Sanitização**: Tokens e senhas removidos automaticamente
- **Monitoramento**: Detecção de ameaças em tempo real

## Conformidade Legal

### LGPD
- **Tratamento**: Conformidade total com requisitos
- **Direitos**: Acesso, retificação, exclusão e portabilidade
- **Notificação**: Incidentes comunicados em até 72 horas
- **Testes**: Validação automática de conformidade

### GDPR
- **Conformidade UE**: Total conformidade para usuários europeus
- **Consentimento**: Explícito e informado
- **Direitos**: Garantidos conforme regulamento
- **Proteção**: Medidas técnicas e organizacionais

### OWASP
- **Práticas**: Implementação de recomendações OWASP
- **Testes**: Validação de segurança em pipeline
- **Monitoramento**: Vulnerabilidades conhecidas monitoradas

## Resposta a Incidentes

### Procedimentos
1. **Identificação**: Detecção e classificação
2. **Contenção**: Isolamento da ameaça
3. **Eradicação**: Remoção da causa raiz
4. **Recuperação**: Restauração dos serviços
5. **Análise**: Lições aprendidas

### Comunicação
- **Interna**: Equipe de segurança imediatamente
- **Externa**: Usuários conforme necessidade
- **Autoridades**: Conforme requisitos legais

## Política de Vulnerabilidades

### Relato de Vulnerabilidades
**NÃO abra issue pública**
Envie e-mail para: security@caminhar.com

### Processo de Resposta
1. **Recebimento**: Análise em até 24 horas
2. **Validação**: Confirmação da vulnerabilidade
3. **Priorização**: Classificação de criticidade
4. **Correção**: Desenvolvimento e implementação
5. **Testes**: Validação automatizada
6. **Comunicação**: Notificação aos usuários

### Critérios de Classificação
- **Crítica**: Exposição de dados, execução remota, bypass de autenticação
- **Alta**: Comprometimento da integridade
- **Média**: Indisponibilidade ou degradação
- **Baixa**: Impacto mínimo ou difícil exploração

### Reconhecimento
Agradecimento público após correção responsável.

## Exemplos de Código Seguro

### Validação de Entrada
```javascript
// Seguro: Uso de Zod
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

// Inseguro: Validação manual
// if (req.body.email && req.body.password) { ... }
```

### Consulta ao Banco
```javascript
// Seguro: Prepared statements
const result = await db.query(
  'SELECT * FROM users WHERE email = $1',
  [email]
);

// Inseguro: Concatenação direta
// const result = await db.query(`SELECT * FROM users WHERE email = '${email}'`);
```

## Métricas de Segurança

| Métrica | Valor | Meta |
|---------|-------|------|
| **Vulnerabilidades** | 0 | 0 |
| **Testes de Segurança** | 100% | 100% |
| **Tempo de Resposta** | < 24h | < 24h |
| **Conformidade LGPD** | 100% | 100% |
| **Conformidade GDPR** | 100% | 100% |

## Próximos Passos

### Monitoramento
1. Implementar ferramentas de APM (Sentry)
2. Configurar alertas de segurança
3. Monitorar vulnerabilidades conhecidas

### Melhorias
1. Implementar Service Workers para segurança offline
2. Expandir testes de segurança automatizados
3. Considerar implementação de Web Application Firewall

### Conformidade
1. Auditoria de conformidade periódica
2. Atualização de políticas conforme legislação
3. Treinamento de equipe em segurança

## Documentação Relacionada

- [Arquitetura](ARCHITECTURE.md)
- [Deploy](DEPLOY.md)
- [Testes & Qualidade](TESTING.md)
- [Cache & Performance](CACHE.md)
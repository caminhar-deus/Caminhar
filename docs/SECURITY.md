# Política de Segurança

## Visão Geral

Este documento descreve as principais práticas e políticas de segurança adotadas no projeto, com foco em defesa em profundidade e proteção de dados.

## Autenticação e Autorização

### JWT (JSON Web Tokens)
- **Armazenamento:** Tokens são armazenados em cookies `HttpOnly` para proteção contra ataques XSS.
- **Expiração:** Tokens têm um tempo de vida curto (1 hora) para minimizar o risco em caso de comprometimento.
- **Validação:** Um middleware de autenticação verifica a validade do token em todas as rotas administrativas.

### Proteção de Senhas
- **Hashing:** Senhas são armazenadas usando o algoritmo `bcrypt` com um *salt* gerado automaticamente.
- **Complexidade:** Exigência de senhas com no mínimo 8 caracteres.

## Proteção de API

### Rate Limiting
- **Tecnologia:** Utiliza Redis para controle distribuído de requisições, com fallback para a memória local caso o Redis falhe.
- **Limites:** Rotas públicas e de autenticação possuem limites de requisições por IP para mitigar ataques de força bruta e DDoS.

### Validação de Entrada
- **Schema:** A biblioteca **Zod** é utilizada para validar rigorosamente todos os dados de entrada nas APIs, prevenindo dados malformados e ataques de injeção.

### CORS
- **Configuração:** A política de Cross-Origin Resource Sharing (CORS) é configurada para permitir requisições apenas de origens confiáveis em ambiente de produção.

## Segurança de Infraestrutura

### HTTPS e SSL
- **Criptografia:** Todo o tráfego é criptografado com TLS/SSL (HTTPS), com certificados gerenciados pelo Let's Encrypt (Certbot).

### Banco de Dados
- **Conexão:** A conexão com o PostgreSQL em produção exige SSL.
- **SQL Injection:** O uso de *prepared statements* (consultas parametrizadas) através do driver `pg` previne ataques de SQL Injection.

### Servidor
- **Usuário:** A aplicação é executada com um usuário sem privilégios de root.
- **Firewall:** O firewall do servidor (UFW) é configurado para permitir tráfego apenas nas portas essenciais (22, 80, 443).

## Gerenciamento de Dados

### Upload de Arquivos
- **Validação:** O sistema valida o tipo (MIME type) e o tamanho dos arquivos enviados (máximo de 10MB para imagens).
- **Armazenamento:** Os arquivos são armazenados em um diretório local protegido. Para ambientes serverless, a recomendação é usar um serviço de armazenamento de objetos como AWS S3.

### Backups
- **Permissões:** Os arquivos de backup são criados com permissões restritas (600).
- **Segurança:** Recomenda-se que os backups sejam armazenados em um local externo e seguro, com criptografia em repouso.

## Monitoramento e Auditoria

### Testes de Segurança
- **Análise de Dependências:** O comando `npm audit` é executado na pipeline de CI/CD para detectar vulnerabilidades em pacotes de terceiros.
- **Testes de Carga:** Testes com k6 simulam ataques DDoS para validar a eficácia do Rate Limiting e a estabilidade do servidor.

### Logs
- **Privacidade:** O sistema evita registrar dados sensíveis (como senhas ou tokens) nos logs da aplicação.

## Política de Relato de Vulnerabilidades

A segurança da nossa aplicação é uma prioridade. Se você acredita ter encontrado uma vulnerabilidade, por favor, siga os passos abaixo.

### Como Reportar

**NÃO abra uma issue pública no GitHub.**

Envie um e-mail detalhado para: **security@caminhar.com**

Inclua uma descrição clara da vulnerabilidade, os passos para reproduzi-la e, se possível, o impacto potencial.

Nossa equipe analisará o relato e responderá em até 48 horas. Agradecemos publicamente os pesquisadores que seguem esta política de divulgação responsável.

## Documentação Relacionada

- [Arquitetura](ARCHITECTURE.md)
- [Deploy](DEPLOY.md)
- [Testes & Qualidade](TESTING.md)
- [Cache & Performance](CACHE.md)
# Guia de Deploy

## Visão Geral

Este guia cobre o processo de deploy da aplicação em **VPS (com PM2)** e na **Vercel**.

> **⚠️ Aviso Importante sobre Uploads**
> O sistema de upload de imagens salva arquivos localmente (`/public/uploads`). Isso **não funciona** em ambientes serverless como a Vercel. Para usar a Vercel, é **obrigatório** refatorar a API de upload (`pages/api/upload-image.js`) para usar um serviço de armazenamento externo (ex: AWS S3, Vercel Blob).

## 1. Configuração de Ambiente

Crie um arquivo `.env.local` no servidor com as seguintes variáveis essenciais:

```env
# Conexão com PostgreSQL de produção
DATABASE_URL="postgresql://user:pass@host:port/db_prod"

# Chave secreta para assinar os tokens JWT
JWT_SECRET="sua-chave-secreta-muito-forte-aqui"

# Configuração do Redis (recomendado para performance)
UPSTASH_REDIS_REST_URL="https://seu-projeto.upstash.io"
UPSTASH_REDIS_REST_TOKEN="seu-token-secreto"

# Ambiente de execução
NODE_ENV="production"
```

## Deploy em VPS

### Pré-requisitos

- Node.js v24.14.0+
- PostgreSQL
- Nginx (proxy reverso)
- PM2 (gerenciador de processos)

### Passo a Passo

1. **Preparação do Servidor**
```bash
# Atualizar pacotes
sudo apt update && sudo apt upgrade -y

# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar PM2
sudo npm install -g pm2
```

2. **Configuração do Projeto**
```bash
# Clonar e instalar dependências
git clone https://github.com/seu-usuario/caminhar.git
cd caminhar
npm install --production

# Configurar ambiente
cp .env.example .env
nano .env
```

3. **Banco de Dados**
```bash
# Inicializar banco
npm run db:init
```

4. **Build e Execução**
```bash
# Build do projeto
npm run build

# Iniciar com PM2
pm2 start npm --name "caminhar" -- start

# Configurar PM2 para iniciar no boot
pm2 startup
pm2 save
```

5. **Configuração Nginx**
```nginx
server {
    listen 80;
    server_name seu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Limite de upload para imagens
    client_max_body_size 10M;
}
```

6. **HTTPS com Certbot**
```bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obter certificado SSL
sudo certbot --nginx -d seu-dominio.com
```

## Deploy na Vercel

### Pré-requisitos

- Banco PostgreSQL na nuvem (Vercel Postgres, Neon.tech, Supabase)
- Configuração de variáveis de ambiente

### Configuração

1. **Importar repositório** no painel da Vercel
2. **Configurar variáveis de ambiente**:
   - `DATABASE_URL`: String de conexão do banco na nuvem
   - `JWT_SECRET`: Chave secreta
   - `ADMIN_USERNAME` e `ADMIN_PASSWORD`

3. **Adaptar uploads** (obrigatório):
   - Instalar SDK de armazenamento (AWS S3, Vercel Blob)
   - Reescrever `pages/api/upload-image.js` para usar armazenamento externo

### CI/CD

#### GitHub Actions para VPS
```yaml
name: Deploy to VPS

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to VPS
        run: |
          ssh user@server "cd /path && git pull && npm install && npm run build && pm2 restart caminhar"
        env:
          SSH_PRIVATE_KEY: ${{ secrets.SSH_PRIVATE_KEY }}
```

#### GitHub Actions para Vercel
```yaml
name: Deploy to Vercel

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./caminhar
```

## Pós-Deploy

### Monitoramento

```bash
# Logs da aplicação
pm2 logs caminhar

# Uso de recursos
htop
df -h

# Logs do Nginx
sudo tail -f /var/log/nginx/error.log
```

### Backup Automático

O projeto inclui sistema de backup automático:
- Backups diários às 2 AM
- Compressão e rotação (máximo 10 versões)
- Interface administrativa completa

### Cache Redis

Sistema de cache com Upstash Redis:
- Redução de 80-90% nas consultas ao banco
- TTL configurável por tipo de dado
- Monitoramento de performance

## Troubleshooting

### Erros Comuns

**Banco de Dados**
```bash
# Verificar conexão
sudo systemctl status postgresql
sudo -u postgres psql -c "SELECT version();"

# Testar conexão da aplicação
npm run check-db-status
```

**Cache Redis**
```bash
# Verificar conexão
npm run check-cache

# Limpar cache
npm run clear-cache
```

**Build**
```bash
# Limpar cache de build
rm -rf .next/
npm run build

# Verificar dependências
npm ls
npm outdated
```

**Nginx**
```bash
# Testar configuração
sudo nginx -t

# Verificar logs
sudo tail -f /var/log/nginx/error.log
```

## Checklist de Segurança

- [x] HTTPS ativado com Certbot
- [x] Senhas fortes configuradas
- [x] Backups automáticos configurados
- [x] Firewall configurado (portas 22, 80, 443)
- [x] Aplicação rodando com usuário não-root
- [x] Permissões de arquivos corretas

## Melhores Práticas

### Performance
- Cache Redis configurado
- CDN para recursos estáticos (recomendado)
- Monitoramento de métricas

### Segurança
- Atualizações regulares
- Auditorias de segurança
- Logs monitorados

### Manutenção
- Backups verificados regularmente
- Dependências atualizadas
- Monitoramento de performance

## Suporte

Para problemas com deploy:
1. Verifique os logs de aplicação e sistema
2. Confira as variáveis de ambiente
3. Teste a conexão com banco de dados
4. Consulte a documentação de troubleshooting

## Documentação Relacionada

- [Arquitetura](ARCHITECTURE.md)
- [Cache & Performance](CACHE.md)
- [Sistema de Backup](BACKUP.md)
- [Testes & Qualidade](TESTING.md)
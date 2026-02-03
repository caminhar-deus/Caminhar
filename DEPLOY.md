# Guia de Deploy - O Caminhar com Deus

Este guia cobre os procedimentos para implantar a aplicação em dois ambientes comuns: **VPS (Virtual Private Server)** e **Vercel**.

## 🚨 Aviso Importante sobre Uploads

O projeto atualmente utiliza **armazenamento local** para imagens (`/public/uploads`).

- **VPS**: ✅ Funciona perfeitamente (o disco é persistente).
- **Vercel/Serverless**: ❌ **Não funcionará para uploads**. Em ambientes serverless, o sistema de arquivos é temporário. Se optar pela Vercel, você deve refatorar o `pages/api/upload-image.js` para usar um serviço externo como AWS S3, Vercel Blob ou Cloudinary.

---

## Opção 1: Deploy em VPS Genérica (Recomendado para a arquitetura atual)

Ideal para DigitalOcean, AWS EC2, Hetzner, Linode, etc.

### Pré-requisitos no Servidor
- Node.js v20+
- PostgreSQL
- Nginx (como Proxy Reverso)
- PM2 (Gerenciador de Processos)

### 1. Preparação do Ambiente

```bash
# Atualizar pacotes
sudo apt update && sudo apt upgrade -y

# Instalar Node.js (exemplo para Ubuntu)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar PM2 globalmente
sudo npm install -g pm2
```

### 2. Configuração do Projeto

Clone o repositório e instale as dependências:

```bash
git clone https://github.com/seu-usuario/caminhar.git
cd caminhar
npm install --production
```

Crie o arquivo `.env` de produção:

```bash
cp .env.example .env
nano .env
```

**Ajustes no .env:**
- `DATABASE_URL`: `postgresql://usuario:senha@localhost:5432/caminhar_prod`
- `NODE_ENV`: `production`
- `JWT_SECRET`: Use uma chave longa e aleatória.

### 3. Banco de Dados

Certifique-se que o Postgres está rodando e o banco foi criado. Em seguida, inicialize as tabelas:

```bash
npm run init-posts
# Se tiver dados legados para migrar:
# npm run migrate-db
```

### 4. Build e Execução

```bash
# Compilar o projeto Next.js
npm run build

# Iniciar com PM2
pm2 start npm --name "caminhar" -- start

# Configurar PM2 para iniciar no boot
pm2 startup
pm2 save
```

### 5. Configuração do Nginx (Proxy Reverso)

Edite `/etc/nginx/sites-available/default`:

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
    
    # Aumentar limite de upload para imagens (5MB)
    client_max_body_size 10M;
}
```

Reinicie o Nginx: `sudo systemctl restart nginx`.

---

## Opção 2: Deploy em VPS Hostinger (Passo a Passo)

Este guia detalha o processo usando uma VPS da Hostinger com o sistema operacional Ubuntu.

### 1. Configuração Inicial no hPanel da Hostinger

1.  **Acesse sua VPS**: No painel da Hostinger, vá para a seção "VPS" e selecione seu plano.
2.  **Sistema Operacional**: Certifique-se de que o SO instalado é uma versão recente do Ubuntu (ex: Ubuntu 22.04). Você pode reinstalar o SO na aba "Configurações do SO".
3.  **Acesso SSH**: Anote o **endereço IP** do seu servidor e a senha de `root` (ou configure uma chave SSH para mais segurança).
4.  **DNS**: Na sua zona de DNS, aponte seu domínio (registro `A`) para o endereço IP da sua VPS.

### 2. Preparação do Servidor

Conecte-se ao servidor via SSH:
```bash
ssh root@SEU_ENDERECO_IP
```

**Crie um usuário não-root por segurança:**
```bash
adduser seu_usuario
usermod -aG sudo seu_usuario
su - seu_usuario
```

**Instale as ferramentas básicas:**
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git nginx
```

### 3. Instalação do Ambiente (Node.js, PostgreSQL, PM2)

```bash
# Instalar Node.js v20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar PM2 (gerenciador de processos)
sudo npm install -g pm2

# Instalar PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Configurar o banco de dados
sudo -u postgres psql
```

Dentro do psql, crie o banco e o usuário:
```sql
CREATE DATABASE caminhar_prod;
CREATE USER caminhar_user WITH ENCRYPTED PASSWORD 'sua_senha_forte_aqui';
GRANT ALL PRIVILEGES ON DATABASE caminhar_prod TO caminhar_user;
\q
```

### 4. Configuração do Projeto

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/caminhar.git
cd caminhar

# Instale apenas as dependências de produção
npm install --production

# Crie e edite o arquivo .env
cp .env.example .env
nano .env
```

**Ajustes no `.env`:**
- `DATABASE_URL`: `postgresql://caminhar_user:sua_senha_forte_aqui@localhost:5432/caminhar_prod`
- `NODE_ENV`: `production`
- `JWT_SECRET`: Gere uma chave longa e aleatória.

**Faça o build do projeto e inicialize o banco:**
```bash
npm run init-posts
npm run build
```

### 5. Execução com PM2

```bash
# Inicie a aplicação
pm2 start npm --name "caminhar" -- start

# Garanta que o PM2 inicie com o servidor
pm2 startup
pm2 save
```

### 6. Configuração do Nginx e HTTPS

O Nginx atuará como um proxy reverso, direcionando o tráfego da porta 80/443 para a porta 3000 (onde o Next.js está rodando).

**Crie um arquivo de configuração para seu site:**
```bash
sudo nano /etc/nginx/sites-available/seu-dominio.com
```

Cole o conteúdo do guia genérico de Nginx (Opção 1, Passo 5) neste arquivo, substituindo `seu-dominio.com`.

**Ative o site e instale o certificado SSL com Certbot:**
```bash
sudo ln -s /etc/nginx/sites-available/seu-dominio.com /etc/nginx/sites-enabled/
sudo nginx -t # Testa a configuração
sudo systemctl restart nginx

# Instale o Certbot e obtenha o certificado
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d seu-dominio.com
```

O Certbot irá configurar o HTTPS automaticamente. Ao final, sua aplicação estará no ar e segura!

---

## Opção 3: Deploy na Vercel

A Vercel é a plataforma nativa do Next.js, mas requer adaptações para este projeto.

### 1. Banco de Dados
Você precisará de um banco PostgreSQL hospedado na nuvem.
- Opções: Vercel Postgres, Neon.tech, Supabase, AWS RDS.
- Obtenha a `DATABASE_URL` desses serviços.

### 2. Configuração do Projeto na Vercel
1. Importe o repositório do GitHub na Vercel.
2. Nas configurações do projeto, em **Environment Variables**, adicione:
   - `DATABASE_URL`: Sua string de conexão do banco na nuvem.
   - `JWT_SECRET`: Sua chave secreta.
   - `ADMIN_USERNAME` e `ADMIN_PASSWORD`.

### 3. Adaptação Obrigatória (Uploads)
Como mencionado, o upload local falhará. Você deve:
1. Criar uma conta no **Vercel Blob** ou **AWS S3**.
2. Instalar o SDK correspondente (ex: `@vercel/blob`).
3. Reescrever `pages/api/upload-image.js` para enviar o arquivo para a nuvem e salvar a URL retornada no banco de dados, em vez de salvar o arquivo no disco.

### 4. Deploy
Após configurar as variáveis, a Vercel fará o build e deploy automaticamente.

---

## Checklist de Segurança Pós-Deploy

- [ ] **HTTPS**: Ativado (Certbot no VPS / Automático na Vercel).
- [ ] **Senhas**: Senha de admin forte configurada no `.env`.
- [ ] **Backups**: Script de backup configurado (no VPS, adicione ao crontab).
- [ ] **Logs**: Monitorar logs do PM2 ou Dashboard da Vercel.
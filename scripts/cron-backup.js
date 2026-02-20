#!/bin/bash

# Script auxiliar para agendamento no CRON (Linux)
# Uso sugerido no crontab: 0 3 * * * /home/qa/Projeto/Caminhar/scripts/cron-backup.sh

# 1. Defina o diretório do projeto
PROJECT_DIR="/home/qa/Projeto/Caminhar"

# 2. Navegue para o diretório (essencial para carregar .env e node_modules corretamente)
cd "$PROJECT_DIR" || exit

# 3. Garante que a pasta de logs existe
mkdir -p data/backups

# 4. Executa o backup e loga a saída
# Nota: O 'npm' deve estar no PATH. Se usar NVM, pode ser necessário usar o caminho absoluto (ex: /home/qa/.nvm/.../bin/npm)
echo "--- [$(date)] Iniciando Backup Cron ---" >> data/backups/cron.log
npm run create-backup >> data/backups/cron.log 2>&1
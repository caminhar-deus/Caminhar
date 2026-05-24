#!/bin/bash

URL="http://localhost:3000"

echo "🔍 Verificando status do servidor em $URL..."

# Tenta conectar ao servidor (timeout de 1s)
if command -v curl &> /dev/null; then
    if ! curl -s --head --max-time 1 "$URL" > /dev/null; then
        echo "❌ Erro: O servidor não está acessível em $URL"
        echo "👉 Solução: Abra um novo terminal e execute 'npm run dev'"
        exit 1
    fi
else
    echo "⚠️  Aviso: 'curl' não encontrado. Pulando verificação prévia."
fi

echo "✅ Servidor online. Iniciando bateria de testes de carga..."
echo "---------------------------------------------------------"
echo "🚀 Usando orquestrador node scripts/run-all-load-tests-sequentially.js"
echo ""
node scripts/run-all-load-tests-sequentially.js

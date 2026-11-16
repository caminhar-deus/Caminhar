#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VERIFY_SCRIPT="${SCRIPT_DIR}/verify-mp-webhook.js"

PORT="3000"
PROVIDER=""
MODE="tunnel"
VERIFY_ARGS=()

print_help() {
  cat <<'EOF'
Uso: bash start-webhook-tunnel.sh [opcoes]

Opcoes:
  --check                   Verifica provedores de tunel instalados e exibe o roteiro de configuracao
  --verify [opcoes_node]    Executa verify-mp-webhook.js para validar assinatura HMAC v2 e payload (Pedido #22)
  --port <porta>            Porta local do servidor Next.js (padrao: 3000)
  --provider <nome>         Forca provedor de tunel: cloudflared | ngrok | ssh
  --help, -h                Exibe esta ajuda

Exemplos:
  bash start-webhook-tunnel.sh --check
  bash start-webhook-tunnel.sh --verify
  bash start-webhook-tunnel.sh --verify --send --url=http://localhost:3000/api/webhooks/mercadopago
  bash start-webhook-tunnel.sh --port 3000 --provider cloudflared
EOF
}

print_mp_guide() {
  cat <<EOF

=== Roteiro de Homologacao de Webhook no Mercado Pago (Orders API v1) ===
1. Inicie a aplicacao localmente na porta ${PORT}:
   npm run dev

2. Exponha http://localhost:${PORT} via tunel HTTPS seguro (cloudflared, ngrok ou ssh).
   URL de destino do webhook no painel:
   https://<seu-subdominio-do-tunel>/api/webhooks/mercadopago

3. No painel do desenvolvedor do Mercado Pago ("Suas integracoes" -> "Webhooks" -> "Configurar notificacoes"):
   - Ambiente: Modo de teste (ou Producao em deploy final)
   - URL para testes: https://<seu-subdominio-do-tunel>/api/webhooks/mercadopago
   - Eventos / Topicos: selecione "Order (Mercado Pago)" (e opcionalmente "Pagamentos" para legado)
   - Copie a chave secreta gerada e defina MP_WEBHOOK_SECRET no arquivo .env local (sem commitar)

4. Valide a assinatura HMAC-SHA256 v2 localmente (ou dispare um evento de teste do Pedido #22):
   node "${VERIFY_SCRIPT}"
   node "${VERIFY_SCRIPT}" --send --url=http://localhost:${PORT}/api/webhooks/mercadopago
EOF
}

check_environment() {
  echo "=== Diagnostico de Ferramentas para Tunel HTTPS ==="
  local found=0

  if command -v cloudflared >/dev/null 2>&1; then
    echo "  [OK] cloudflared: $(command -v cloudflared)"
    found=1
  else
    echo "  [--] cloudflared: nao encontrado no PATH (recomendado: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/)"
  fi

  if command -v ngrok >/dev/null 2>&1; then
    echo "  [OK] ngrok:       $(command -v ngrok)"
    found=1
  else
    echo "  [--] ngrok:       nao encontrado no PATH (opcional: https://ngrok.com/download)"
  fi

  if command -v ssh >/dev/null 2>&1; then
    echo "  [OK] ssh:         $(command -v ssh) (alternativa rapida sem instalacao via --provider ssh -> localhost.run)"
  else
    echo "  [--] ssh:         nao encontrado no PATH"
  fi

  if command -v node >/dev/null 2>&1; then
    echo "  [OK] node:        $(node -v)"
  else
    echo "  [ERRO] node:      nao encontrado no PATH"
  fi

  if [[ "${found}" -eq 0 ]]; then
    echo ""
    echo "Aviso: cloudflared e ngrok nao estao instalados; voce ainda pode usar '--provider ssh' ou '--verify'."
  fi

  print_mp_guide
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --help|-h)
      print_help
      exit 0
      ;;
    --check)
      MODE="check"
      shift
      ;;
    --verify)
      MODE="verify"
      shift
      VERIFY_ARGS=("$@")
      break
      ;;
    --port)
      PORT="${2:-3000}"
      shift 2
      ;;
    --port=*)
      PORT="${1#*=}"
      shift
      ;;
    --provider)
      PROVIDER="${2:-}"
      shift 2
      ;;
    --provider=*)
      PROVIDER="${1#*=}"
      shift
      ;;
    *)
      echo "Opcao desconhecida: $1" >&2
      print_help
      exit 1
      ;;
  esac
done

if [[ "${MODE}" == "check" ]]; then
  check_environment
  exit 0
fi

if [[ "${MODE}" == "verify" ]]; then
  if [[ ${#VERIFY_ARGS[@]} -gt 0 ]]; then
    node "${VERIFY_SCRIPT}" "${VERIFY_ARGS[@]}"
  else
    node "${VERIFY_SCRIPT}"
  fi
  exit 0
fi

if [[ -n "${PROVIDER}" ]]; then
  case "${PROVIDER}" in
    cloudflared)
      if ! command -v cloudflared >/dev/null 2>&1; then
        echo "Erro: cloudflared nao esta instalado no PATH." >&2
        exit 1
      fi
      echo "Iniciando tunel HTTPS via cloudflared para http://localhost:${PORT}..."
      exec cloudflared tunnel --url "http://localhost:${PORT}"
      ;;
    ngrok)
      if ! command -v ngrok >/dev/null 2>&1; then
        echo "Erro: ngrok nao esta instalado no PATH." >&2
        exit 1
      fi
      echo "Iniciando tunel HTTPS via ngrok para porta ${PORT}..."
      exec ngrok http "${PORT}"
      ;;
    ssh)
      if ! command -v ssh >/dev/null 2>&1; then
        echo "Erro: cliente ssh nao esta instalado no PATH." >&2
        exit 1
      fi
      echo "Iniciando tunel HTTPS reverso via localhost.run para http://localhost:${PORT}..."
      echo "Dica: copie a URL publica https://*.lhr.life exibida abaixo para cadastrar https://<url>/api/webhooks/mercadopago no Mercado Pago."
      echo "Importante: NAO abra a URL raiz no navegador durante o next dev (o Next 16 bloqueia /_next/* sem allowedDevOrigins e os bundles de dev esgotam a banda gratuita do localhost.run causando lentidao de 60s)."
      echo "Para testar o tunel em rede sem gastar banda, use:"
      echo "  curl -sS https://<subdominio>/api/status"
      echo "  bash $0 --verify --send --url=https://<subdominio>/api/webhooks/mercadopago"
      exec ssh -o ServerAliveInterval=30 -o StrictHostKeyChecking=accept-new -R "80:localhost:${PORT}" nokey@localhost.run -- --no-qr
      ;;
    *)
      echo "Provedor invalido: ${PROVIDER}. Use cloudflared, ngrok ou ssh." >&2
      exit 1
      ;;
  esac
fi

if command -v cloudflared >/dev/null 2>&1; then
  echo "Provedor detectado automaticamente: cloudflared (porta ${PORT})"
  exec cloudflared tunnel --url "http://localhost:${PORT}"
elif command -v ngrok >/dev/null 2>&1; then
  echo "Provedor detectado automaticamente: ngrok (porta ${PORT})"
  exec ngrok http "${PORT}"
else
  echo "Nenhum binario dedicado de tunel (cloudflared ou ngrok) foi encontrado no PATH."
  echo ""
  echo "Alternativas disponiveis imediatamente:"
  echo "  1. Usar tunel SSH reverso sem instalacao: bash $0 --port ${PORT} --provider ssh"
  echo "  2. Validar payload e assinatura HMAC localmente: bash $0 --verify"
  echo "  3. Instalar cloudflared (recomendado) ou ngrok e executar novamente."
  print_mp_guide
  exit 0
fi

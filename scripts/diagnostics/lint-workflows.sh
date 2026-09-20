#!/usr/bin/env bash
#
# Lint dos arquivos do GitHub Actions com o actionlint.
#
# O actionlint valida sintaxe dos workflows, expressões `${{ }}`, referências
# `needs`, `with:` de workflows reutilizáveis (inclusive locais, resolvidos a
# partir da raiz do repositório), nomes de chaves, shellcheck nos `run:` e
# shell/pyflakes quando disponíveis — coisas que o GitHub só acusa na execução.
#
# Uso:
#   npm run lint:workflows                       # descobre .github/workflows e action.yml
#   npm run lint:workflows -- ci.yml load-tests.yml
#   ./scripts/diagnostics/lint-workflows.sh --format '{{json .}}'
#
# Sem argumentos, o actionlint procura os workflows em `.github/workflows/` e as
# actions compostas em `.github/actions/**/action.y{a,}ml`. Os workflows que
# ainda estão na raiz (`ci.yml`, `load-tests.yml`, `security-tests.yml`) não são
# descobertos: passe-os explicitamente.
#
# O binário é resolvido nesta ordem:
#   1. $ACTIONLINT_BIN
#   2. `actionlint` no PATH
#   3. cache em node_modules/.cache/actionlint
#   4. download da release oficial fixada em ACTIONLINT_VERSION, com verificação
#      de SHA-256 (os hashes abaixo foram conferidos contra a release)
set -euo pipefail

ACTIONLINT_VERSION="1.7.12"
CACHE_DIR="${ACTIONLINT_CACHE_DIR:-node_modules/.cache/actionlint}"

# Diretório raiz do repositório (independe do cwd de quem chama)
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

acao_release() {
  local os arch
  case "$(uname -s)" in
    Linux) os="linux" ;;
    Darwin) os="darwin" ;;
    *) echo "Plataforma não suportada por este script: $(uname -s)." >&2; exit 2 ;;
  esac
  case "$(uname -m)" in
    x86_64 | amd64) arch="amd64" ;;
    arm64 | aarch64) arch="arm64" ;;
    *) echo "Arquitetura não suportada por este script: $(uname -m)." >&2; exit 2 ;;
  esac

  echo "${os}_${arch}"
}

sha_esperado() {
  case "$1" in
    linux_amd64) echo "8aca8db96f1b94770f1b0d72b6dddcb1ebb8123cb3712530b08cc387b349a3d8" ;;
    linux_arm64) echo "325e971b6ba9bfa504672e29be93c24981eeb1c07576d730e9f7c8805afff0c6" ;;
    darwin_amd64) echo "5b44c3bc2255115c9b69e30efc0fecdf498fdb63c5d58e17084fd5f16324c644" ;;
    darwin_arm64) echo "aba9ced2dee8d27fecca3dc7feb1a7f9a52caefa1eb46f3271ea66b6e0e6953f" ;;
    *) echo "" ;;
  esac
}

sha_do_arquivo() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | cut -d' ' -f1
  else
    shasum -a 256 "$1" | cut -d' ' -f1
  fi
}

# O nome do binário em cache carrega a versão: um bump de ACTIONLINT_VERSION
# invalida o cache sozinho, sem risco de rodar um binário antigo silenciosamente.
destino_cache="$CACHE_DIR/actionlint-${ACTIONLINT_VERSION}"

if [ -n "${ACTIONLINT_BIN:-}" ]; then
  bin="$ACTIONLINT_BIN"
elif command -v actionlint >/dev/null 2>&1; then
  bin="$(command -v actionlint)"
elif [ -x "$destino_cache" ]; then
  bin="$destino_cache"
else
  plataforma="$(acao_release)"
  sha_ok="$(sha_esperado "$plataforma")"
  if [ -z "$sha_ok" ]; then
    echo "Sem SHA-256 registrado para '$plataforma' — instale o actionlint e use ACTIONLINT_BIN." >&2
    exit 2
  fi

  asset="actionlint_${ACTIONLINT_VERSION}_${plataforma}.tar.gz"
  url="https://github.com/rhysd/actionlint/releases/download/v${ACTIONLINT_VERSION}/${asset}"
  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir"' EXIT

  echo "actionlint ${ACTIONLINT_VERSION} ausente — baixando ${asset}..." >&2
  curl -fsSL -o "$tmp_dir/$asset" "$url"

  sha_baixado="$(sha_do_arquivo "$tmp_dir/$asset")"
  if [ "$sha_baixado" != "$sha_ok" ]; then
    echo "SHA-256 do download não confere (esperado $sha_ok, obtido $sha_baixado)." >&2
    exit 2
  fi

  mkdir -p "$CACHE_DIR"
  tar -xzf "$tmp_dir/$asset" -C "$tmp_dir" actionlint
  mv "$tmp_dir/actionlint" "$destino_cache"
  chmod +x "$destino_cache"
  bin="$destino_cache"
fi

echo "actionlint $("$bin" --version | head -1) — $bin" >&2
exec "$bin" "$@"

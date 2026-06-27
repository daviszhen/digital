#!/bin/bash
set -e

echo "=== Setting up HTTPS for local development ==="

if ! command -v mkcert &>/dev/null; then
    echo "Installing mkcert..."
    case "$(uname -s)" in
        Darwin)
            brew install mkcert nss
            ;;
        Linux)
            sudo apt-get update -qq && sudo apt-get install -y libnss3-tools
            curl -sL "https://github.com/FiloSottile/mkcert/releases/latest/download/mkcert-linux-amd64" -o /usr/local/bin/mkcert
            sudo chmod +x /usr/local/bin/mkcert
            ;;
    esac
fi

mkcert -install

CERTS_DIR="$(cd "$(dirname "$0")" && pwd)/../certs"
mkdir -p "$CERTS_DIR"

cd "$CERTS_DIR"
mkcert -key-file localhost.key -cert-file localhost.crt localhost 127.0.0.1 ::1

echo ""
echo "=== Done ==="
echo "Start: caddy run --config Caddyfile"
echo "Visit: https://localhost:8443"

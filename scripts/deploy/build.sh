#!/bin/bash
# build.sh - Build do frontend Angular para produção
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"

echo "=== Build do Frontend Angular ==="
cd "$PROJECT_DIR"

echo "Instalando dependências npm..."
npm install

echo ""
echo "Executando build..."
npm run build -- --base-href /h2ia/tutor/ --configuration production

echo ""
echo "=== Build concluído ==="
echo "Output: $PROJECT_DIR/dist/ensinado-aprendizado-maquina/"
ls -la "$PROJECT_DIR/dist/ensinado-aprendizado-maquina/"

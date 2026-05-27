#!/bin/bash
# deploy.sh - Script principal de deploy do frontend
# Faz build do Angular, copia para Nginx e recarrega
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
BACKUP_DIR="$HOME/backups/deploy-frontend-$(date +%Y%m%d-%H%M%S)"

echo "=========================================="
echo "  Deploy H2IA Frontend"
echo "  $(date)"
echo "=========================================="

# ---- Backup ----
echo ""
echo "=== [1/5] Fazendo backup das configurações ==="
mkdir -p "$BACKUP_DIR"

if [ -f /etc/nginx/nginx.conf ]; then
    sudo cp /etc/nginx/nginx.conf "$BACKUP_DIR/nginx.conf"
    echo "  Backup: /etc/nginx/nginx.conf"
fi

echo "  Backups salvos em: $BACKUP_DIR"

# ---- Atualizar código ----
echo ""
echo "=== [2/5] Atualizando código ==="
cd "$PROJECT_DIR"
git pull origin main || git pull origin master

# ---- Build ----
echo ""
echo "=== [3/5] Build do Angular ==="
bash "$SCRIPT_DIR/build.sh"

# ---- Copiar para Nginx ----
echo ""
echo "=== [4/5] Copiando para Nginx ==="
bash "$SCRIPT_DIR/copy-to-nginx.sh"

# ---- Recarregar Nginx ----
echo ""
echo "=== [5/5] Recarregando Nginx ==="
echo "Verificando se location /h2ia/tutor/ existe na config..."

if sudo nginx -T 2>/dev/null | grep -q "location /h2ia/tutor/"; then
    echo "  Location /h2ia/tutor/ encontrado."
    
    # Remover linha commentada anterior se existir
    # (para futuras execuções, pular se já configurado)
else
    echo "  AVISO: location /h2ia/tutor/ não encontrado."
    echo "  Adicione manualmente o bloco do nginx-location.conf ao arquivo de config do absapt.tk"
    echo "  Bloco a adicionar:"
    echo "  ---"
    cat "$SCRIPT_DIR/nginx-location.conf"
    echo "  ---"
fi

echo ""
echo "Testando configuração do Nginx..."
sudo nginx -t

echo ""
echo "Recarregando Nginx..."
sudo systemctl reload nginx

echo ""
echo "=========================================="
echo "  Deploy do frontend concluído!"
echo "  URL: https://absapt.tk/h2ia/tutor/"
echo "=========================================="

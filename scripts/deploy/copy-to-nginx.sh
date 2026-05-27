#!/bin/bash
# copy-to-nginx.sh - Copia build do Angular para diretório servido pelo Nginx
# Trata o subdiretório browser/ do Angular 19+ (application builder)
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
NGINX_DIR="/var/www/h2ia/tutor"

echo "=== Copiando build para Nginx ==="

sudo mkdir -p "$NGINX_DIR"
sudo rm -rf "$NGINX_DIR"/*

# Angular 19+ com application builder coloca os arquivos em dist/<project>/browser/
BUILD_DIR="$PROJECT_DIR/dist/ensinado-aprendizado-maquina"
if [ -d "$BUILD_DIR/browser" ]; then
    echo "Detectado build application (Angular 19+), usando subdiretório browser/"
    sudo cp -r "$BUILD_DIR/browser/"* "$NGINX_DIR/"
else
    sudo cp -r "$BUILD_DIR/"* "$NGINX_DIR/"
fi

sudo chown -R ubuntu:ubuntu /var/www/h2ia

echo "Arquivos copiados para $NGINX_DIR:"
ls -la "$NGINX_DIR"

echo ""
echo "=== Cópia concluída ==="

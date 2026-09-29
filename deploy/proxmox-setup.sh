#!/usr/bin/env bash
# ==============================================================================
# goroTV - Script de Aprovisionamiento Automático en Proxmox VE (LXC + Docker)
# ==============================================================================
# Este script se ejecuta en el host Proxmox VE para crear y configurar
# automáticamente el contenedor LXC con Docker, goroTV y Cloudflare Tunnel.
# ==============================================================================

set -euo pipefail

# Colores para salida en terminal
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}====================================================${NC}"
echo -e "${GREEN}        goroTV - Aprovisionador Proxmox LXC        ${NC}"
echo -e "${BLUE}====================================================${NC}"

# 1. Verificar si se ejecuta en Proxmox VE
if ! command -v pveversion &> /dev/null; then
    echo -e "${RED}[ERROR] Este script debe ejecutarse directamente en un nodo Proxmox VE.${NC}"
    exit 1
fi

# 2. Parámetros del Contenedor LXC
CTID=${1:-200}
STORAGE=${2:-local-lvm}
MEMORY=${3:-1024}
SWAP=${4:-512}
CORES=${5:-2}
DISK_SIZE=${6:-12G}
BRIDGE=${7:-vmbr0}

echo -e "${YELLOW}Configurando LXC ID: ${CTID} (RAM: ${MEMORY}MB, Cores: ${CORES}, Disco: ${DISK_SIZE})${NC}"

# 3. Comprobar si el ID ya existe
if pct status "${CTID}" &> /dev/null; then
    echo -e "${RED}[ALERTA] Ya existe un contenedor con ID ${CTID}.${NC}"
    read -rp "¿Deseas destruirlo y recrearlo? (s/N): " CONFIRM
    if [[ "$CONFIRM" =~ ^[sS]$ ]]; then
        echo -e "${YELLOW}Deteniendo y eliminando CT ${CTID}...${NC}"
        pct stop "${CTID}" || true
        pct destroy "${CTID}"
    else
        echo -e "${BLUE}Cancelado por el usuario.${NC}"
        exit 0
    fi
fi

# 4. Descargar plantilla Debian 12 si no existe
TEMPLATE_STORAGE="local"
TEMPLATE_NAME="debian-12-standard_12.7-1_amd64.tar.zst"

echo -e "${BLUE}[1/5] Verificando plantilla de Debian 12...${NC}"
pveam update
if ! pveam list "${TEMPLATE_STORAGE}" | grep -q "debian-12"; then
    echo -e "${YELLOW}Descargando plantilla Debian 12...${NC}"
    pveam download "${TEMPLATE_STORAGE}" debian-12-standard_12.7-1_amd64.tar.zst
fi

# Obtener nombre exacto de la plantilla descargada
TEMPLATE_FILE=$(pveam list "${TEMPLATE_STORAGE}" | grep "debian-12" | head -n1 | awk '{print $1}')

# 5. Crear el contenedor LXC
echo -e "${BLUE}[2/5] Creando contenedor LXC ${CTID}...${NC}"
pct create "${CTID}" "${TEMPLATE_FILE}" \
    --ostype debian \
    --hostname gorotv-server \
    --cores "${CORES}" \
    --memory "${MEMORY}" \
    --swap "${SWAP}" \
    --storage "${STORAGE}" \
    --rootfs "${STORAGE}:${DISK_SIZE}" \
    --net0 "name=eth0,bridge=${BRIDGE},ip=dhcp,firewall=1" \
    --unprivileged 1 \
    --features "nesting=1,keyctl=1" \
    --onboot 1

# 6. Iniciar el contenedor
echo -e "${BLUE}[3/5] Iniciando contenedor LXC...${NC}"
pct start "${CTID}"
sleep 8

# 7. Instalar Docker y dependencias dentro del LXC
echo -e "${BLUE}[4/5] Instalando Docker y Docker Compose en el LXC...${NC}"
pct exec "${CTID}" -- bash -c '
    apt-get update && apt-get install -y \
        ca-certificates \
        curl \
        gnupg \
        git \
        nano \
        lsb-release

    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc

    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

    apt-get update && apt-get install -y \
        docker-ce \
        docker-ce-cli \
        containerd.io \
        docker-buildx-plugin \
        docker-compose-plugin

    systemctl enable docker
    systemctl start docker
'

# 8. Despliegue de goroTV en /opt/gorotv
echo -e "${BLUE}[5/5] Preparando directorio de despliegue en /opt/gorotv...${NC}"
pct exec "${CTID}" -- bash -c '
    mkdir -p /opt/gorotv/data
'

# Obtener IP del contenedor
CT_IP=$(pct exec "${CTID}" -- hostname -I | awk '{print $1}')

echo -e "${GREEN}====================================================${NC}"
echo -e "${GREEN}  ✓ Contenedor LXC ${CTID} configurado con éxito!    ${NC}"
echo -e "${GREEN}  IP asignada: ${CT_IP}                             ${NC}"
echo -e "${GREEN}====================================================${NC}"
echo -e "Para transferir el proyecto y levantarlo:"
echo -e "1. Copia el proyecto al contenedor: ${BLUE}scp -r ./* root@${CT_IP}:/opt/gorotv/${NC}"
echo -e "2. Entra al contenedor: ${BLUE}pct enter ${CTID}${NC}"
echo -e "3. Entra a la carpeta: ${BLUE}cd /opt/gorotv${NC}"
echo -e "4. Edita el token de Cloudflare en .env y ejecuta: ${GREEN}docker compose -f deploy/docker-compose.yml up -d --build${NC}"

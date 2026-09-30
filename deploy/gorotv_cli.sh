#!/usr/bin/env bash
# ==============================================================================
# CLI de Gestion y Despliegue Inmediato de goroTV en Proxmox LXC
# ==============================================================================

set -e
PROJECT_DIR="/opt/gorotv"
COMPOSE_FILE="$PROJECT_DIR/deploy/docker-compose.yml"

case "$1" in
    deploy|build|update)
        echo "==> Reconstruyendo y publicando cambios en goroTV..."
        cd "$PROJECT_DIR"
        docker compose -f "$COMPOSE_FILE" up -d --build
        echo ""
        echo "✓ Cambios reflejados y publicados con éxito!"
        echo "  - App Cliente:   http://$(hostname -I | awk '{print $1}')/ y en el túnel"
        echo "  - Panel Admin:   http://$(hostname -I | awk '{print $1}')/admin/ y en el túnel"
        ;;
    pull)
        echo "==> Descargando últimos cambios desde GitHub y desplegando..."
        cd "$PROJECT_DIR"
        git pull origin main
        docker compose -f "$COMPOSE_FILE" up -d --build
        echo "✓ Actualización completada y en línea."
        ;;
    logs)
        cd "$PROJECT_DIR"
        docker compose -f "$COMPOSE_FILE" logs -f "${2:-}"
        ;;
    status)
        cd "$PROJECT_DIR"
        echo "=== Estado de los Contenedores ==="
        docker compose -f "$COMPOSE_FILE" ps
        echo ""
        echo "=== Estado de Cloudflare Tunnel ==="
        docker logs --tail 8 gorotv_tunnel 2>&1 | grep -E "Registered tunnel|protocol|SUMMARY" || true
        ;;
    restart)
        echo "==> Reiniciando servicios..."
        cd "$PROJECT_DIR"
        docker compose -f "$COMPOSE_FILE" restart
        echo "✓ Servicios reiniciados."
        ;;
    stop)
        cd "$PROJECT_DIR"
        docker compose -f "$COMPOSE_FILE" stop
        ;;
    start)
        cd "$PROJECT_DIR"
        docker compose -f "$COMPOSE_FILE" start
        ;;
    *)
        echo "=========================================================="
        echo "         goroTV - Herramienta de Gestión LXC              "
        echo "=========================================================="
        echo "Uso: gorotv <comando>"
        echo ""
        echo "Comandos disponibles:"
        echo "  gorotv deploy   -> Compila y publica cualquier cambio hecho en /opt/gorotv"
        echo "  gorotv pull     -> Descarga cambios de GitHub y los publica automáticamente"
        echo "  gorotv status   -> Muestra el estado de la API, Nginx y el Túnel Cloudflare"
        echo "  gorotv logs     -> Muestra logs en vivo (ej. 'gorotv logs' o 'gorotv logs api')"
        echo "  gorotv restart  -> Reinicia los contenedores"
        echo "=========================================================="
        ;;
esac

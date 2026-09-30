import paramiko
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

PROXMOX_IP = "192.168.2.244"
PROXMOX_USER = "root"
PROXMOX_PASS = "3edcVFR$"
CTID = "200"

def run_remote(ssh, bash_cmd, title=""):
    print(f"\n==========================================")
    print(f"[PASO] {title}")
    print(f"==========================================")
    full_cmd = f"pct exec {CTID} -- bash -c '{bash_cmd}'"
    stdin, stdout, stderr = ssh.exec_command(full_cmd, get_pty=True)
    for line in iter(stdout.readline, ""):
        print(line, end="")
    exit_code = stdout.channel.recv_exit_status()
    if exit_code != 0:
        print(f"\n[ALERTA] Código de salida: {exit_code}")
    return exit_code

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"Conectando a Proxmox VE ({PROXMOX_IP})...")
    ssh.connect(PROXMOX_IP, port=22, username=PROXMOX_USER, password=PROXMOX_PASS)

    # 1. Configurar servicio systemd para autoarranque absoluto
    systemd_unit = """[Unit]
Description=goroTV IPTV Stack (API, Web Nginx and Cloudflare Tunnel)
Requires=docker.service
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/gorotv
ExecStart=/usr/bin/docker compose -f /opt/gorotv/deploy/docker-compose.yml up -d
ExecStop=/usr/bin/docker compose -f /opt/gorotv/deploy/docker-compose.yml down
ExecReload=/usr/bin/docker compose -f /opt/gorotv/deploy/docker-compose.yml up -d --build

[Install]
WantedBy=multi-user.target
"""
    cmd1 = f"cat << 'EOF' > /etc/systemd/system/gorotv.service\n{systemd_unit}EOF\nsystemctl daemon-reload && systemctl enable gorotv.service"
    run_remote(ssh, cmd1, "Creando y habilitando servicio systemd gorotv.service para arranque automático 24/7")

    # 2. Crear comando CLI global /usr/local/bin/gorotv
    cli_tool = """#!/usr/bin/env bash
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
        docker compose -f "$COMPOSE_FILE" logs -f ${2:-}
        ;;
    status)
        cd "$PROJECT_DIR"
        echo "=== Estado de los Contenedores ==="
        docker compose -f "$COMPOSE_FILE" ps
        echo ""
        echo "=== Estado de Cloudflare Tunnel ==="
        docker logs --tail 10 gorotv_tunnel 2>&1 | grep -E "Registered tunnel|protocol|SUMMARY" || true
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
"""
    cmd2 = f"cat << 'EOF' > /usr/local/bin/gorotv\n{cli_tool}EOF\nchmod +x /usr/local/bin/gorotv"
    run_remote(ssh, cmd2, "Instalando herramienta CLI global /usr/local/bin/gorotv")

    # 3. Probar comando 'gorotv status'
    cmd3 = "gorotv status"
    run_remote(ssh, cmd3, "Probando comando de estado 'gorotv status'")

    ssh.close()
    print("\n=======================================================")
    print("  ✓ AUTOARRANQUE Y GESTIÓN EN LXC CONFIGURADOS AL 100% ")
    print("=======================================================")

if __name__ == "__main__":
    main()

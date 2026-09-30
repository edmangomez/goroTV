import paramiko
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

PROXMOX_IP = "192.168.2.244"
PROXMOX_USER = "root"
PROXMOX_PASS = "3edcVFR$"
CTID = "200"
TOKEN = "eyJhIjoiYjhhZDBhMDYwMjRkZWVkYzMyZTUxYTU1MjBlZWMwMWUiLCJ0IjoiNGE2M2JiYjAtMDIyYi00OGI2LWE1MjQtZjQ5ZmNiYWUyMTBlIiwicyI6Ik5tUmxNR1JtTURBdE56QXhNeTAwWlRKa0xXSmpZemN0WkdFM09UQTFPRGxoWlRBMiJ9"

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
    ssh.connect(PROXMOX_IP, port=22, username=PROXMOX_USER, password=PROXMOX_PASS)

    # 1. Copiar .env a deploy/.env para que Docker Compose lo tome
    step1 = "cp /opt/gorotv/.env /opt/gorotv/deploy/.env"
    run_remote(ssh, step1, "Copiando .env a deploy/.env")

    # 2. Reiniciar el contenedor cloudflared en Docker
    step2 = "cd /opt/gorotv && docker compose -f deploy/docker-compose.yml up -d cloudflared"
    run_remote(ssh, step2, "Reiniciando contenedor gorotv_tunnel con el token cargado")

    # 3. Instalar cloudflared nativo en Debian como servicio permanente del sistema
    step3 = (
        "mkdir -p --mode=0755 /usr/share/keyrings && "
        "curl -fsSL https://pkg.cloudflare.com/cloudflare-public-v2.gpg | tee /usr/share/keyrings/cloudflare-public-v2.gpg >/dev/null && "
        "echo 'deb [signed-by=/usr/share/keyrings/cloudflare-public-v2.gpg] https://pkg.cloudflare.com/cloudflared any main' | tee /etc/apt/sources.list.d/cloudflared.list && "
        "apt-get update && apt-get install -y cloudflared && "
        f"cloudflared service install {TOKEN} || true && "
        "systemctl daemon-reload && systemctl enable cloudflared && systemctl restart cloudflared"
    )
    run_remote(ssh, step3, "Instalando servicio nativo cloudflared en Debian 12")

    # 4. Comprobar estado de cloudflared
    step4 = "systemctl is-active cloudflared; docker compose -f /opt/gorotv/deploy/docker-compose.yml ps"
    run_remote(ssh, step4, "Verificando estado de cloudflared y Docker")

    ssh.close()
    print("\n✓ Configuración del túnel Cloudflare completada exitosamente.")

if __name__ == "__main__":
    main()

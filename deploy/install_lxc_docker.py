import paramiko
import sys
import io

# Forzar UTF-8 en salida estándar para evitar errores de charmap en Windows
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
        print(f"\n[ERROR] El comando falló con código {exit_code}")
        sys.exit(exit_code)
    return exit_code

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"Conectando a Proxmox VE ({PROXMOX_IP})...")
    ssh.connect(PROXMOX_IP, port=22, username=PROXMOX_USER, password=PROXMOX_PASS)
    print("Conexión SSH establecida.")

    # 1. Terminar configuración de paquetes pendientes si quedaron a medio camino
    step1 = (
        "export DEBIAN_FRONTEND=noninteractive && "
        "dpkg --configure -a && "
        "apt-get install -y ca-certificates curl gnupg git nano lsb-release"
    )
    run_remote(ssh, step1, "Comprobando paquetes base (curl, git, gnupg, etc.)")

    # 2. Configurar repositorio de Docker oficial
    step2 = (
        "install -m 0755 -d /etc/apt/keyrings && "
        "curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc && "
        "chmod a+r /etc/apt/keyrings/docker.asc && "
        "echo \"deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian bookworm stable\" > /etc/apt/sources.list.d/docker.list && "
        "apt-get update"
    )
    run_remote(ssh, step2, "Configurando repositorio oficial de Docker CE")

    # 3. Instalar Docker CE y Docker Compose
    step3 = (
        "export DEBIAN_FRONTEND=noninteractive && "
        "apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin && "
        "systemctl enable docker && "
        "systemctl start docker && "
        "docker --version && "
        "docker compose version"
    )
    run_remote(ssh, step3, "Instalando e iniciando Docker CE y Docker Compose")

    # 4. Clonar el repositorio de GitHub en /opt/gorotv
    step4 = (
        "rm -rf /opt/gorotv && "
        "git clone https://github.com/edmangomez/goroTV.git /opt/gorotv && "
        "mkdir -p /opt/gorotv/data"
    )
    run_remote(ssh, step4, "Clonando repositorio de GitHub en /opt/gorotv")

    # 5. Configurar el archivo .env de producción
    token = "eyJhIjoiYjhhZDBhMDYwMjRkZWVkYzMyZTUxYTU1MjBlZWMwMWUiLCJ0IjoiNGE2M2JiYjAtMDIyYi00OGI2LWE1MjQtZjQ5ZmNiYWUyMTBlIiwicyI6Ik5tUmxNR1JtTURBdE56QXhNeTAwWlRKa0xXSmpZemN0WkdFM09UQTFPRGxoWlRBMiJ9"
    env_content = (
        "PORT=3001\\n"
        "NODE_ENV=production\\n"
        "JWT_SECRET=gorotv_super_secret_jwt_key_production_2026_lxc\\n"
        "ENCRYPTION_KEY=gorotv_aes256_secret_key_32chars!\\n"
        "DATABASE_PATH=/app/data/gorotv.sqlite\\n"
        f"CLOUDFLARE_TUNNEL_TOKEN={token}\\n"
    )
    step5 = f"printf \"{env_content}\" > /opt/gorotv/.env"
    run_remote(ssh, step5, "Configurando archivo .env con el token de Cloudflare")

    # 6. Levantar contenedores con Docker Compose
    step6 = "cd /opt/gorotv && docker compose -f deploy/docker-compose.yml up -d --build"
    run_remote(ssh, step6, "Compilando y levantando contenedores Docker (API, Nginx y Cloudflared)")

    # 7. Verificación de estado de los contenedores
    step7 = "cd /opt/gorotv && docker compose -f deploy/docker-compose.yml ps"
    run_remote(ssh, step7, "Verificando contenedores en ejecución")

    # 8. Test de salud
    step8 = "curl -i http://localhost/api/health"
    run_remote(ssh, step8, "Probando endpoint de salud de la API localmente en el LXC")

    ssh.close()
    print("\n=======================================================")
    print("  ✓ DESPLIEGUE COMPLETO Y OPERATIVO EN PROXMOX LXC 200 ")
    print("=======================================================")

if __name__ == "__main__":
    main()

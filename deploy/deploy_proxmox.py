import paramiko
import time
import sys

PROXMOX_IP = "192.168.2.244"
PROXMOX_USER = "root"
PROXMOX_PASS = "3edcVFR$"
CTID = "200"
STORAGE = "local-zfs"
BRIDGE = "vmbr1"
RAM = "2048"
SWAP = "512"
CORES = "2"
DISK = "16G"
CLOUDFLARE_TOKEN = "eyJhIjoiYjhhZDBhMDYwMjRkZWVkYzMyZTUxYTU1MjBlZWMwMWUiLCJ0IjoiNGE2M2JiYjAtMDIyYi00OGI2LWE1MjQtZjQ5ZmNiYWUyMTBlIiwicyI6Ik5tUmxNR1JtTURBdE56QXhNeTAwWlRKa0xXSmpZemN0WkdFM09UQTFPRGxoWlRBMiJ9"
GIT_REPO = "https://github.com/edmangomez/goroTV.git"

def run_cmd(ssh, cmd, title=None, check=True):
    if title:
        print(f"\n[>>>] {title}...")
    stdin, stdout, stderr = ssh.exec_command(cmd, get_pty=True)
    out = ""
    for line in iter(stdout.readline, ""):
        print(line, end="")
        out += line
    exit_code = stdout.channel.recv_exit_status()
    if check and exit_code != 0:
        err = stderr.read().decode()
        print(f"[ERROR] Código de salida {exit_code}: {err}")
        raise RuntimeError(f"Fallo en comando: {cmd}")
    return out

def main():
    print("====================================================")
    print("   goroTV - Despliegue Automatizado en Proxmox VE   ")
    print("====================================================")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"Conectando a Proxmox VE ({PROXMOX_IP})...")
    ssh.connect(PROXMOX_IP, port=22, username=PROXMOX_USER, password=PROXMOX_PASS)
    print("Conexión SSH exitosa con el nodo Proxmox.")

    # 1. Comprobar si el CTID 200 ya existe
    check_ct = run_cmd(ssh, f"pct status {CTID} || true", "Verificando si CTID ya existe", check=False)
    if "status:" in check_ct:
        print(f"El contenedor {CTID} ya existe. Deteniendo y eliminando para recreación limpia...")
        run_cmd(ssh, f"pct stop {CTID} || true", check=False)
        time.sleep(2)
        run_cmd(ssh, f"pct destroy {CTID}", "Destruyendo CT anterior")

    # 2. Localizar plantilla Debian 12
    tpl_out = run_cmd(ssh, "pveam list local | grep debian-12 | head -n1 | awk '{print $1}'", "Localizando plantilla Debian 12")
    template = tpl_out.strip()
    if not template:
        print("Descargando plantilla Debian 12 standard...")
        run_cmd(ssh, "pveam update && pveam download local debian-12-standard_12.12-1_amd64.tar.zst")
        template = "local:vztmpl/debian-12-standard_12.12-1_amd64.tar.zst"
    print(f"Usando plantilla: {template}")

    # 3. Crear el contenedor LXC con Docker nesting y keyctl habilitados
    create_cmd = (
        f"pct create {CTID} {template} "
        f"--ostype debian "
        f"--hostname gorotv "
        f"--cores {CORES} "
        f"--memory {RAM} "
        f"--swap {SWAP} "
        f"--storage {STORAGE} "
        f"--rootfs {STORAGE}:{DISK} "
        f"--net0 name=eth0,bridge={BRIDGE},ip=dhcp,firewall=1 "
        f"--unprivileged 1 "
        f"--features nesting=1,keyctl=1 "
        f"--onboot 1"
    )
    run_cmd(ssh, create_cmd, f"Creando contenedor LXC {CTID}")

    # 4. Iniciar contenedor
    run_cmd(ssh, f"pct start {CTID}", "Iniciando contenedor LXC")
    print("Esperando asignación de red DHCP...")
    time.sleep(8)

    # 5. Obtener IP del LXC
    ip_out = run_cmd(ssh, f"pct exec {CTID} -- hostname -I", "Obteniendo IP asignada al LXC")
    ct_ip = ip_out.strip().split()[0] if ip_out.strip() else "Desconocida"
    print(f"✓ IP asignada al LXC: {ct_ip}")

    # 6. Instalar Docker y dependencias en el LXC
    install_docker_script = (
        "apt-get update && apt-get install -y ca-certificates curl gnupg git nano lsb-release && "
        "install -m 0755 -d /etc/apt/keyrings && "
        "curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc && "
        "chmod a+r /etc/apt/keyrings/docker.asc && "
        'echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null && '
        "apt-get update && apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin && "
        "systemctl enable docker && systemctl start docker"
    )
    run_cmd(ssh, f"pct exec {CTID} -- bash -c '{install_docker_script}'", "Instalando Docker y herramientas en el LXC (esto toma ~40s)")

    # 7. Clonar repositorio GitHub en /opt/gorotv
    clone_script = (
        f"rm -rf /opt/gorotv && "
        f"git clone {GIT_REPO} /opt/gorotv && "
        f"mkdir -p /opt/gorotv/data"
    )
    run_cmd(ssh, f"pct exec {CTID} -- bash -c '{clone_script}'", f"Clonando {GIT_REPO} en /opt/gorotv")

    # 8. Configurar .env de producción
    env_content = (
        f"PORT=3001\\n"
        f"NODE_ENV=production\\n"
        f"JWT_SECRET=gorotv_super_secret_jwt_key_production_2026_lxc\\n"
        f"ENCRYPTION_KEY=gorotv_aes256_secret_key_32chars!\\n"
        f"DATABASE_PATH=/app/data/gorotv.sqlite\\n"
        f"CLOUDFLARE_TUNNEL_TOKEN={CLOUDFLARE_TOKEN}\\n"
    )
    run_cmd(ssh, f"pct exec {CTID} -- bash -c 'printf \"{env_content}\" > /opt/gorotv/.env'", "Configurando variables de entorno de producción en .env")

    # 9. Levantar Docker Compose
    up_cmd = "cd /opt/gorotv && docker compose -f deploy/docker-compose.yml up -d --build"
    run_cmd(ssh, f"pct exec {CTID} -- bash -c '{up_cmd}'", "Compilando y levantando contenedores con Docker Compose (API, Nginx y Cloudflared)")

    # 10. Verificar estado
    status_cmd = "cd /opt/gorotv && docker compose -f deploy/docker-compose.yml ps"
    run_cmd(ssh, f"pct exec {CTID} -- bash -c '{status_cmd}'", "Verificando contenedores en ejecución")

    # 11. Test local del API
    health_cmd = "curl -s http://localhost/api/health || true"
    health_out = run_cmd(ssh, f"pct exec {CTID} -- bash -c '{health_cmd}'", "Health Check de la API", check=False)
    print(f"Respuesta API Health: {health_out}")

    print("\n====================================================")
    print("  ✓ DESPLIEGUE FINALIZADO EXITOSAMENTE EN PROXMOX  ")
    print(f"  ID Contenedor: {CTID}")
    print(f"  IP Interna:    {ct_ip}")
    print(f"  Directorio:    /opt/gorotv (con Git)")
    print("====================================================")
    ssh.close()

if __name__ == '__main__':
    main()

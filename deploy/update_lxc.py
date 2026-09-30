import paramiko
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

PROXMOX_IP = "192.168.2.244"
PROXMOX_USER = "root"
PROXMOX_PASS = "3edcVFR$"
CTID = "200"

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"Conectando a Proxmox VE ({PROXMOX_IP})...")
    ssh.connect(PROXMOX_IP, port=22, username=PROXMOX_USER, password=PROXMOX_PASS)

    cmd = "pct exec 200 -- bash -c 'cd /opt/gorotv && git pull && docker compose -f deploy/docker-compose.yml up -d --build web'"
    print("Actualizando código desde GitHub y reconstruyendo contenedor web...")
    stdin, stdout, stderr = ssh.exec_command(cmd, get_pty=True)
    for line in iter(stdout.readline, ""):
        print(line, end="")
    exit_code = stdout.channel.recv_exit_status()
    print("\nCódigo de salida:", exit_code)
    ssh.close()

if __name__ == "__main__":
    main()

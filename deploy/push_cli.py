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
    # Leer archivo local y asegurar terminaciones LF (Linux)
    with open("c:/proyectos/iptv_new/deploy/gorotv_cli.sh", "rb") as f:
        content = f.read().replace(b"\r\n", b"\n")

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(PROXMOX_IP, port=22, username=PROXMOX_USER, password=PROXMOX_PASS)

    sftp = ssh.open_sftp()
    with sftp.file("/tmp/gorotv", "wb") as f:
        f.write(content)
    sftp.close()

    cmds = [
        f"pct push {CTID} /tmp/gorotv /usr/local/bin/gorotv",
        f"pct exec {CTID} -- chmod +x /usr/local/bin/gorotv",
        f"pct exec {CTID} -- /usr/local/bin/gorotv status"
    ]

    for cmd in cmds:
        print(f"\n[RUN] {cmd}")
        stdin, stdout, stderr = ssh.exec_command(cmd, get_pty=True)
        for line in iter(stdout.readline, ""):
            print(line, end="")
        exit_code = stdout.channel.recv_exit_status()
        if exit_code != 0:
            print(f"[ERROR] Código {exit_code}")

    ssh.close()
    print("\n✓ Comando 'gorotv' listo y funcional.")

if __name__ == "__main__":
    main()

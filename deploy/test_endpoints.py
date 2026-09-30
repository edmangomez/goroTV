import urllib.request
import re

html = urllib.request.urlopen("http://192.168.2.240/admin/").read().decode("utf-8")
print("HTML Header:\n", html[:400])

scripts = re.findall(r'src="([^"]+)"', html)
styles = re.findall(r'href="([^"]+\.css)"', html)

for path in scripts + styles:
    if path.startswith("/"):
        full_url = f"http://192.168.2.240{path}"
    else:
        full_url = f"http://192.168.2.240/admin/{path}"
    res = urllib.request.urlopen(full_url)
    print(f"Asset OK: {full_url} -> Status {res.status} (bytes: {len(res.read())})")

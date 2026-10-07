#!/usr/bin/env bash
set -euo pipefail

ISO=${1:?usage: qemu-boot-smoke.sh ISO bios|uefi normal|safe}
FIRMWARE=${2:?firmware must be bios or uefi}
PROFILE=${3:?profile must be normal or safe}
OUT_DIR=${4:-test-results/qemu-boot}
mkdir -p "$OUT_DIR"
[[ -s "$ISO" ]] || { echo "ISO is missing or empty: $ISO" >&2; exit 2; }
[[ "$FIRMWARE" == bios || "$FIRMWARE" == uefi ]] || exit 2
[[ "$PROFILE" == normal || "$PROFILE" == safe ]] || exit 2
command -v qemu-system-x86_64 >/dev/null || { echo 'qemu-system-x86_64 is required.' >&2; exit 2; }
command -v xvfb-run >/dev/null || { echo 'xvfb-run is required for headless graphical boot validation.' >&2; exit 2; }

NAME="${FIRMWARE}-${PROFILE}"
MONITOR="$OUT_DIR/${NAME}.monitor"
SERIAL="$OUT_DIR/${NAME}.serial.log"
SCREEN="$OUT_DIR/${NAME}.ppm"
rm -f "$MONITOR" "$SERIAL" "$SCREEN"
QEMU=(qemu-system-x86_64 -cpu qemu64 -smp 2 -m 4096 -cdrom "$ISO" -boot order=d -nic none -display gtk,gl=off -serial "file:$SERIAL" -monitor "unix:$MONITOR,server,nowait" -no-reboot)
if [[ "$FIRMWARE" == uefi ]]; then
  CODE=$(find /usr/share/OVMF -maxdepth 1 -type f \( -name 'OVMF_CODE_4M.secboot.fd' -o -name 'OVMF_CODE.secboot.fd' \) -print -quit)
  VARS_TEMPLATE=$(find /usr/share/OVMF -maxdepth 1 -type f \( -name 'OVMF_VARS_4M.ms.fd' -o -name 'OVMF_VARS.ms.fd' \) -print -quit)
  [[ -n "$CODE" && -n "$VARS_TEMPLATE" ]] || { echo 'Signed OVMF firmware files were not found.' >&2; exit 2; }
  VARS="$OUT_DIR/${NAME}.vars.fd"
  cp "$VARS_TEMPLATE" "$VARS"
  QEMU+=(-machine q35,smm=on -drive "if=pflash,format=raw,readonly=on,file=$CODE" -drive "if=pflash,format=raw,file=$VARS")
else
  QEMU+=(-machine pc,accel=tcg)
fi
xvfb-run -a "${QEMU[@]}" &
PID=$!
cleanup() {
  if kill -0 "$PID" 2>/dev/null; then
    python3 - "$MONITOR" quit <<'PY' || true
import socket, sys, time
s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
s.settimeout(2)
try:
    s.connect(sys.argv[1]); time.sleep(.2); s.sendall((sys.argv[2] + "\r\n").encode()); time.sleep(.2)
except OSError:
    pass
finally:
    s.close()
PY
    wait "$PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT
for _ in $(seq 1 30); do [[ -S "$MONITOR" ]] && break; sleep 1; done
[[ -S "$MONITOR" ]] || { echo 'QEMU monitor did not start.' >&2; exit 1; }
sleep 5
if [[ "$PROFILE" == safe ]]; then
  python3 - "$MONITOR" <<'PY'
import socket, sys, time
s=socket.socket(socket.AF_UNIX, socket.SOCK_STREAM); s.settimeout(5); s.connect(sys.argv[1]); time.sleep(.4); s.recv(4096)
for key in ("down", "ret"):
    s.sendall(("sendkey " + key + "\r\n").encode()); time.sleep(.5); s.recv(4096)
s.close()
PY
else
  python3 - "$MONITOR" <<'PY'
import socket, sys, time
s=socket.socket(socket.AF_UNIX, socket.SOCK_STREAM); s.settimeout(5); s.connect(sys.argv[1]); time.sleep(.4); s.recv(4096); s.sendall(b"sendkey ret\r\n"); time.sleep(.5); s.close()
PY
fi
for _ in $(seq 1 300); do
  if grep -Fq 'CENTIPEDE_DESKTOP_READY' "$SERIAL" 2>/dev/null; then
    python3 - "$MONITOR" "$SCREEN" <<'PY'
import socket, sys, time
s=socket.socket(socket.AF_UNIX, socket.SOCK_STREAM); s.settimeout(5); s.connect(sys.argv[1]); time.sleep(.3); s.recv(4096); s.sendall(("screendump " + sys.argv[2] + "\r\n").encode()); time.sleep(1); s.close()
PY
    [[ -s "$SCREEN" ]] || { echo 'QEMU did not capture its booted desktop.' >&2; exit 1; }
    if [[ "$PROFILE" == safe ]]; then
      grep -Fq 'CENTIPEDE_SAFE_GRAPHICS_ENABLED: nomodeset is active' "$SERIAL" || { echo 'Safe Graphics boot did not activate nomodeset.' >&2; exit 1; }
    else
      grep -Fq 'CENTIPEDE_STANDARD_GRAPHICS_BOOT: nomodeset is absent' "$SERIAL" || { echo 'Normal boot did not retain kernel graphics modesetting.' >&2; exit 1; }
    fi
    echo "PASS: $NAME reached CENTIPEDE_DESKTOP_READY and saved $SCREEN"
    exit 0
  fi
  kill -0 "$PID" 2>/dev/null || break
  sleep 1
done
cat "$SERIAL" 2>/dev/null || true
echo "FAIL: $NAME did not reach CENTIPEDE_DESKTOP_READY within 180 seconds." >&2
exit 1

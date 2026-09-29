#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="$(node -p "require('${ROOT}/package.json').version")"
CONFIG="${ROOT}/packaging/live-build/config"
BUILD="${ROOT}/build/live"
OUT="${ROOT}/release"

for tool in lb qemu-img; do
  command -v "$tool" >/dev/null || { echo "Missing required build tool: $tool" >&2; exit 2; }
done

npm --prefix "$ROOT" run build
rm -rf "$BUILD"
mkdir -p "$BUILD/config/includes.chroot/opt/centipede/web" "$OUT/iso" "$OUT/live-usb" "$OUT/vm"
cp -a "$CONFIG/." "$BUILD/config/"
cp -a "$ROOT/dist/." "$BUILD/config/includes.chroot/opt/centipede/web/"
chmod +x "$BUILD/config/hooks/normal/0100-centipede-systemd.hook.chroot"

cd "$BUILD"
lb config \
  --mode debian \
  --distribution bookworm \
  --architectures amd64 \
  --archive-areas "main contrib non-free-firmware" \
  --binary-images iso-hybrid \
  --debian-installer none \
  --mirror-bootstrap https://deb.debian.org/debian \
  --mirror-chroot https://deb.debian.org/debian \
  --mirror-chroot-security https://security.debian.org/debian-security \
  --mirror-binary https://deb.debian.org/debian \
  --mirror-binary-security https://security.debian.org/debian-security \
  --security false \
  --bootappend-live "boot=live components username=centipede hostname=centipede console=ttyS0,115200n8"
lb build

ISO_SOURCE="${BUILD}/live-image-amd64.hybrid.iso"
test -s "$ISO_SOURCE"
ISO_NAME="centipede-os-${VERSION}-x86_64.iso"
USB_NAME="centipede-os-${VERSION}-live-usb-x86_64.iso"
QCOW_NAME="centipede-os-${VERSION}-x86_64.qcow2"
cp "$ISO_SOURCE" "$OUT/iso/$ISO_NAME"
cp "$ISO_SOURCE" "$OUT/live-usb/$USB_NAME"
qemu-img convert -f raw -O qcow2 "$ISO_SOURCE" "$OUT/vm/$QCOW_NAME"
qemu-img check "$OUT/vm/$QCOW_NAME"
qemu-img info --output=json "$OUT/vm/$QCOW_NAME" > "$OUT/vm/${QCOW_NAME}.info.json"
file "$ISO_SOURCE" "$OUT/vm/$QCOW_NAME"



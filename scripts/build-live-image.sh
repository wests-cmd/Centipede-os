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
find "$BUILD/config" -type d -name __pycache__ -prune -exec rm -rf {} +
find "$BUILD/config" -type f -name '*.py[co]' -delete
cp -a "$ROOT/dist/." "$BUILD/config/includes.chroot/opt/centipede/web/"
mkdir -p "$BUILD/config/includes.chroot/etc/centipede"
printf '%s\n' "$VERSION" > "$BUILD/config/includes.chroot/etc/centipede/version"
sed -i "s/@CENTIPEDE_VERSION@/${VERSION}/g" "$BUILD/config/includes.chroot/etc/calamares/branding/centipede/branding.desc"
chmod +x "$BUILD/config/hooks/normal/0100-centipede-systemd.hook.chroot" "$BUILD/config/hooks/normal/0200-centipede-identity.hook.chroot" "$BUILD/config/hooks/normal/0300-centipede-boot-menu.hook.binary" "$BUILD/config/hooks/normal/0400-centipede-installer-branding.hook.chroot" "$BUILD/config/includes.chroot/usr/local/bin/centipede-installer" "$BUILD/config/includes.chroot/usr/local/libexec/centipede-installer-root"

cd "$BUILD"
lb config \
  --mode debian \
  --distribution bookworm \
  --architectures amd64 \
  --archive-areas "main contrib non-free-firmware" \
  --binary-images iso-hybrid \
  --mirror-bootstrap https://deb.debian.org/debian \
  --mirror-chroot https://deb.debian.org/debian \
  --mirror-chroot-security https://security.debian.org/debian-security \
  --mirror-binary https://deb.debian.org/debian \
  --mirror-binary-security https://security.debian.org/debian-security \
  --firmware-chroot true \
  --bootloaders "syslinux grub-efi" \
  --uefi-secure-boot enable \
  --checksums sha256 \
  --memtest memtest86+ \
  --iso-application "Centipede OS live system" \
  --iso-preparer "Centipede OS release build" \
  --iso-publisher "Centipede OS contributors" \
  --iso-volume "CENTIPEDE_OS_${VERSION}" \
  --bootappend-live-failsafe "boot=live components username=centipede hostname=centipede nomodeset vga=normal console=ttyS0,115200n8" \
  --security true \
  --bootappend-live "boot=live components username=centipede hostname=centipede console=ttyS0,115200n8 ignore_loglevel"
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

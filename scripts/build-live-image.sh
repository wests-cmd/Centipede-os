#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="$(node -p "require('${ROOT}/package.json').version")"
CONFIG="${ROOT}/packaging/live-build/config"
BUILD="${ROOT}/build/live"
OUT="${ROOT}/release"
PROFILE="${CENTIPEDE_BUILD_PROFILE:-desktop}"
case "$PROFILE" in desktop|server) ;; *) echo 'Unknown Centipede build profile' >&2; exit 2;; esac
SERVER_FLAGS=''

for tool in lb qemu-img; do
  command -v "$tool" >/dev/null || { echo "Missing required build tool: $tool" >&2; exit 2; }
done

npm --prefix "$ROOT" run build
rm -rf "$BUILD"
mkdir -p "$BUILD/config/includes.chroot/opt/centipede/web" "$OUT/iso" "$OUT/live-usb" "$OUT/vm"
cp -a "$CONFIG/." "$BUILD/config/"
if [ "$PROFILE" = server ]; then
  test -n "${CENTIPEDE_SERVER_SEED:-}" && test -f "$CENTIPEDE_SERVER_SEED" || { echo 'Server build requires an owner public-key seed' >&2; exit 2; }
  python3 "$CONFIG/includes.chroot/usr/local/libexec/centipede-server-bootstrap.py" --validate-seed "$CENTIPEDE_SERVER_SEED"
  mkdir -p "$BUILD/config/includes.binary" "$BUILD/config/includes.chroot/etc/centipede"
  cp "$CENTIPEDE_SERVER_SEED" "$BUILD/config/includes.binary/centipede-server.json"
  printf '%s\n' server > "$BUILD/config/includes.chroot/etc/centipede/build-profile"
  printf '%s\n' openssh-server avahi-daemon python3-venv git sudo > "$BUILD/config/package-lists/centipede-server.list.chroot"
  SERVER_FLAGS='centipede.server=1 systemd.unit=multi-user.target nomodeset'
fi
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
  --bootappend-live-failsafe "boot=live components username=centipede hostname=centipede nomodeset vga=normal video=efifb:1024x768-32 console=ttyS0,115200n8 $SERVER_FLAGS" \
  --security true \
  --bootappend-live "boot=live components username=centipede hostname=centipede splash console=ttyS0,115200n8 ignore_loglevel $SERVER_FLAGS"
lb build

ISO_SOURCE="${BUILD}/live-image-amd64.hybrid.iso"
test -s "$ISO_SOURCE"
ISO_NAME="centipede-os-${VERSION}-x86_64.iso"
USB_NAME="centipede-os-${VERSION}-live-usb-x86_64.iso"
QCOW_NAME="centipede-os-${VERSION}-x86_64.qcow2"
if [ "$PROFILE" = server ]; then
  ISO_NAME="centipede-os-${VERSION}-server-x86_64.iso"
  USB_NAME="centipede-os-${VERSION}-server-live-usb-x86_64.iso"
  QCOW_NAME="centipede-os-${VERSION}-server-x86_64.qcow2"
fi
cp "$ISO_SOURCE" "$OUT/iso/$ISO_NAME"
cp "$ISO_SOURCE" "$OUT/live-usb/$USB_NAME"
qemu-img convert -f raw -O qcow2 "$ISO_SOURCE" "$OUT/vm/$QCOW_NAME"
qemu-img check "$OUT/vm/$QCOW_NAME"
qemu-img info --output=json "$OUT/vm/$QCOW_NAME" > "$OUT/vm/${QCOW_NAME}.info.json"
file "$ISO_SOURCE" "$OUT/vm/$QCOW_NAME"

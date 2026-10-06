# Centipede OS visual identity

The operating system's visible identity is Centipede OS across the boot menus, startup splash, login screen, desktop, and guided installer. The desktop uses a calm, dark classic background, with Centipede identity carried by the boot menu, splash, login, panel, and applications. The live environment uses a static artwork-based splash so animation or accelerated graphics are not required to show the brand.

| Surface | Source | Installed use |
|---|---|---|
| Mark | `packaging/live-build/config/includes.chroot/usr/share/backgrounds/centipede/centipede-mark.svg` | Installer and application icon |
| Desktop | `centipede-workspace.svg` | Quiet, dark default XFCE wallpaper; product identity remains in the login, panel, and applications |
| Boot menu | `centipede-menu.svg` | GRUB and legacy BIOS menu background |
| Startup | `centipede-boot.svg` and `usr/share/plymouth/themes/centipede/` | Plymouth splash |
| Installer | `etc/calamares/branding/centipede/branding.desc` | Centipede product name and logo |

PNG artwork is generated from those SVG sources with:

```sh
node scripts/render-brand-assets.mjs
```

The live-image build fails if required artwork or Centipede identity configuration is missing. The boot-menu hook also fails if a generated visible boot label still identifies the base distribution. Linux components and package metadata retain machine-readable compatibility fields and required upstream legal notices; those fields are not product branding.

The `v1.0.1-rc.4` and `v1.0.1-rc.5` images were withheld after QEMU showed Debian’s BIOS splash and a black live screen. The current branch forces the branded menu renderer in the root BIOS configuration, sets the live account name and classic dark desktop defaults, and reports desktop readiness failures in the boot log. A fresh exact-image BIOS/UEFI boot and screenshot review must pass before publication. The stable download remains v1.0.0. Required upstream license notices and machine-readable compatibility metadata remain in the image.

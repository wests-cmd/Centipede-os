# Centipede OS visual identity

The operating system's visible identity is Centipede OS across the boot menus, startup splash, login screen, desktop, and guided installer. The live environment uses a static artwork-based splash so animation or accelerated graphics are not required to show the brand.

| Surface | Source | Installed use |
|---|---|---|
| Mark | `packaging/live-build/config/includes.chroot/usr/share/backgrounds/centipede/centipede-mark.svg` | Installer and application icon |
| Desktop | `centipede-workspace.svg` | Default XFCE wallpaper and login background |
| Boot menu | `centipede-menu.svg` | GRUB and legacy BIOS menu background |
| Startup | `centipede-boot.svg` and `usr/share/plymouth/themes/centipede/` | Plymouth splash |
| Installer | `etc/calamares/branding/centipede/branding.desc` | Centipede product name and logo |

PNG artwork is generated from those SVG sources with:

```sh
node scripts/render-brand-assets.mjs
```

The live-image build fails if required artwork or Centipede identity configuration is missing. The boot-menu hook also fails if a generated visible boot label still identifies the base distribution. Linux components and package metadata retain machine-readable compatibility fields and required upstream legal notices; those fields are not product branding.

The branded image is published as the [`v1.0.1-rc.3 preview`](https://github.com/wests-cmd/Centipede-os/releases/tag/v1.0.1-rc.3). The BIOS and signed-UEFI normal/Safe Graphics boot matrix passed in CI. It remains a live preview; the disk installer release gate is still blocked on a separate-target installation, reboot, and source-media safety validation. The stable download remains v1.0.0.

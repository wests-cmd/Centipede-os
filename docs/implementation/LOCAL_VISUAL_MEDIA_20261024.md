# Original Centipede identity and local Home media

The fresh app default is the static Centipede Earth artwork: an original generated image based on the owner's metallic orange centipede around Earth reference. Existing saved choices are preserved, including all four canvas scenes. The neon particle reel supplied visual inspiration, not executable code or a runtime dependency.

Settings accepts one local PNG/JPEG/GIF/WebP/MP4/WebM background. The bytes and a generated still preview are stored in IndexedDB on this browser origin, replacing the previous saved media only after decoding and validation succeed. Files are not uploaded or synchronized to Knights. No arbitrary URL, SVG, HTML or executable background is accepted. Bounds: 20 MiB, 4096 pixels per side, 120 seconds for video. Browser decoders still process untrusted media; these limits are operating safeguards, not a decoder sandbox or a promise of zero memory spikes.

GIFs and videos start with a genuine raster still preview. Play is opt-in each time Home mounts. Pause displays the still preview; it does not pretend CSS can pause an image decoder. Hidden/offscreen media uses the still preview. The system reduced-motion query and Centipede accessibility motion preference both force a still preview. Object URLs are revoked and video sources released after preparation. Muted video is limited to formats supported by the browser; failed decoding and storage errors are reported without replacing existing media.

App Home is not the Xfce desktop wallpaper. The live-build image includes the static wallpaper under `/usr/share/backgrounds/centipede/centipede-earth.png`, allowing the owner to choose it through normal desktop tools. The image also includes `/usr/share/centipede/branding/centipede-boot-emblem.png` for future boot integration. Identical sources live in `public/backgrounds` and `public/branding`.

The ISO builder additionally puts the transparent emblem in the outer ISO's `/boot/grub`, where the bootloader can actually read it before mounting the OS. The existing binary menu hook conditionally sources a small branding snippet from the generated `theme.cfg` (or `grub.cfg` fallback). It attempts a PNG background only if the image exists and GRUB's PNG module loads. It preserves generated menu commands and does not force a graphical terminal. Text-only GRUB and BIOS ISOLINUX retain their ordinary menus.

**Boot limitation:** this is a conditional static GRUB menu background, not a Plymouth splash or an animated boot sequence. No initramfs changes are made. BIOS/UEFI and Safe Graphics boot verification on the new exact image remains a platform CI gate, and physical hardware proof remains outstanding. Desktop GIF support also remains a separate OS integration task; this feature supports GIFs inside app Home.

Generated asset sources were copied unchanged; there is no new image processing or animation dependency. SHA-256 provenance and local validation results are recorded with the PR. No current installed OS or user wallpaper is overwritten by this source change.

## Asset provenance

Original generated wallpaper SHA-256: `73f30f9f956b935fdde43fe75c468848ccd8bab3ce95950f8a642efb56673f6b`.

Original generated transparent emblem SHA-256: `736ce81652f28a63fca34ad123d4a299681cd10529cbb6862fa03397fbb50f05`.

Both packaged copies retain those digests. Generation used the owner-supplied reference as inspiration; reel media and third-party source code were not copied into these assets.

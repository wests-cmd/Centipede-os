# Segmentor Native — Atticus-inspired integration

Baseline: existing Centipede shell and wallpaper restoration PR #191. Upstream inspiration: https://github.com/SaarthurR/atticus-mac (MIT). This implementation is original TypeScript, not a copy of Atticus code.

First vertical slice: a persistent in-shell quick assistant, Ctrl+Alt+Space while the Centipede app has focus, model-free exact commands to existing application views, and unknown text handed to the existing owner-gated Kingdom task form as a draft. No automatic task dispatch, permission elevation, microphone access or background execution. The wallpaper remains unchanged. The legacy desktopVision facade now returns FAILED when no native executor exists and cannot grant root privilege by setting a flag.

Remaining scope: native desktop shortcut and window adapters; independently verified actions; optional local speech and dictation; selected-region vision with consent; screen guidance; persistent verified skill replay; isolated native desktop worker; Kingdom worker placement and cancellation; resource benchmarks; release and physical acceptance. Do not claim these are implemented by the floating UI. Existing Chromium harness remains isolated and optional. Native execution and learning must use typed operations and actual receipts, not arbitrary shell commands or model assertions.

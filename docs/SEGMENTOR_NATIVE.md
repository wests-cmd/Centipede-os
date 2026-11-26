# Segmentor Native — Atticus-inspired integration

Baseline: existing Centipede shell and wallpaper restoration PR #191. Upstream inspiration: https://github.com/SaarthurR/atticus-mac (MIT). This implementation is original TypeScript, not a copy of Atticus code.

First vertical slice: a persistent in-shell quick assistant, Ctrl+Alt+Space while the Centipede app has focus, model-free exact commands to existing application views, and unknown text handed to the existing owner-gated Kingdom task form as a draft. No automatic task dispatch, permission elevation, microphone access or background execution. The wallpaper remains unchanged. The legacy desktopVision facade now returns FAILED when no native executor exists and cannot grant root privilege by setting a flag.

Remaining scope: native desktop shortcut and window adapters; independently verified actions; optional local speech and dictation; selected-region vision with consent; screen guidance; persistent verified skill replay; isolated native desktop worker; Kingdom worker placement and cancellation; resource benchmarks; release and physical acceptance. Do not claim these are implemented by the floating UI. Existing Chromium harness remains isolated and optional. Native execution and learning must use typed operations and actual receipts, not arbitrary shell commands or model assertions.

## Desktop consolidation

Seven primary dock destinations: Home, Segmentor, Apps, Files, Tasks, Devices, Settings. Searchable grouped directory retains every legacy advanced view. Removed duplicate permanent sidebar; the workspace occupies the full available width. Window bounds follow the actual workspace rather than a hard-coded sidebar offset, and minimization uses a keyboard-accessible restore button. This is still a single-active-view shell, not a native multi-window compositor. Home keeps its original artwork and custom media options, and existing visibility/authorization controls remain. Existing browser and benchmark paths are updated to exercise the real new navigation.

## Personal navigation shortcuts and local screen selection

Explicit, persistent navigation phrases are reviewable and removable in the full Segmentor application. They accept only a small allowlist of internal views, never executable commands, arbitrary URLs or privileged actions; they do not learn automatically. Storage is bounded and validated on each replay. Native verified multi-step learning remains a later gate.

Perception can select a rectangular region of the existing consented, frozen local preview by pointer or accessible controls, and generate a bounded local crop. Selection is discarded when capture ends or the view unmounts. There is no connected vision provider or external image upload; this implements the selection half of point-and-ask only. No claims of image interpretation or system-wide overlay.

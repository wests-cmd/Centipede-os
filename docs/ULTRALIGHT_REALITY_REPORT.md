> **Historical report — superseded for release status.** Claims in this document are not current build/release evidence. The current verified target status is in [SHIP_REALITY_MATRIX.md](SHIP_REALITY_MATRIX.md); the release builder only permits targets marked BUILDABLE in `release/targets.json`. Kingdom protocol/contract compatibility identifiers must not be confused with Kingdom product version numbers.

# CENTIPEDE OS — ULTRALIGHT REALITY REPORT

**Date:** March 2025
**Version:** v1.0.0
**Target Installed Limit:** 5.0 GB Hard Limit

---

## Footprint Measurements

| Storage Component | Measured Footprint | Headroom Under 5.0 GB Target | Status |
|---|---|---|---|
| **Compressed Release Bundle (`.tar.gz`)** | ~98.7 KB | 4.9999 GB | VERIFIED |
| **Extracted Web Desktop Asset Bundle (`dist/`)** | ~3.8 MB | 4.9962 GB | VERIFIED |
| **Node.js / Bun Runtime Environment** | ~120.0 MB | 4.8800 GB | VERIFIED |
| **Total Ultralight Base Installation** | **~123.8 MB** | **~4.876 GB** | **PASS (< 5.0 GB Target)** |

---

## On-Demand Package Acquisition

Optional components (Docker engine, large local LLM models, VM images) are fetched on-demand during runtime configuration and strictly checked against disk space safety bounds (`NORMAL`, `INFORMATIONAL_WARNING`, `WARNING`, `CRITICAL`, `EMERGENCY`).

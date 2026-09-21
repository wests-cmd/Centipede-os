# CENTIPEDE OS OWNER RELEASE WORKFLOW GUIDE

**Version:** v1.0.0
**Target:** Repository Maintainers & Release Automation

---

## 1. Development vs. Production Release Workflow

### Normal Development (Pull Requests)
1. Developers or Jules create feature branches (`jules-*` or `feature/*`).
2. Pull requests targeting `main` automatically run **CI** (`.github/workflows/ci.yml`):
   - Static Type Checking (`bun x tsc --noEmit`)
   - Unit & Security Invariant Tests (`bun test`)
   - Production Build Verification (`bun run build:release`)
3. Code changes cannot be merged into `main` unless CI passes.

---

## 2. Production Release Process (Step-by-Step)

When a new version is ready for public release:

### Step 1 — Version Increment
Update the version string in `package.json`:
```json
{
  "version": "1.1.0"
}
```
`src/version.ts` automatically imports and exports `package.json.version`, maintaining a single canonical version source of truth.

### Step 2 — Create and Push Release Tag
Tag the commit with matching semantic version syntax (`v1.1.0`):
```bash
git tag v1.1.0
git push origin v1.1.0
```

### Step 3 — Automated Release Pipeline Execution
Pushing a `v*` tag triggers `.github/workflows/release.yml`:
1. **Tag/Version Validation:** `scripts/build-release.ts` verifies that `v1.1.0` matches `package.json` (`1.1.0`). If mismatched, the build aborts immediately.
2. **Build & Hash Generation:** Compiles `dist/`, archives `release/centipede-os-1.1.0-desktop-web-bundle.tar.gz`, and generates byte-exact SHA-256 signatures in `release/SHA256SUMS` and `release/release-manifest.json`.
3. **GitHub Release Publishing:** Uploads release assets to GitHub Releases under `v1.1.0` with automatically generated release notes.

---

## 3. Failure Handling & Rollback Safety

- **Test / Type Failure:** If tests or typechecks fail, release packaging stops immediately; no GitHub Release is created.
- **Tag Mismatch:** If Git tag `v1.1.0` does not equal `package.json` version `1.2.0`, the pipeline fails closed.
- **Rollback / Idempotency:** Overwriting an existing tag release is prohibited. Previous working GitHub Releases are preserved intact on build failure.

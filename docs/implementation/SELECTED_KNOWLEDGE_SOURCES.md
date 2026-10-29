# Selected local knowledge sources — first native slice

This is the first bounded implementation of CEN-SENTIENT-01. It independently
implements the selected-source idea; it contains no copied Sentient OS code.

The actual Bun production HTTP adapter now provides a local administration API
for an explicitly selected folder and explicitly requested `.txt`/`.md` files.
Sources default to empty. There is no recursive scanner, background watcher,
mailbox access, cloud connection or inference. Returned Markdown is an untrusted
source **excerpt**, not an AI-generated summary. Source picker/editor UI,
editable Markdown files, knowledge organization, background preparation and
suggestion cards remain separate work. The browser preview and in-process router
do not pretend to provide this native filesystem capability.

## Public boundary

Every route uses the production adapter's existing `isLocalAdminRequest` result:
the actual socket peer must be loopback, Host must be local, and hostile Origin
or cross-site Fetch Metadata is rejected. A mobile pairing token, JSON field or
spoofed header cannot grant this authority. This retains the existing local
administration trust model; it does not introduce a new OS user/credential boundary.

| Route | Method / body | Result |
|---|---|---|
| `/api/v1/knowledge/sources` | GET | Source list and retained file counts |
| `/api/v1/knowledge/sources` | POST `{root, label}` | Explicit selection; same active folder reuses its source ID |
| `/api/v1/knowledge/scan` | POST `{id, paths}` | Bounded, explicit-path hash/excerpt checkpoint |
| `/api/v1/knowledge/extract` | POST `{id, path}` | Cached excerpt with source ID, path, hash and observation time |
| `/api/v1/knowledge/revoke` | POST `{id}` | Disables selection and removes its retained excerpts |

Bodies reject unknown fields. The API does not return filesystem exceptions or
log selected paths/content. Missing or changed files hold the request; no
partially scanned batch is committed. Subsequent reads/scans of revoked sources
are denied, including after restart.

## Resource and persistence limits

- At most 16 source selections, 128 retained file entries per source.
- Each scan: 1–16 unique relative paths, at most eight path components, 240 path
  characters, 32 KiB per file and 128 KiB total. UTF-8 text only.
- Returned extracts retain at most 2,048 source characters and are labelled
  `UNTRUSTED_SOURCE_EXCERPT`. Hashes cover the complete bounded source bytes.
  They are cached snapshots at `observedAt`, not a claim that the file still has
  those contents. A later explicit scan is required to observe a changed file.
- The checkpoint is bounded to 1 MiB and stored under
  `CENTIPEDE_KNOWLEDGE_HOME`, default `data/selected-knowledge/` in the server's
  working directory. A selected root cannot contain that checkpoint directory.
- Writes use an exclusive temporary file, file synchronization and atomic rename;
  POSIX additionally synchronizes the directory. Restart reloads the same IDs,
  hashes and excerpts. Unchanged content avoids another excerpt/checkpoint, but
  its bytes are still read to compute the comparison hash.
- The native server is the **single writer** for this checkpoint. Observed
  revision changes are rejected; this is not a cross-process transaction system.
  Do not point multiple independent server processes at the same checkpoint.
  Future preparation workers must call this one authorized service rather than
  construct independent writers. Cross-process revocation/CAS is not guaranteed.

Relative-path validation, intermediate-component link rejection, canonical-root
and directory-identity checks, no-follow file opening where supported, bounded
descriptor reads and post-open identity checks reject ordinary traversal,
junction/symlink escape and replaced source roots. Selection is rechecked before
checkpointing and delivery. These portable filesystem checks are not an OS
sandbox or a guarantee against a privileged/same-user process racing directory
renames between checks. OS permissions remain authoritative. Tests cover process
restart; they do not establish hardware power-loss durability.

## Proof

```sh
bun test tests/unit/selected_knowledge_sources.test.ts tests/unit/request_trust.test.ts tests/unit/server.test.ts tests/unit/kingdom_proxy.test.ts
bun tests/integration/selected_knowledge_sources.integration.ts
bun x tsc --noEmit
bun run build
```

The integration check refuses a non-Bun runtime, starts the real production HTTP
adapter on a reserved loopback port, and uses only temporary synthetic sources.
It verifies empty defaults, Host/Origin/cross-site denials, opt-in selection,
bounded scanning, restart, unchanged hashes and revocation. The same named check
runs in CI. No owner's files are selected or read by validation.

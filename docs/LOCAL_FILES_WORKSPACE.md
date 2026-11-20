# Local Centipede Files workspace: verified-scope design

The previous Files view showed fabricated sample files. The new UI now accesses an actual persistent server-side directory through `src/server/hostFiles.ts` and uses the same short-lived **local owner** action session as Kingdom Tasks. Its fixed routes are `POST /api/v1/host-files/{list,read,create,mkdir}`. LAN and phone clients are not permitted. Requests must originate from the verified local-administrator socket and carry the owner session and owner-intent header.

**Configure persistence:** set `CENTIPEDE_FILES_ROOT` to a dedicated, privately owned absolute directory; otherwise the service uses `data/files` under its working directory. Mount that directory persistently if running Docker. The service must run as an unprivileged Linux account; do not grant direct arbitrary host filesystem access to a webview. The workspace root must not be symlinked or writable by group/other. New directories use `0700`; new files use `0600`.

**Supported now:** list up to 200 entries, folder navigation up to eight levels, up to 128 KiB UTF-8 file preview, exclusive create-new text files and folders. User paths reject absolute paths, hidden paths, traversal and symlinks. Existing files cannot be overwritten.

**Release blockers:** no editing existing files, binary/image preview, file move/copy/delete/trash, full Documents/Downloads integration, host app launching, remote phone uploads, cross-platform broker, descriptor-relative race-free traversal, user permission-mapping or real installed-device trial. This is a **restricted real workspace**, not a complete Files application. Never advertise it otherwise.

Evidence: `tests/unit/host_files.test.ts`, browser locked-state smoke test, current GitHub CI checks. Native hardware and backup/recovery validation remain required under issue #150.

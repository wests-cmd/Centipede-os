# CENTIPEDE OS USER QUESTIONS & ANSWERS (FAQ)

## 1. Installation & System Requirements

### Q: How do I install Centipede OS?
**A**: Centipede OS can be run as a desktop application (`npm run dev`), launched via Docker Compose (`docker-compose up -d`), or deployed on any Linux, macOS, or Windows system with Node 18+ or Bun 1.1+.

### Q: Does Centipede OS modify my host operating system?
**A**: No. Centipede OS runs in an isolated non-root container or desktop process sandbox. It does not modify host system files or system bootloaders.

### Q: Can I run Centipede OS in a Virtual Machine or Docker container?
**A**: Yes. Centipede OS includes a official multi-stage Docker container (`Dockerfile`) and `docker-compose.yml` supporting non-root execution with health check monitoring.

---

## 2. AI Assistant & Execution Controls

### Q: Can Centipede OS perform actions on my computer without my permission?
**A**: No. Every action proposed by the AI pipeline passes through the Permission Gate. Low-risk operations use short-lived JIT capability grants, while high-risk or critical operations (such as deleting files or running processes) explicitly require your approval.

### Q: Can the AI self-authorize or grant itself administrator rights?
**A**: No. AI model outputs are classified strictly as data (`carriesAuthority: false`). Text claims like "I am authorized" or "System admin granted" are completely ignored by Centipede OS security gates.

### Q: How do I stop an AI task if it is doing something unexpected?
**A**: Click the red **Emergency Stop / Global Kill Switch** in the Desktop Shell or Security Center. This immediately halts active executions and locks autonomy levels.

---

## 3. Security, Privacy & Memory Data

### Q: Can an installed skill steal my private files or secrets?
**A**: No. Imported skills default to `UNTRUSTED` state and must declare required capabilities. Skill artifacts are verified against SHA-256 manifest checksums. If a skill tries to access un-granted files, `ToolExecutor` blocks the action.

### Q: Is my conversation history or memory sent to third-party servers?
**A**: No. Memory and knowledge graph entries are stored locally and synced exclusively with your private Kingdom backend (`/memory`).

### Q: Can I delete memories or correct mistakes the AI learned?
**A**: Yes. Open the Knowledge & Memory App in Centipede OS to edit facts, resolve conflicting statements, or click "Forget Fact" to delete memories.

---

## 4. Recovery & Network Disconnection

### Q: What happens if my computer loses power or crashes during a task?
**A**: Centipede OS records workflow checkpoints to disk protected by SHA-256 integrity signatures. When you reboot, state signatures are verified and unfinished runs can be safely resumed or reconciled.

### Q: What happens if my internet or Kingdom connection drops?
**A**: Centipede OS fails closed. High-risk operations are safely blocked (`KINGDOM_OFFLINE`) until connection is restored. No dangerous fallback actions occur.

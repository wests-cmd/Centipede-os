# CENTIPEDE OS — MASTER RELEASE EXECUTION CHECKLIST

Use this as the implementation and release checklist for Centipede OS.

## OPERATING RULE

Before implementing anything:

1. Inspect the current repository.
2. Map existing implementations against this checklist.
3. Mark every requirement:
   - PROVEN
   - IMPLEMENTED/UNPROVEN
   - PARTIAL
   - MISSING
   - BLOCKED
   - NOT APPLICABLE
4. Extend existing systems instead of creating duplicate architectures.
5. Remove obsolete implementations after replacements are proven.
6. Never claim a feature works solely because code exists.
7. Test the actual behavior.
8. Kingdom remains the authorization/security authority.
9. Segmentor and other AI agents cannot self-authorize privileged operations.
10. Preserve user data, accessibility configuration, device identity, Kingdom pairing, skills, workflows, memory, profiles and settings through updates and repairs.

---

# PHASE 0 — REPOSITORY INTERROGATION

Audit the current repository before changing it.

Specifically inspect the existing:

- AI architecture
- Segmentor architecture
- context engine
- context manager
- model abstraction
- capability resolver
- autonomy engine
- action executor
- workflow persistence
- workspace registry
- grants
- identity
- incident management
- platform detector
- release integrity
- target update checker
- server/API
- skills
- tools
- learning
- security
- tests
- CI
- CodeQL
- release workflow
- ISO builder
- Docker builder
- desktop build
- Android project
- iOS state
- release manifests
- version sources
- Kingdom contract
- documentation

Do not create replacements for working architecture simply because this specification uses a different name.

---

# PHASE 1 — UPDATE SYSTEM

Implement a real self-update architecture.

Required:

- Self-Update Manager
- Live Update Manager
- componentized updates
- delta updates where practical
- resumable downloads
- download verification
- SHA-256 verification
- signed update manifests
- trusted signing keys
- anti-downgrade protection
- anti-replay protection
- staged updates
- atomic activation
- post-update health checks
- automatic rollback
- last-known-good version
- update history
- Stable channel
- Beta channel
- Developer channel
- security-only updates
- critical updates
- scheduled updates
- Update Tonight
- bandwidth limits
- metered-network controls
- battery-aware updates
- disk-space preflight
- memory/resource preflight
- dependency preflight
- Kingdom compatibility preflight
- recovery preflight
- offline USB/file updates

Support:

HOT UPDATE
- no reboot

WARM UPDATE
- restart affected component/service only

COLD UPDATE
- reboot required

Components should be independently updateable where technically safe:

- Centipede UI
- Segmentor
- specialist agents
- workflows
- skills
- plugins
- API catalog
- profiles
- documentation/help
- model configuration
- provider configuration
- Kingdom adapter
- Doctor definitions
- Repair definitions
- security definitions

Kernel, driver and similarly sensitive updates remain controlled system updates.

Do not require a multi-gigabyte ISO download for a small Segmentor/UI/skill fix.

---

# PHASE 2 — SELF-REPAIR + RECOVERY

Implement:

DETECT
→ DIAGNOSE
→ CONTAIN
→ REPAIR
→ VERIFY
→ COMMIT OR ROLLBACK

Required components:

- Health Monitor
- Integrity Scanner
- Fault Classifier
- Repair Planner
- Repair Executor
- Repair Verifier
- Known-Good Recovery Store
- Repair History
- Undo Repair
- crash-loop detection
- Safe Mode
- Recovery Mode

Detect:

- missing files
- corrupted files
- damaged configuration
- failed services
- damaged cache/indexes
- permission failures
- broken skills
- broken plugins
- failed migrations
- interrupted updates
- damaged model configuration
- Kingdom connection/configuration problems
- disk-full situations
- startup failures

Maintain trusted integrity information for critical components.

Prefer repairing the affected component instead of reinstalling Centipede.

Harmless deterministic repairs may be automatic.

Privileged repairs require the appropriate Kingdom capability/approval.

Segmentor may recommend a repair.

Segmentor may NOT independently grant itself repair authority.

---

# PHASE 3 — PERSISTENT USER STATE

Create explicit storage classifications:

SYSTEM

APP

USER

SECRET

CACHE

LOG

Updates and repairs must preserve protected state including:

- user files
- memory
- skills
- workflows
- profiles
- accessibility settings
- model configuration
- device identity
- Kingdom pairing metadata
- task history
- workspace state
- update preferences

Implement:

- schema migrations
- migration backups
- migration validation
- migration rollback
- recovery from interrupted migration

---

# PHASE 4 — PERSISTENT AGENT RUNTIME

Adopt the useful persistent-runtime concepts discussed from Herdr without converting Centipede into a terminal multiplexer.

Segmentor tasks should not disappear because the UI closes.

Implement:

- Persistent Agent Runtime
- Persistent Task Ledger
- detach from task
- reattach to task
- background execution
- task checkpointing
- restart recovery
- pause
- resume
- cancel
- retry
- task dependencies
- recurring tasks
- scheduled tasks
- wake-up events

After reboot:

discover interrupted task
→ load checkpoint
→ revalidate identity
→ revalidate capability
→ revalidate approval
→ verify dependencies
→ resume only if safe

Never blindly resume privileged operations.

---

# PHASE 5 — AGENT STATE MODEL

Every task/agent should expose a deterministic state.

Support:

QUEUED

PLANNING

WAITING_FOR_MODEL

WAITING_FOR_TOOL

WAITING_FOR_AGENT

WAITING_FOR_KINGDOM

WAITING_FOR_APPROVAL

RUNNING

BLOCKED

PAUSED

VERIFYING

RECOVERING

COMPLETED

FAILED

CANCELLED

Add:

- state detection
- state history
- reason for state
- time in state
- dependency responsible for blocking
- Explain State function

The user should be able to ask:

“Why is this blocked?”

and receive a concrete explanation.

---

# PHASE 6 — NEEDS YOUR ATTENTION

Create a central queue for things requiring the user.

Examples:

- approval required
- agent needs clarification
- update needs reboot
- failed workflow
- camera offline
- printer anomaly
- Kingdom disconnected
- storage low
- repair requires approval
- phone needs reauthorization

Do not make users search through logs to determine what needs them.

---

# PHASE 7 — MULTI-AGENT SEGMENTOR

Segmentor is the primary orchestrator.

Add/complete specialist roles such as:

- Research
- Coding
- Files
- System
- Automation
- Media
- Monitoring
- Vision
- CAD

Implement:

- leader/worker orchestration
- task classification
- delegation
- agent-to-agent messaging
- dependency graph
- safe parallel execution
- agent timeout
- cancellation
- recovery
- resource limits

AI remains outside the trust root.

---

# PHASE 8 — MODEL ROUTER

Complete the model abstraction/router.

Routing factors:

- task
- privacy
- hardware
- available RAM
- GPU availability
- model availability
- context requirement
- latency
- cost
- local/cloud preference
- historical model performance

Prefer local models when they are sufficient.

Support Ollama/local providers.

Cloud usage must be explicit and policy controlled.

Add:

- model health checks
- model failover
- model performance history
- provider abstraction
- privacy-aware routing
- hardware-aware routing
- cost-aware routing

---

# PHASE 9 — CONTEXT SYSTEM

Extend the existing context architecture.

Implement:

- context budgeting
- relevant memory retrieval
- task-specific context
- compaction
- summarization
- tool-result offloading
- file-context selection
- workspace context
- multimodal context

Do not dump all available memory/files into every model call.

---

# PHASE 10 — EVENT BUS + LIVE ACTION

Create one authoritative event architecture.

Events should cover:

- task
- plan
- agent
- model
- tool
- workflow
- Kingdom
- approval
- update
- repair
- camera
- microphone
- vision
- CAD
- printer
- mobile
- security

Examples:

TASK_STARTED

PLAN_CREATED

AGENT_STARTED

APPROVAL_REQUIRED

TOOL_STARTED

TOOL_COMPLETED

CAMERA_OFFLINE

VISION_ALERT

PRINTER_ANOMALY

UPDATE_STARTED

UPDATE_ROLLED_BACK

REPAIR_COMPLETED

TASK_COMPLETED

TASK_FAILED

The Live Action UI consumes this event stream.

---

# PHASE 11 — WORKSPACES

Implement Centipede Workspaces.

A workspace can contain:

- chats
- files
- memory
- agents
- models
- tasks
- skills
- plugins
- workflows
- devices
- cameras
- printers

Support:

- persistent workspace state
- workspace-specific memory
- workspace-specific skills
- workspace-specific models
- workspace-specific permissions
- workspace-specific files
- workspace-specific agent teams
- restore
- import/export

Examples:

Kingdom Development

3D Printing

Trading

Video Creation

Business

Personal

Home Automation

---

# PHASE 12 — SKILLS

Complete one authoritative Skill Registry.

Every skill should have:

- ID
- version
- hash
- dependencies
- permissions
- compatibility
- risk classification
- origin
- verification state

Lifecycle:

CANDIDATE
→ TEST
→ VERIFY
→ PROMOTE
→ ACTIVE

Support:

- rollback
- quarantine
- import/export
- live updates
- success/failure metrics
- dependency resolution

Learned skills must never immediately become trusted privileged skills.

---

# PHASE 13 — PLUGINS / MCP / EXTERNAL TOOLS

Implement a controlled plugin architecture.

Required:

- Plugin Registry
- manifest
- versions
- dependencies
- permissions
- signing
- sandboxing
- compatibility checks
- health checks
- update
- rollback
- quarantine

Add controlled MCP integration.

Optional future A2A interoperability may be supported.

Neither MCP, plugins nor A2A agents bypass Kingdom.

---

# PHASE 14 — WORKFLOW / SOP ENGINE

Support reusable procedures containing:

- trigger
- inputs
- steps
- dependencies
- agents
- tools
- permissions
- approvals
- expected output
- verification
- failure handling
- recovery
- version

Support:

- workflow versioning
- workflow checkpoints
- workflow recovery
- workflow import/export
- scheduled workflows
- event-triggered workflows

---

# PHASE 15 — CENTIPEDE DOCTOR

Create:

Settings → System → Doctor & Repair

Doctor checks:

- Centipede core
- Kingdom
- Kingdom compatibility
- updater
- repair engine
- recovery
- persistent state
- storage
- RAM
- CPU
- GPU
- network
- Ollama
- installed models
- agents
- skills
- plugins
- permissions
- Docker
- mobile
- cameras
- microphones
- printers
- devices

Statuses:

PASS

WARNING

FAIL

NOT CONFIGURED

Provide:

- simple explanation
- technical explanation
- suggested action
- safe automatic repair when appropriate
- support bundle

Never expose secrets in support bundles.

---

# PHASE 16 — PROACTIVE SEGMENTOR

Segmentor may proactively surface useful conditions such as:

- low disk
- low memory
- failed backup
- Kingdom disconnected
- agent stuck
- agent needs input
- model failed
- skill failed
- plugin failed
- update failed
- repair failed
- camera offline
- printer anomaly
- device offline
- integrity/security warning

Avoid notification spam.

---

# PHASE 17 — CAMERA + VISION

Implement a Vision & Camera Manager.

Support where technically possible:

- USB cameras
- built-in cameras
- RTSP
- ONVIF
- IP cameras
- NVR feeds
- phone camera
- 3D-printer camera

Camera permissions are separate:

CAMERA.VIEW

CAMERA.RECORD

VISION.ANALYZE

Camera access must be off by default unless configured.

Implement:

- Live View
- Multi-Camera View
- event snapshots
- optional event clips
- motion detection
- object/event analysis
- zones
- watch rules
- camera timeline
- camera health
- camera offline detection
- camera access history
- visible camera-use indicator
- recording indicator
- retention settings
- local-first analysis
- edge analysis
- adaptive frame analysis
- bandwidth limits
- resource limits

Cloud vision must be opt-in.

Do not silently upload camera frames.

---

# PHASE 18 — 3D PRINTER VISION

Create a 3D Printing workspace/integration.

Support:

- printer camera
- printer telemetry where supported
- progress monitoring
- visual anomaly detection
- probable spaghetti detection
- detached-object detection
- severe layer-shift indication
- stalled-motion indication
- alerts
- snapshots
- printer history

Viewing and controlling the printer are separate capabilities.

PRINTER.READ

and

PRINTER.CONTROL

must not be equivalent.

If Segmentor detects a possible failure:

observe
→ explain
→ recommend
→ Kingdom authorization
→ pause/stop if authorized
→ verify

---

# PHASE 19 — MICROPHONE + TWO-WAY VOICE

Implement a Microphone Manager.

Modes:

OFF

PUSH TO TALK

WAKE WORD

ACTIVE SESSION

CONTINUOUS MONITORING

Continuous monitoring must be explicitly enabled.

Add:

- local-first speech recognition
- voice activity detection
- wake phrase
- push-to-talk
- natural conversation
- command mode
- question mode
- task mode
- dictation
- transcript
- visible microphone indicator
- microphone access history
- microphone revocation
- emergency microphone disable

Segmentor must talk back.

Implement:

- Text-to-Speech
- selectable voice
- speaking speed
- volume
- pause
- resume
- repeat
- stop talking
- barge-in/interruption
- spoken task progress
- spoken alerts
- private/headphone output

Never speak secrets aloud.

---

# PHASE 20 — MULTIMODAL UNDERSTANDING

Combine:

- text
- voice
- camera
- image
- files
- drawings
- touch/selection
- CAD

into one task context.

A user should be able to show something while saying:

“Look at this.”

“What's wrong with this?”

“Make one like this.”

“Make this part thicker.”

“Tell me how to fix this.”

Implement:

- visual reference tracking
- freeze frame
- region selection
- multi-angle capture
- measurement references
- uncertainty reporting
- mixed voice + camera context
- mixed voice + touch context

Do not invent precise measurements from an image when they cannot be reliably determined.

---

# PHASE 21 — DRAWING → USABLE ARTIFACT

Support:

- paper sketch
- whiteboard
- screenshot
- tablet drawing
- technical drawing
- annotated photograph

Implement:

- Drawing Interpreter
- drawing cleanup
- line/shape detection
- text/dimension extraction
- vector conversion
- SVG output
- DXF output where appropriate
- diagram conversion
- CAD draft generation
- missing-dimension detection

Ask for critical missing dimensions rather than inventing them.

---

# PHASE 22 — OBJECT → CAD

Implement guided object reconstruction.

Workflow:

camera
→ multiple views
→ reference measurement
→ geometry understanding
→ feature detection
→ CAD reconstruction
→ user verification

Recognize useful features such as:

- holes
- slots
- walls
- bosses
- curves
- mounting points

Prefer editable parametric geometry when feasible.

---

# PHASE 23 — CAD COPILOT

Support useful formats such as:

- STEP
- STL
- OBJ
- 3MF
- DXF
- SVG

Add:

- CAD understanding
- natural-language CAD editing
- parametric editing
- CAD version history
- undo/redo
- before/after comparison

Examples:

“Move these holes 5 mm outward.”

“Make the wall 3 mm thick.”

“Round these corners.”

“Add mounting holes.”

---

# PHASE 24 — CAD/PRINT VALIDATION

AI-generated geometry must become a genuinely usable artifact.

Implement:

- geometry validation
- manifold check
- watertight check
- self-intersection detection
- wall-thickness check
- overhang analysis
- tolerance analysis
- clearance/fit analysis
- hole compensation
- build-volume check
- material profile
- printer profile
- orientation recommendation
- support recommendation
- weak-axis warning
- STL/3MF export
- editable CAD/STEP export where possible
- slicer integration
- G-code preview
- G-code validation

Physical execution:

CAD
→ validate
→ slice
→ validate
→ preview
→ user approval
→ Kingdom
→ printer capability
→ printer

Do not let an LLM directly send arbitrary machine commands to physical hardware.

---

# PHASE 25 — ACCESSIBILITY

Accessibility is a core system requirement.

Centipede must not assume the user can:

- see
- hear
- use a mouse
- type quickly
- speak conventionally
- understand technical language
- interact through only one input method

Create:

Settings → Accessibility

Add optional first-run accessibility setup.

Accessibility profiles may include:

- Default
- Low Vision
- Screen Reader
- Hard of Hearing
- Deaf
- Limited Mobility
- Voice Control
- Cognitive Assistance
- Reading Assistance
- Low Dexterity
- Custom

Profiles are starting points, not assumptions about a user's abilities.

---

# PHASE 26 — VISUAL ACCESSIBILITY

Implement:

- screen-reader compatibility
- semantic UI labels
- keyboard navigation
- logical focus order
- visible focus
- screen magnification
- UI scaling
- text scaling
- large-text mode
- high contrast
- accessible light/dark themes
- color-blind-friendly presentation
- never rely on color alone
- reduce transparency
- reduce motion
- disable animation
- spoken image descriptions
- spoken camera descriptions
- spoken CAD descriptions
- consistent spatial descriptions

---

# PHASE 27 — HEARING ACCESSIBILITY

Implement:

- live captions
- Segmentor speech captions
- microphone speech captions
- notification captions
- visual alerts
- optional screen flash
- phone vibration/haptics
- conversation transcript

Never make audio the only critical warning.

---

# PHASE 28 — MOBILITY / DEXTERITY ACCESSIBILITY

Implement where supported:

- complete voice navigation
- numbered voice targets
- hands-free mode
- dictation
- switch control
- sticky keys
- slow keys
- accidental-repeat filtering
- large click targets
- adjustable click/hold timing
- keyboard-only operation
- customizable shortcuts
- one-handed interaction options

---

# PHASE 29 — COGNITIVE / READING ACCESSIBILITY

Implement:

- Simple Language Mode
- Step-by-Step Mode
- Reduced UI Mode
- consistent navigation
- Explain Before Acting
- Why am I seeing this?
- What should I do?
- What happens if I press this?
- reading assistance
- plain-language rewriting
- adjustable explanation complexity
- Focus Mode
- task checklists
- Resume Where I Was

---

# PHASE 30 — SPEECH ACCESSIBILITY

Support:

- adjustable speech-recognition sensitivity
- custom vocabulary
- personalized recognition where practical
- longer response timeout
- adjustable pause detection
- push-to-talk alternative
- text alternative for voice operations
- alternative activation methods

Do not require perfect wake-word pronunciation.

---

# PHASE 31 — ACCESSIBILITY PERSISTENCE

Accessibility settings must survive:

- update
- live update
- repair
- rollback
- migration
- reboot
- recovery

Installer, login/unlock, recovery and Safe Mode must themselves be accessible.

---

# PHASE 32 — MULTI-DEVICE / MULTI-MACHINE

Create one Devices view.

Possible states:

ONLINE

OFFLINE

SLEEPING

DEGRADED

QUARANTINED

REVOKED

Support:

- remote task visibility
- independent reconnect
- device presence
- send task to device
- hardware-aware node selection
- model-aware node selection
- load-aware node selection
- privacy-aware node selection
- remote task recovery
- quarantine
- revocation

Kingdom remains responsible for trust/capabilities.

---

# PHASE 33 — MOBILE COMPANION

Complete:

- Android production build
- Android signing
- APK
- Play Store compliance
- iOS production build
- signing/provisioning
- App Store compliance
- secure phone pairing
- remote approvals
- task monitoring
- notifications
- camera viewing
- printer monitoring
- send text
- upload file
- upload picture
- voice
- Add to Vault
- convert to memory
- convert to skill candidate
- device revocation

Keep the phone client small/light.

---

# PHASE 34 — RESOURCE MODES

Support:

PERFORMANCE

BALANCED

LOW POWER

ULTRALIGHT

UltraLight should target low-resource hardware.

Optimize:

- background services
- polling
- animation
- agent concurrency
- context budgets
- caches
- model selection
- vision frequency
- camera resolution/FPS
- update bandwidth

Keep the static Centipede/Earth background fallback.

Aim for the previously defined <5 GB UltraLight distribution target where technically practical and verifiable.

---

# PHASE 35 — UI

Maintain the Centipede visual identity:

- dark primary design
- restrained red
- restrained blue
- low-resource Centipede-around-Earth visual
- static fallback

Primary areas should ultimately include:

- Home
- Segmentor
- Workspaces
- Agents
- Apps
- Files
- Tasks
- Devices
- Cameras
- Printers
- Approvals
- Skills
- Plugins
- Models
- Notifications
- Live Action
- Needs Your Attention
- Doctor & Repair
- Updates
- Recovery
- Accessibility
- Settings

Support:

NORMAL

POWER

ADMIN

modes without creating three unrelated applications.

---

# PHASE 36 — KINGDOM SECURITY INVARIANTS

These rules are mandatory.

AI != AUTHORITY

Segmentor cannot self-authorize.

Specialists cannot self-authorize.

Skills cannot self-authorize.

Plugins cannot self-authorize.

MCP tools cannot self-authorize.

Remote agents cannot self-authorize.

Remote devices do not automatically inherit trust.

Camera viewing does not grant recording.

Camera viewing does not grant printer control.

Microphone listening does not grant recording.

Vision analysis does not grant physical control.

CAD creation does not grant printer control.

Voice identification is not sufficient authorization for destructive actions.

Kingdom remains responsible for:

- identity
- capabilities
- approval
- authorization
- revocation
- quarantine
- audit
- privileged execution boundaries

---

# PHASE 37 — DOOMSDAY TESTING

Test at minimum:

- corrupt update
- malicious manifest
- malicious update
- downgrade attack
- replay attack
- network loss during update
- power loss during update
- disk full
- RAM exhaustion
- failed migration
- corrupted system file
- corrupted repair store
- malicious repair
- crash loop
- Recovery Mode failure
- Kingdom disappears
- incompatible Kingdom
- compromised agent
- privilege-escalation attempt
- malicious skill
- malicious plugin
- compromised remote node
- node identity substitution
- network partition
- agent stuck forever
- agent lies about completion
- agent crashes halfway through workflow
- reboot during workflow
- approval expires during reboot
- Ollama disappears
- model crashes
- camera disappears
- malicious camera stream
- unauthorized camera request
- unauthorized recording request
- event flood
- recording fills disk
- local vision exhausts memory
- cloud vision attempted in local-only mode
- printer anomaly false positive
- printer anomaly missed
- unauthorized printer-control attempt
- microphone accessed without permission
- microphone recording attempted without permission
- stolen/revoked phone
- accessibility settings corrupted
- update resets accessibility configuration
- recovery inaccessible to screen-reader/keyboard user

---

# PHASE 38 — ACCESSIBILITY TEST PERSONAS

Run real workflow tests for:

- screen-reader-only operation
- keyboard-only operation
- voice-only operation
- no-audio operation
- no-vision operation
- large text
- high contrast
- reduced motion
- slower speech/input
- limited dexterity
- simple-language/cognitive mode
- installation
- first-run
- update
- repair
- rollback
- Recovery Mode
- Kingdom approval
- security warning
- camera monitoring
- printer monitoring

Do not mark accessibility PROVEN from component-level implementation alone.

---

# PHASE 39 — REPOSITORY CONSOLIDATION

End with one authoritative:

- version source
- manifest schema
- updater
- repair architecture
- recovery architecture
- event bus
- Skill Registry
- Plugin Registry
- Task Ledger
- agent state model
- capability boundary

Remove:

- dead code
- duplicate modules
- obsolete scripts
- obsolete workflows
- stale documentation
- fake artifacts
- hardcoded versions
- conflicting release URLs
- abandoned experiments

Do not remove code until its replacement is verified.

---

# PHASE 40 — RELEASE PROOF

A successful build is NOT a successful release.

Run:

- formatting/lint
- type checks
- unit tests
- integration tests
- Kingdom contract tests
- E2E tests
- accessibility tests
- updater tests
- repair tests
- recovery tests
- multi-agent tests
- multi-device tests
- camera tests
- microphone tests
- vision tests
- CAD tests
- printer safety tests
- low-resource tests
- offline tests
- migration tests
- upgrade-from-old-version tests
- fresh-install tests
- CodeQL/security analysis

Then:

BUILD REAL ARTIFACTS

→ PUBLISH RELEASE

→ DOWNLOAD THE PUBLISHED ARTIFACTS

→ VERIFY SIGNATURES

→ VERIFY CHECKSUMS

→ INSTALL THOSE EXACT ARTIFACTS IN CLEAN ENVIRONMENTS

→ BOOT

→ COMPLETE FIRST RUN

→ START SEGMENTOR

→ VERIFY KINGDOM BOUNDARY

→ TEST UPDATE

→ TEST ROLLBACK

→ TEST REPAIR

→ TEST RECOVERY

→ TEST PERSISTENCE

→ TEST ACCESSIBILITY

→ RUN SMOKE TEST

Only then mark the release PROVEN.

---

# RELEASE REPORT

At completion provide:

## 1. Executive Status

Overall:

PROVEN / NOT PROVEN

## 2. Checklist Matrix

For every major requirement:

Requirement  
Status  
Files  
Tests  
Evidence  
Remaining problem

## 3. Repository Changes

Every meaningful file created, modified, removed or consolidated.

## 4. Security Report

Kingdom boundaries, capabilities, approvals, credentials, cameras, microphones, plugins, skills, remote nodes and physical-device control.

## 5. Reliability Report

Updates, repair, rollback, recovery and persistent state.

## 6. AI Runtime Report

Segmentor, specialists, models, context, tasks and workflows.

## 7. Multimodal Report

Voice, camera, vision, drawing, CAD and printer integration.

## 8. Accessibility Report

What was tested and what remains unproven.

## 9. Distribution Report

Desktop  
ISO  
Live USB  
VM  
Docker  
Android  
iOS

Do not claim blocked mobile signing as completed.

## 10. Release Evidence

Release URL/tag  
Commit SHA  
Artifact names  
Checksums  
Test results  
Smoke-test results

## 11. Remaining Blockers

Be explicit.

Do not disguise missing functionality as future enhancement if it is required for the release.

---

# FINAL PRODUCT STANDARD

The target is not merely:

“Centipede builds.”

The target is:

**INSTALL ONCE.**

**UPDATE IN PARTS.**

**REPAIR ITSELF SAFELY.**

**ROLL BACK WHEN NECESSARY.**

**PRESERVE THE USER'S DATA.**

**KEEP LONG-RUNNING AI WORK ALIVE.**

**LET SEGMENTOR HEAR, SEE, SPEAK, UNDERSTAND AND CREATE.**

**LET USERS SHOW SEGMENTOR REAL-WORLD PROBLEMS.**

**TURN DRAWINGS AND OBJECTS INTO VERIFIED USABLE ARTIFACTS WHERE PRACTICAL.**

**MONITOR AUTHORIZED CAMERAS AND 3D PRINTERS.**

**MAKE THE SYSTEM ACCESSIBLE THROUGH MULTIPLE INPUT AND OUTPUT METHODS.**

**KEEP KINGDOM AS AUTHORITY.**

**KEEP AI OUT OF THE TRUST ROOT.**

**WORK ON LOW-END HARDWARE.**

**BE SIMPLE ENOUGH FOR A NONTECHNICAL USER.**

**REMAIN POWERFUL ENOUGH FOR ADVANCED USERS.**

And most importantly:

**DO NOT STOP AT “CODE ADDED.” STOP AT TESTED, VERIFIED AND DEMONSTRATED.**
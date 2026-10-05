# Accessibility expansion checklist (requirements 520–630)

This file preserves the user-supplied accessibility expansion for implementation and release tracking.

---

Absolutely. I would make **Accessibility a first-class Centipede subsystem**, not a collection of optional settings added at the end. Segmentor talking back is part of that, but the goal should be broader: a person should be able to operate Centipede through whatever combination of **voice, vision, keyboard, mouse, touch, switches, captions, audio, or simplified UI** works for them.

Add this section to the master checklist after the multimodal work:

### Accessibility + two-way Segmentor communication

**520. Segmentor Text-to-Speech** — Segmentor can speak answers, instructions, warnings, task progress, approval requests and results.

**521. Natural Conversation Mode** — speak to Segmentor and have it respond aloud without requiring keyboard interaction for every turn.

**522. Configurable Voice** — voice, speaking rate, pitch where supported, volume and verbosity.

**523. Speech Speed Controls** — including substantially slower speech.

**524. Repeat That** — voice command/button to repeat the previous response.

**525. Read This** — point to/select text, a notification, error, file or UI element and have Segmentor read/explain it.

**526. Explain This** — convert technical system messages into simpler language.

**527. Stop Talking / Pause / Resume** — immediate interruption of Segmentor speech.

**528. Barge-In** — user can start speaking while Segmentor is talking and interrupt it.

**529. Spoken Task Progress** — optional announcements such as “Your model is ready” rather than continuously narrating everything.

**530. Spoken Critical Alerts** — accessibility-aware warnings for failed updates, printer problems, security events, etc.

**531. Headphone/Private Speech Mode** — sensitive spoken responses can be restricted to selected audio devices.

**532. Voice Output Privacy Rules** — don't read passwords, tokens or other protected secrets aloud.

### Accessibility Center

Create:

**Settings → Accessibility**

with a first-run option:

> **Do you want help setting up accessibility features?**

The user can skip it completely.

**533. Accessibility Profiles** — saved combinations rather than making someone configure 30 settings every time.

Examples:

```text
Default
Low Vision
Blind / Screen Reader
Hard of Hearing
Deaf
Limited Mobility
Voice Control
Cognitive Assistance
Reading Assistance
Low Dexterity
Custom
```

These should be starting points, not assumptions about what a person can or cannot do.

### Blind and low-vision support

**534. Full Screen-Reader Compatibility**

**535. Semantic UI Labels** — every button/control needs a meaningful accessible name.

**536. Keyboard Navigation**

**537. Logical Focus Order**

**538. Visible Focus Indicators**

**539. Screen Magnifier**

**540. Adjustable UI Scale**

**541. Adjustable Text Size**

**542. Large-Text Mode**

**543. High-Contrast Mode**

**544. Light/Dark Accessibility Themes**

**545. Color-Blind-Friendly Options**

**546. Never rely on color alone** to communicate status.

Instead of just:

`RED`

use:

`FAILED — Update verification failed`

**547. Reduce Transparency**

**548. Reduce Animation**

**549. Disable Animation Completely**

That also works nicely with the low-resource mode.

**550. Spoken Image Descriptions**

A user could say:

> “Segmentor, what's on this camera?”

or

> “Describe this picture.”

**551. Spoken CAD Description**

For example:

> “This model is a rectangular mounting bracket with four mounting holes. One wall is approximately 3 millimeters thick…”

**552. Spatial Description Mode** — use consistent language such as upper-left, center, clockwise, nearest edge, etc.

### Deaf and hard-of-hearing support

**553. Live Captions**

Anything Segmentor says can simultaneously appear as text.

**554. Microphone Speech Captions**

**555. Notification Captions**

**556. Visual Alerts**

**557. Screen Flash Option**

**558. Phone Vibration/Haptic Alerts**

**559. Never make audio the only critical warning.**

For example, a printer failure could produce:

```text
VOICE
+
SCREEN NOTIFICATION
+
PHONE NOTIFICATION
+
OPTIONAL HAPTIC
```

depending on the user's accessibility profile.

**560. Conversation Transcript**

**561. Speaker Identification where reliable** — but clearly represent uncertainty rather than pretending identification is certain.

### Limited mobility / dexterity

This is where Segmentor could be particularly useful.

**562. Complete Voice Navigation**

The user should be able to say:

> “Open Tasks.”

> “Go back.”

> “Scroll down.”

> “Open the second item.”

> “Close this.”

> “Read that.”

> “Click Approve.”

**563. Numbered Voice Targets**

Centipede can temporarily display:

```text
[1] Approve
[2] Deny
[3] Details
[4] Cancel
```

Then the user simply says:

> “Two.”

**564. Hands-Free Segmentor Mode**

**565. Voice Dictation Everywhere**

**566. Switch-Control Support where platform APIs permit it**

**567. Sticky Keys**

**568. Slow Keys**

**569. Filter/Ignore Accidental Repeated Input**

**570. Larger Click Targets**

**571. Adjustable Double-Click Timing**

**572. Adjustable Hold Timing**

**573. Keyboard-Only Operation**

**574. Custom Keyboard Shortcuts**

**575. One-Handed Interaction Options**

### Cognitive and learning accessibility

I would put substantial effort here because the OS is supposed to be usable by people who aren't computer experts anyway.

**576. Simple Language Mode**

Instead of:

> RPC authentication failed because the Kingdom protocol contract could not be negotiated.

show:

> **Centipede can't securely connect to Kingdom.**

Then:

> **Try Repair**

with:

> **Technical Details**

for advanced users.

**577. Step-by-Step Mode**

Show one decision at a time.

**578. Reduced UI Mode**

Hide unnecessary controls.

**579. Consistent Navigation**

**580. Explain Before Acting**

**581. “Why am I seeing this?”**

**582. “What should I do?”**

**583. “What happens if I press this?”**

Those should be built into Segmentor.

**584. Reading Assistance**

Segmentor can summarize/rephrase difficult text.

**585. Plain-Language Rewriting**

**586. Adjustable Reading Level**

**587. Focus Mode** — reduce unrelated notifications and visual clutter.

**588. Task Checklists**

**589. Resume Where I Was**

If someone gets interrupted, Segmentor can say:

> “You were connecting your printer. We finished the camera setup and still need to test the printer connection. Continue?”

### Speech accessibility

Don't assume everyone speaks in the same manner.

**590. Adjustable Speech Recognition Sensitivity**

**591. Custom Vocabulary**

Useful for names, technical terms, disabilities-related speech patterns, product names and project-specific terms like Kingdom/Segmentor.

**592. Personalized Voice Recognition Profile where supported**

**593. Longer Response Timeout**

Don't assume silence means someone has finished speaking.

**594. Adjustable Pause Detection**

**595. Push-to-Talk Alternative**

**596. Text Alternative for Every Voice Operation**

**597. Don't require wake-word pronunciation for accessibility**

Allow button, keyboard, switch or other activation methods.

### Multimodal accessibility

The powerful part is combining all of this.

A user could:

```text
Speak
  +
Point camera
  +
Touch screen
  +
Upload image
  +
Draw
  +
Type
```

and Segmentor maintains one context.

**598. Mixed-Input Conversation**

A person can say:

> “This part here…”

while pointing through the camera.

**599. Voice + Touch Selection**

> “Make this hole bigger.”

while tapping the hole.

**600. Voice + CAD**

> “Move that mounting hole five millimeters left.”

**601. Camera + Accessibility Description**

> “Tell me when this print finishes.”

**602. Camera Guidance**

Segmentor could guide someone:

> “Move the camera slightly to your right.”

> “A little closer.”

> “I can see the connector now.”

### Accessibility-aware physical tasks

This becomes especially valuable with your printer/camera concept.

Someone with limited mobility could say:

> “Segmentor, start monitoring my printer.”

Segmentor verifies the camera and printer.

Later:

> “The print may be failing. Would you like me to pause it?”

User:

> “Yes.”

Then:

```text
VOICE
 ↓
Intent
 ↓
Segmentor
 ↓
Kingdom authorization
 ↓
Printer Control
 ↓
Verify printer paused
 ↓
Segmentor speaks:
"The printer is paused."
```

The accessibility layer changes **how the user communicates**, but it does **not weaken the security model**.

### Emergency accessibility controls

**603. “Segmentor Stop” universal command**

Stops current Segmentor interaction/task execution where safely possible.

**604. Emergency Mic Mute**

**605. Emergency Camera Disable**

**606. Disable All AI Sensors**

One accessible control:

> **MICROPHONE + CAMERA + PASSIVE SENSORS OFF**

**607. Accessible Safe Mode**

Safe Mode itself must work with keyboard navigation, screen readers, magnification and appropriate speech support.

### Accessibility should survive everything

This is important enough to become a P0 requirement.

**608. Accessibility settings persist through updates.**

**609. Accessibility settings survive repairs.**

**610. Accessibility settings survive rollback.**

**611. Accessibility profile included in protected user-data migration.**

**612. Recovery Mode respects accessibility settings.**

**613. First-run installer is accessible.**

**614. Login/unlock is accessible.**

If somebody depends on a screen reader or enlarged UI to operate their computer, an update cannot reset that configuration and leave them unable to use Centipede.

### Accessibility testing

Add accessibility personas to Q-Man's testing rather than only testing with an able-bodied technical user.

**615. Screen-reader-only test**

**616. Keyboard-only test**

**617. Voice-only test**

**618. No-audio test**

**619. No-vision workflow test**

**620. Large-text test**

**621. High-contrast test**

**622. Reduced-motion test**

**623. Slow-speech/input test**

**624. Limited-dexterity test**

**625. Cognitive/simple-language test**

**626. Accessibility during installation**

**627. Accessibility during update**

**628. Accessibility during failed update/recovery**

**629. Accessibility during Kingdom approval**

**630. Accessibility during emergency/security warning**

This changes the overall Segmentor concept in an important way:

```text
                   USER
                     │
     ┌───────────────┼────────────────┐
     │               │                │
   SPEAK            TYPE             SHOW
     │               │                │
   LISTEN          TOUCH            CAMERA
     │               │                │
     └───────────────┼────────────────┘
                     ↓
            ACCESSIBILITY LAYER
                     ↓
          MULTIMODAL UNDERSTANDING
                     ↓
                 SEGMENTOR
                     ↓
        ANSWER / EXPLAIN / PLAN / ACT
                     ↓
                  KINGDOM
             when authority needed
                     ↓
                   RESULT
                     ↓
       ┌─────────────┼──────────────┐
       │             │              │
     SPEECH        TEXT          VISUAL
       │             │              │
     AUDIO        CAPTIONS       HAPTICS
       └─────────────┼──────────────┘
                     ↓
                    USER
```

So I'd change one of our original Centipede requirements from merely **“someone with no computer knowledge can use it”** to:

> **Centipede must not assume the user can see the screen, hear audio, use a mouse, type quickly, speak conventionally, understand technical terminology, or interact with the computer in only one way. Segmentor adapts the interface to the user while Kingdom keeps the same security boundary underneath.**

That should be a core daily-driver requirement, not post-release polish.

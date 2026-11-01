# Centipede-os Vision: Proactive Agent OS

**Status:** Design direction (not yet implemented)
**Location:** `docs/VISION_PROACTIVE_AGENT_OS.md`
**Last updated:** 2026-10-27
**Audience:** Anyone new to the project who needs to understand where Centipede-os is heading.

---

## One-sentence summary

Centipede-os is becoming a **fully proactive autonomous agent operating system** that remains a normal daily-driver desktop. You can talk to it or text it to give tasks. It can also watch the screen continuously, discover automation opportunities, and act on its own — including temporary root escalation when needed.

Kingdom becomes one specialized **leg** inside Centipede-os (planning, multi-agent reasoning, memory, skills).

---

## Why this document exists

The current Centipede-os codebase is a careful browser desktop + live image companion with strong observation-only boundaries around Kingdom.

This document captures a **new product direction**. It is written so a new contributor can understand the target without reading the full design conversation history.

---

## Core product goals

| Goal | Description |
|------|-------------|
| **Daily driver** | Remains a normal, usable desktop OS experience. The agent does not lock the user out of normal use. |
| **Voice + text interface** | Users can talk to it or type tasks in natural language. |
| **Fully proactive** | By default it looks for opportunities to help and can start work without being asked every time. |
| **Continuous screen vision** | Always watching the desktop to understand what is happening and to find ways to automate the user's tasks. |
| **Computer control** | Can drive the mouse, keyboard, windows, files, and processes. |
| **Root escalation** | Can temporarily elevate to root for specific justified tasks, then drop privileges again. |
| **Emergency stop** | Instant freeze via a Stop button **and** the voice command “stop”. |

---

## High-level architecture

```
Centipede-os (the organism)
│
├── Normal Desktop Environment          ← daily-driver experience
│
├── Perception Leg
│   └── Continuous screen capture + vision
│       (understands windows, UI, text, state, patterns)
│
├── Control Leg
│   ├── User-level actions (mouse, keyboard, windows, clipboard, user files)
│   └── Elevatable actions (packages, services, system files, root)
│
├── Kingdom Leg
│   └── Existing Kingdom system
│       (planning, multi-agent tasks, memory, skills, governance)
│
├── Conversation Interface
│   ├── Voice input / output
│   └── Text chat / command input
│
├── Policy & Autonomy Engine
│   ├── Decides when to act proactively
│   ├── Scores automation opportunities from screen vision
│   ├── Decides when to call Kingdom for deeper planning
│   ├── Decides when privilege escalation is justified
│   └── Maintains goals, constraints, and risk thresholds
│
└── Safety Layer
    ├── Emergency Stop (button + voice “stop”)
    ├── Full action audit log
    └── Automatic privilege drop after elevated work
```

**Key relationship change:**
Kingdom is no longer the top-level system. Centipede-os is the top-level system. Kingdom is a powerful specialized leg that Centipede-os can call when it needs planning, multi-step reasoning, or long-term memory.

---

## How continuous screen vision is used

Continuous screen vision is **not** just passive watching.

Its primary job is:

> Watch the screen in real time so Centipede-os can **discover opportunities to automate the user’s current or recurring tasks**, then carry them out.

---

## Privilege model

- Runs as a **normal user** by default.
- Can **temporarily escalate to root** for a specific justified task.
- Drops privileges immediately after the elevated work finishes.
- Every elevation is logged.

---

## Emergency stop

Two independent triggers:

1. Always-available **Stop button** (or dedicated hotkey)
2. Voice command **“stop”**

When triggered: all actions abort, privileges drop, and the system pauses until the user resumes.

---

## Current vs target

| Aspect                    | Current Centipede-os                          | Target (this vision)                          |
|---------------------------|-----------------------------------------------|-----------------------------------------------|
| Role of Kingdom           | Primary system, Centipede is companion        | Kingdom is one leg inside Centipede-os        |
| Autonomy                  | Mostly observation + explicit approvals       | Fully proactive by default                    |
| Screen understanding      | Limited                                       | Continuous, used to find automation           |
| Computer control          | Very limited                                  | Full user-level + elevatable root             |
| Voice / text tasks        | Not primary                                   | First-class                                   |
| Daily-driver usability    | Browser desktop + live image                  | Full normal desktop that also has the agent   |

---

## Suggested implementation order

1. Continuous screen vision + desktop state model
2. Reliable user-level control
3. Conversation interface (voice + text)
4. Policy Engine with proactive opportunity detection
5. Emergency stop
6. Privilege escalation + drop
7. Deep Kingdom integration as planning leg
8. Broader root-capable actions

This document is a **product and architecture target**, not a claim that the above is already built.

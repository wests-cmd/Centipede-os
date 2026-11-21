# Centipede OS — illustrated video guide and accessible transcript

**Recording type:** captioned, illustrated instruction sequence. This is not a screen recording of a completed permanent installation. The visual guide is embedded at the top of the [repository README](../README.md) and can be opened as [the animated walkthrough](media/quick-start.svg). It contains no audio.

**Software scope:** published **v1.0.1-rc.9 preview** dated October 2026. Newer commits on main are not included in that binary. It is a **live USB**, not an operating-system installer.

## Installation and first-use narration / accessible transcript

| Step | On-screen text | What a new user should do |
| --- | --- | --- |
| 1 | Open the release | Go to [GitHub Releases](https://github.com/wests-cmd/Centipede-os/releases) and choose the published v1.0.1-rc.9 preview. Do not download the Source code ZIP. |
| 2 | Download USB image | Choose `centipede-os-1.0.1-live-usb-x86_64.iso`. Use a spare 8 GB or larger USB, preferably 16 GB. |
| 3 | Flash with Etcher | Install [balenaEtcher](https://etcher.balena.io/). Select the ISO, double-check the USB target by name/size, then flash. **Etcher erases the selected USB.** |
| 4 | Boot from USB | Power off, insert USB, power on, open the device boot menu (often F12/F9/F11/Esc), and choose the USB. |
| 5 | Start live preview | Follow the live/start and first-run screens. The preview runs from the USB; it does not install to the internal disk. |
| 6 | Use Centipede | Use Home to navigate; Segmentor for assistance; Tasks for Kingdom-backed work; Files and Settings as available. Kingdom is a separate service, and not every panel is connected to real host operations. |
| Finish | Shut down safely | Shut down Centipede and remove USB before restarting your existing computer. Data in the live session may not persist. |

## Honest limitations

- Do **not** erase a computer disk or advertise a permanent installer based on this preview.
- The animated guide is a schematic tutorial, not footage proving physical installation.
- Real Kingdom operations require a configured, authenticated Kingdom runtime. A connected-looking UI is not itself execution proof.
- Android preview APKs are not certified mobile releases. iOS distribution remains blocked pending signing.
- A new release and exact-artifact verification are required before this guide can be updated to claim the current main branch is downloadable.

## How to capture an authentic screen-recorded follow-up

On verified test hardware, record these scenes (without disclosing private keys, account tokens or serial numbers):

1. Open the actual GitHub Releases page and select the same exact verified artifact.
2. Flash a disposable USB in Etcher, showing the **erase target** warning.
3. Boot a disposable PC from the USB and reach the first-run screen.
4. Show actual Home, Segmentor, Files, Tasks and Settings behavior; do not present simulated features as real.
5. Demonstrate Kingdom connected/offline states, and explicitly distinguish read-only from owner-authorized actions.
6. Shut down, remove USB, reboot the original OS, and display the test environment and artifact SHA-256.

Publish the actual recording on the verified release page, then update README to embed the real hosted video URL. Never add an unverified video link.

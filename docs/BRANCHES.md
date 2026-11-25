# Branch plan

Full spec (Chinese): https://claude.ai/artifact/B1b5DEiNcVCVYLFNiwTa2g

Each branch starts as a grey-box demo. Once it has been previewed locally and signed off, it is built out fully and merged into `main`.
Branches communicate only through `src/state/store.ts`.

| # | Branch | Scope | Replaces placeholder |
|---|---|---|---|
| 0 | `main` | skeleton: room grey box, camera, Focusable, store | — |
| 1 | `feat/door-intro` | door 12/7/M, knock x3, random door mood, transition | sets `entered` |
| 2 | `feat/room-look` | Type C detail, materials, lighting, day/night | room, Lights |
| 3 | `feat/avatar` | image-to-3D chibi avatar, animations, state machine | `avatar` |
| 4 | `feat/photo-wall` | photos pinned, take down, flip for date + note, empty slots | `photo-wall` |
| 5 | `feat/window-cd-clock` | rain window, CD player (ambient music, no playlist), alarm clock | `window`, `cd-player`, `alarm-clock` |
| 8 | `feat/turntable` | record console + turntable (replaces the CD player): lid, spin-up, needle drop sets `musicOn` | `cd-player` |
| 6 | `feat/croc-tomato` | croc plush + sticker collection, tomato egg, drag tomato near croc | `croc` |
| 7 | `feat/desk-letter` | desk (math modelling), unopened letter, ending | `letter` |

Suggested order: 0 → 1 + 2 → 5, 6 → 3 → 4, 7.

Existing plain three.js demos (project files) to port: room-demo/, site/opening-demo/, demos/easter-eggs/.
Dependencies come from npm only (no CDN).

# Quest Log: agent file

## Reading order
1. This file.
2. InternalDesignGuidelines (JPLuker/InternalDesignGuidelines): README, SOP.md, WORKING-WITH-JOSEPH.md, WORKFLOW.md, then the CODING.md chapter for the work.
3. Open GitHub Issues: handoff notes from the last session.
4. CHANGELOG.md, then the code.

## What it is
An Android to-do list with RPG levels. Joseph uses it as his work to-do list. Type a quest, check it off, rate difficulty 1–5; the rating is the XP. The hero levels up and unlocks nine gear looks (LV 1, 3, 5, 8, 11, 15, 20, 25, 30).

A web UI (`app/src/main/assets/www`: index.html, style.css, app.js) in a WebView. `MainActivity.java` provides `window.Android.load/save/exportBackup/importBackup`. No androidx, no network, no permissions.

## Hard rules
- **Nothing punishes being late.** No due dates, streaks, decay or penalties (Joseph's call).
- **No personal or workplace details** in the app, docs, examples or tests. It has to work as an IT to-do list, but it isn't themed around any job.
- XP is always worked out from finished quests. Never store a running total (two places = drift).
- Saves go through `MainActivity.writeData` (temp file, then rename).
- All art human-made. The current art is CC0 Dungeon Crawl Stone Soup tiles, the same open set QuestScroll used. Check new tiles against `TILES_UNDER_UNKNOWN_LICENSE.md` in crawl/tiles and credit them in CREDITS.md and the app menu.
- Keep `VERSION` and `app.js` `VERSION` the same (`tests/web/version_check.js` fails otherwise).
- Android builds are UNTESTED until Joseph runs one; release them under `vX.Y.Z-untested-android` (RELEASES.md Part 2).

## Every push
- `cd tests/web && npm ci && npm test` passes, and you looked at the screenshots it writes.
- Version bumped in `VERSION` and `app.js`, CHANGELOG.md updated.
- CODING.md Appendix B.

## Identity
- Name: Quest Log (working name; Joseph may rename it)
- Package: `com.jpluker.questlog`
- Signing secrets: `QUESTLOG_ANDROID_*`, set by `android/scripts/setup-signing.sh`

## Deviations
- **Look:** retro pixel RPG (JRPG navy windows, pixel fonts), chosen by Joseph. Not DESIGN.md Part B. The window frames, bars and buttons are drawn in CSS; they're functional UI, not art.
- **WebView app, not native.** The whole UI is testable in headless Chrome, and the only build dependency is the Android Gradle plugin.
- **Gradle comes from the setup-gradle action** (`gradle-version: 8.9`), so there's no wrapper jar in the repo.
- **License:** not chosen yet; ask Joseph (MAINTENANCE.md).

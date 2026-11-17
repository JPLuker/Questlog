# Quest Log

A to-do list with RPG levels, for Android. Type a quest, check it off, rate how hard it was from 1 to 5. That number is the XP. Your hero levels up and picks up new gear along the way.

- No due dates, no streaks, nothing lost for finishing late.
- Works offline. No account, no network access, no permissions.
- Your quests live on your phone. Export a backup from the ☰ menu.

## Install

Download the APK from [Releases](../../releases) and open it on your phone. Android asks you to allow installs from your browser or file app the first time.

## Build

Builds run on GitHub Actions (`.github/workflows/build-android.yml`): web UI tests in headless Chrome, then a signed release APK checked against the pinned signing certificate.

Signing is set up once, on a trusted computer:

```bash
gh repo clone JPLuker/Questlog && cd Questlog && bash android/scripts/setup-signing.sh
```

Releases come from tags. Android builds are labelled untested until one has been run on a phone (RELEASES.md Part 2), so the first tag is `v0.1.0-untested-android`.

## How it's made

The app is a small web page (`app/src/main/assets/www`) inside an Android WebView. `MainActivity.java` saves to a file and handles backup export and import. Tests: `cd tests/web && npm ci && npm test`.

Art and fonts are credited in [CREDITS.md](CREDITS.md) and in the app's menu.

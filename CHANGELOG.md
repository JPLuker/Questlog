# Changelog

## 0.1.1
- Test builds: every push to main makes a "Quest Log TEST" APK (Actions artifact) that installs beside the real app. It uses a throwaway key, so a newer test build needs the old one uninstalled first; export a backup before doing that.
- Pushes to main no longer fail while the signing key isn't set up yet; tags still require it.

## 0.1.0
- Quests: type one and press Enter, tap the box when it's done, rate it 1–5 (green to red). The rating is the XP.
- Hero: levels from XP (each level needs 5 more XP than the last), nine gear looks from LV 1 to LV 30, stats for total XP, quests done, today and best day.
- Log: finished quests by day with their XP; Undo puts a quest back and takes its XP back.
- Tap a quest to edit or delete it.
- Backup export and import from the ☰ menu.
- Retro pixel look with Dungeon Crawl Stone Soup tiles (CC0) and pixel fonts.


// Drives the Quest Log web UI in headless Chrome: add, rate, level up, undo, edit, delete, persistence, back button.
const puppeteer = require("puppeteer-core");
const path = require("path");
const url = "file://" + path.resolve(__dirname, "../../app/src/main/assets/www/index.html");
const fs = require("fs");
const SHOTS = process.env.SHOTS_DIR || path.join(__dirname, "screenshots");
fs.mkdirSync(SHOTS, { recursive: true });
let fails = 0;
const check = (name, ok) => { console.log((ok ? "PASS " : "FAIL ") + name); if (!ok) fails++; };

(async () => {
  const b = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome", args: ["--no-sandbox", "--allow-file-access-from-files"] });
  const p = await b.newPage();
  const errors = [];
  p.on("pageerror", e => errors.push(e.message));
  p.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  await p.setViewport({ width: 400, height: 800, deviceScaleFactor: 2 });
  await p.goto(url);
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  const add = async t => { await p.type("#newQuest", t); await p.keyboard.press("Enter"); };
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const visible = sel => p.$eval(sel, e => !e.hidden).catch(() => false);
  const dollSrcs = sel => p.$$eval(sel + " img", is => is.map(i => i.getAttribute("src")));
  const dismissLoot = async () => { for (let i = 0; i < 3; i++) { if (await visible("#loot")) { await p.click("#lootOk"); await wait(50); } } };

  // ---- First run: title screen, then hero creator ----
  check("title screen opens on first run", await visible("#welcome") && !(await visible("#creator")));
  check("title screen shows 3 heroes", (await p.$$("#welcome .doll")).length === 3 && (await dollSrcs("#wDoll2")).includes("img/doll/head/crown_gold1.png"));
  check("back on title screen leaves the app", (await p.evaluate(() => window.onBack())) === false);
  await p.screenshot({ path: SHOTS + "/w0_title.png" });
  await p.click("#wStart");
  check("creator opens after START", await visible("#creator") && !(await visible("#welcome")));
  check("creator title", (await p.$eval("#crTitle", e => e.textContent)) === "CREATE YOUR HERO");
  check("first-run creator has no cancel", await p.$eval("#crCancel", e => e.hidden));
  check("back on first-run creator leaves the app", (await p.evaluate(() => window.onBack())) === false);
  await p.screenshot({ path: SHOTS + "/c0_creator.png" });
  const before = await dollSrcs("#crDoll");
  await p.click('[data-part="body"][data-step="1"]');
  await p.click('[data-part="skin"][data-step="1"]'); await p.click('[data-part="skin"][data-step="1"]');
  await p.click('[data-part="hair"][data-step="-1"]'); // default hair 1 -> NONE
  await p.click('[data-part="hair"][data-step="-1"]'); // wraps to the last hair
  const after = await dollSrcs("#crDoll");
  check("creator preview changes", JSON.stringify(before) !== JSON.stringify(after));
  check("preview uses body 2, skin 3, last hair", after.includes("img/doll/base/human_f_s2.png") && after.includes("img/doll/hair/djinn2.png"));
  check("creator labels", (await p.$eval("#crBody", e => e.textContent)) === "2/6" && (await p.$eval("#crSkin", e => e.textContent)) === "3/5" && (await p.$eval("#crHair", e => e.textContent)) === "14/14");
  await p.type("#crName", "Tester");
  await p.screenshot({ path: SHOTS + "/c1_creator_changed.png" });
  const tinyCr = await p.evaluate(() => Array.from(document.querySelectorAll("#creator button, #creator input")).filter(e => e.offsetParent)
    .map(e => e.getBoundingClientRect()).filter(r => r.width < 44 || r.height < 44).length);
  check("creator touch targets >= 44px", tinyCr === 0);
  await p.click("#crDone");
  check("creator closes", !(await visible("#creator")));
  check("HUD hero uses chosen look", (await dollSrcs("#hudHero")).includes("img/doll/base/human_f_s2.png"));

  // ---- Guided tour on the first quest ----
  const coach = () => p.$eval("#coachText", e => e.textContent);
  const stepNo = () => p.$eval("#coachStep", e => e.textContent);
  const target = () => p.evaluate(() => { const t = document.querySelector(".coach-on"); return t ? (t.id || t.className) : ""; });
  check("tour 1: add", await visible("#coach") && (await coach()).includes("TYPE A QUEST") && (await target()) === "addForm" && (await stepNo()) === "1/12");
  await p.screenshot({ path: SHOTS + "/t01_add.png" });
  await add("Update the wiki page");
  check("tour 2: open the quest", (await coach()).includes("TAP YOUR QUEST") && (await target()).includes("q-text"));
  await p.screenshot({ path: SHOTS + "/t02_note.png" });
  await p.click(".quest .q-text"); await wait(150);
  check("tour 3: notes box, shown over the sheet", await visible("#coach") && (await coach()).includes("ADD NOTES") && (await target()).includes("notes"));
  await p.screenshot({ path: SHOTS + "/t03_notesave.png" });
  await p.type("#sheetBox textarea.notes", "Page 12");
  await p.click('#sheetBox [data-act="save"]');
  check("tour 4: tap the box", (await coach()).includes("TAP THE BOX") && (await target()).includes("q-check"));
  await p.click(".quest .q-check");
  check("tour 5: rate", (await coach()).includes("1 IS EASY") && (await target()).includes("rate"));
  await p.screenshot({ path: SHOTS + "/t05_rate.png" });
  const bubble = await p.$eval("#coach", e => e.getBoundingClientRect().toJSON());
  const rateBox = await p.$eval(".quest .rate", e => e.getBoundingClientRect().toJSON());
  check("bubble doesn't cover the rating buttons", bubble.top >= rateBox.bottom || bubble.bottom <= rateBox.top);
  await p.click(".rate .r2"); await wait(600);
  check("first quest always drops loot", await visible("#loot") && (await p.$eval("#lootWhat", e => e.textContent)).startsWith("NEW "));
  check("tour waits behind the loot popup", !(await visible("#coach")));
  check("badge toasts for first quest and first loot, two at most", (await p.$eval("#toasts", e => e.textContent)).includes("FIRST QUEST") && (await p.$eval("#toasts", e => e.textContent)).includes("FIRST LOOT") && (await p.$$("#toasts .toast")).length <= 2);
  await p.screenshot({ path: SHOTS + "/l1_first_loot.png" });
  await p.click("#lootWear"); await wait(100);
  check("WEAR IT puts it on the hero", (await p.evaluate(() => Object.keys(JSON.parse(localStorage.getItem("questlog-data")).hero.equip).length)) === 1);
  check("tour 6: XP bar with OK", (await coach()).includes("XP FILLS") && (await target()).includes("hud") && await visible("#coachOk"));
  await p.screenshot({ path: SHOTS + "/t06_xp.png" });
  await p.click("#coachOk");
  check("tour 7: hero tab", (await coach()).includes("TAP HERO") && (await target()).includes("tab"));
  await p.screenshot({ path: SHOTS + "/t07_herotab.png" });
  await p.click('.tab[data-view="hero"]');
  check("tour 8: gear", (await coach()).includes("NEW GEAR") && (await target()).startsWith("win") && (await p.$eval(".coach-on", e => !!e.querySelector("#gearGrid"))) && await visible("#coachOk"));
  await p.screenshot({ path: SHOTS + "/t08_gear.png" });
  await p.click("#coachOk");
  check("tour 9: log tab", (await coach()).includes("TAP LOG"));
  await p.click('.tab[data-view="log"]');
  check("tour 10: log entry", (await coach()).includes("LAND HERE") && (await target()).includes("entry"));
  await p.screenshot({ path: SHOTS + "/t10_entry.png" });
  await p.click("#coachOk");
  check("tour 11: menu", (await coach()).includes("THE MENU") && (await target()) === "settingsBtn");
  await p.screenshot({ path: SHOTS + "/t11_menu.png" });
  await p.click("#coachOk");
  check("tour 12: closing line, back on quests, no skip", (await coach()).includes("NO PENALTIES") && await visible("#view-quests") && !(await visible("#coachSkip")) && (await stepNo()) === "12/12");
  await p.screenshot({ path: SHOTS + "/t12_end.png" });
  await p.click("#coachOk");
  check("tutorial finishes", !(await visible("#coach")) && (await p.$$(".coach-on")).length === 0);
  check("tour quest kept its note", (await p.evaluate(() => JSON.parse(localStorage.getItem("questlog-data")).tasks[0].note)) === "Page 12");
  await p.reload();
  check("tutorial stays finished and hero kept after reload", !(await visible("#coach")) && !(await visible("#creator")) && (await dollSrcs("#hudHero")).includes("img/doll/hair/djinn2.png"));

  // Tutorial again from the menu, then Skip
  await p.click("#settingsBtn");
  await p.click('#sheetBox [data-act="tutorial"]');
  check("menu restarts tutorial", await visible("#coach") && (await coach()).includes("TYPE A QUEST"));
  await p.click("#coachSkip");
  check("skip ends tutorial", !(await visible("#coach")));

  // Edit hero from the Hero tab
  await p.click('.tab[data-view="hero"]');
  check("hero card shows name", (await p.$eval("#heroName", e => e.textContent)) === "Tester");
  await p.click("#editHeroBtn");
  check("edit opens with cancel", await visible("#creator") && !(await p.$eval("#crCancel", e => e.hidden)));
  await p.click('[data-part="hair"][data-step="1"]'); // wraps to no hair
  check("hair NONE", (await p.$eval("#crHair", e => e.textContent)) === "NONE");
  await p.click("#crCancel");
  check("cancel keeps old look", (await dollSrcs("#heroBig")).includes("img/doll/hair/djinn2.png"));
  await p.click("#editHeroBtn");
  await p.click('[data-part="hair"][data-step="1"]');
  await p.click("#crDone");
  check("save applies new look", !(await dollSrcs("#heroBig")).some(s => s.includes("/hair/")));

  // ---- Main flow from a clean save with the hero made and tutorial done ----
  await p.evaluate(() => localStorage.setItem("questlog-data", JSON.stringify({ v: 1, tasks: [], hero: { name: "", body: 0, skin: 0, hair: 1 }, tut: "done" })));
  await p.reload();
  check("no creator or tutorial for a finished save", !(await visible("#creator")) && !(await visible("#coach")));
  await p.screenshot({ path: SHOTS + "/s0_empty.png" });

  for (const t of ["Reimage HP laptop for new hire", "Reset MFA for front desk", "Patch Tuesday check on file server", "Replace toner in admin printer"]) await add(t);
  check("4 quests listed", (await p.$$(".quest")).length === 4);
  check("input keeps focus after add", await p.evaluate(() => document.activeElement.id === "newQuest"));
  await p.screenshot({ path: SHOTS + "/s1_list.png" });

  // open picker on first quest
  await p.click(".quest .q-check");
  check("rating picker shows 5 + cancel", (await p.$$(".rate button")).length === 6);
  await p.screenshot({ path: SHOTS + "/s2_rate.png" });
  await p.click(".rate .r5");
  await new Promise(r => setTimeout(r, 600));
  await dismissLoot();
  check("quest removed after rating", (await p.$$(".quest")).length === 3);
  check("HUD shows 5/10", (await p.$eval("#hudXp", e => e.textContent)) === "5/10");

  // rate two more at 4 and 3 => 12 XP total => LV2 with 2/15
  await p.click(".quest .q-check"); await p.click(".rate .r4"); await wait(600); await dismissLoot();
  await p.click(".quest .q-check"); await p.click(".rate .r3"); await wait(600);
  check("level up overlay shown", await p.$eval("#levelUp", e => !e.hidden));
  check("level up says LV 2", (await p.$eval("#luLevel", e => e.textContent)) === "LV 2");
  await p.screenshot({ path: SHOTS + "/s3_levelup.png" });
  check("back closes overlay", await p.evaluate(() => window.onBack()) && await p.$eval("#levelUp", e => e.hidden));
  await dismissLoot(); // a drop queued behind the level-up
  check("HUD LV 2 2/15", (await p.$eval("#hudLevel", e => e.textContent)) === "LV 2" && (await p.$eval("#hudXp", e => e.textContent)) === "2/15");

  // edit last quest
  await p.click(".quest .q-text");
  await p.$eval("#sheetBox input", e => e.value = "Replace toner in admin printer (2nd floor)");
  await p.click('#sheetBox [data-act="save"]');
  check("edit saved", (await p.$eval(".quest .q-text", e => e.textContent)).includes("2nd floor"));

  // Notes
  await p.click(".quest .q-text");
  await wait(150);
  check("notes box opens focused", await p.evaluate(() => document.activeElement.classList.contains("notes")));
  await p.type("#sheetBox textarea.notes", "\n  Ticket 4821\nCheck after the reboot\nCall back if it fails");
  await p.screenshot({ path: SHOTS + "/n1_notes_edit.png" });
  await p.click('#sheetBox [data-act="save"]');
  check("first non-blank note line shows under the quest", (await p.$eval(".quest .q-note", e => e.textContent)) === "Ticket 4821");
  check("title unchanged by notes", (await p.$eval(".quest .t", e => e.textContent)).includes("2nd floor"));
  await p.screenshot({ path: SHOTS + "/n2_notes_list.png" });
  await p.reload();
  check("notes persist", (await p.evaluate(() => JSON.parse(localStorage.getItem("questlog-data")).tasks.find(t => t.note).note)) === "\n  Ticket 4821\nCheck after the reboot\nCall back if it fails");
  await p.click(".quest .q-text");
  check("notes reopen intact", (await p.$eval("#sheetBox textarea.notes", e => e.value)).includes("Call back if it fails"));
  await p.$eval("#sheetBox textarea.notes", e => { e.value = "   "; });
  await p.click('#sheetBox [data-act="save"]');
  check("clearing notes removes the preview", (await p.$$(".quest .q-note")).length === 0);
  await p.click(".quest .q-text");
  await p.type("#sheetBox textarea.notes", "Toner is in the supply closet");
  await p.click('#sheetBox [data-act="save"]');

  // persistence
  await p.reload();
  check("persists after reload", (await p.$$(".quest")).length === 1 && (await p.$eval("#hudLevel", e => e.textContent)) === "LV 2");

  // hero tab
  await p.click('.tab[data-view="hero"]');
  check("hero total xp 12", (await p.$eval("#stTotal", e => e.textContent)) === "12");
  check("9 gear slots, 8 locked", (await p.$$("#gearGrid .gear-slot")).length === 9 && (await p.$$("#gearGrid .gear-slot.locked")).length === 8);
  await p.screenshot({ path: SHOTS + "/s4_hero.png", fullPage: true });

  // log tab + undo
  await p.click('.tab[data-view="log"]');
  check("log has 3 entries", (await p.$$(".entry")).length === 3);
  await p.click(".entry .body");
  check("log entry opens the quest with its notes", await p.$eval("#sheet", e => !e.hidden) && (await p.$eval("#sheetBox textarea.notes", e => e.value)) !== null);
  await p.evaluate(() => window.onBack());
  await p.screenshot({ path: SHOTS + "/s5_log.png" });
  await p.click(".entry .undo");
  check("undo removes XP (LV back to 1)", (await p.$eval("#hudLevel", e => e.textContent)) === "LV 1");
  check("back from log goes to quests", await p.evaluate(() => window.onBack()) && await p.$eval("#view-quests", e => !e.hidden));
  check("undone quest back in list", (await p.$$(".quest")).length === 2);
  check("back on quests returns false", (await p.evaluate(() => window.onBack())) === false);

  // high level look + bad import
  await p.evaluate(() => {
    const tasks = []; for (let i = 0; i < 700; i++) tasks.push({ id: "x" + i, text: "Ticket " + i, created: i, done: true, rating: 4, doneAt: Date.now() - i * 3600000 });
    window.onBackupImported(JSON.stringify({ v: 1, tasks }));
  });
  await p.click('#sheetBox [data-act="replace"]');
  check("backup without a hero opens the creator", await visible("#creator"));
  check("old save with quests skips the tutorial", (await p.evaluate(() => JSON.parse(localStorage.getItem("questlog-data")).tut)) === "done");
  await p.click("#crDone");
  await p.click('.tab[data-view="hero"]');
  check("high level shows top tier", (await dollSrcs("#heroBig")).includes("img/doll/head/crown_gold1.png"));
  await p.screenshot({ path: SHOTS + "/s6_hero_high.png", fullPage: true });
  await p.evaluate(() => window.onBackupImported("not json"));
  check("bad backup rejected", (await p.$eval("#sheetBox", e => e.textContent)).includes("ISN'T"));

  // Accessibility floors (DESIGN.md A8): text >= 12px, touch targets >= 48px, no sideways scroll at 320px.
  await p.evaluate(() => window.onBack()); // close the "isn't a backup" sheet
  await p.click('.tab[data-view="quests"]');
  await add("Check backups on the NAS");
  await p.click(".quest .q-check");
  for (const v of ["quests", "hero", "log"]) {
    await p.click('.tab[data-view="' + v + '"]');
    const small = await p.evaluate(() => {
      const bad = [];
      document.querySelectorAll("body *").forEach(e => {
        if (!e.offsetParent && e.tagName !== "BODY") return;
        const own = Array.from(e.childNodes).some(n => n.nodeType === 3 && n.textContent.trim());
        if (own && parseFloat(getComputedStyle(e).fontSize) < 12) bad.push(e.className + ":" + e.textContent.trim().slice(0, 20));
      });
      return bad;
    });
    check("text >= 12px on " + v + " " + JSON.stringify(small), small.length === 0);
  }
  await p.click('.tab[data-view="quests"]');
  await p.click(".quest .q-check");
  const tiny = await p.evaluate(() => Array.from(document.querySelectorAll("button, input, [role=button]"))
    .filter(e => e.offsetParent)
    .map(e => { const r = e.getBoundingClientRect(); return { c: e.className || e.id, w: Math.round(r.width), h: Math.round(r.height) }; })
    .filter(r => r.w < 44 || r.h < 44));
  check("touch targets >= 44px " + JSON.stringify(tiny), tiny.length === 0);
  await p.setViewport({ width: 320, height: 640, deviceScaleFactor: 2 });
  for (const v of ["quests", "hero", "log"]) {
    await p.click('.tab[data-view="' + v + '"]');
    const over = await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth || document.getElementById("views").scrollWidth > document.getElementById("views").clientWidth);
    check("no sideways scroll at 320px on " + v, !over);
    await p.screenshot({ path: SHOTS + "/s7_320_" + v + ".png" });
  }

  // ================= 0.5.0 features, from a clean save =================
  await p.setViewport({ width: 400, height: 800, deviceScaleFactor: 2 });
  await p.evaluate(() => localStorage.setItem("questlog-data", JSON.stringify({ v: 1, tasks: [], hero: { name: "", body: 0, skin: 0, hair: 1 }, tut: "done" })));
  await p.reload();
  const data = () => p.evaluate(() => JSON.parse(localStorage.getItem("questlog-data")));

  // Checklist
  await add("Set up a new user account");
  await p.click(".quest .q-text"); await wait(120);
  for (const st of ["Create the account", "Add to groups", "Send the welcome email"]) { await p.type(".step-add input", st); await p.keyboard.press("Enter"); }
  check("3 steps added", (await p.$$("#sheetBox .step")).length === 3);
  await p.click("#sheetBox .step .step-check");
  check("ticking a step marks it", (await p.$eval("#sheetBox .step", e => e.classList.contains("done"))) && (await p.$eval("#sheetBox .step .step-check", e => e.getAttribute("aria-pressed"))) === "true");
  await p.type("#sheetBox textarea.notes", "Badge photo pending");
  await p.screenshot({ path: SHOTS + "/v1_checklist.png" });
  // Tap outside the sheet: edits are kept
  await p.mouse.click(200, 30);
  check("tapping outside keeps edits", (await data()).tasks[0].steps.length === 3 && (await data()).tasks[0].note === "Badge photo pending");
  check("list shows checklist progress", (await p.$eval(".quest .q-steps", e => e.textContent)) === "STEPS 1/3");
  await p.click(".quest .q-text"); await wait(120);
  await p.click("#sheetBox .step:nth-child(2) .step-x");
  check("remove a step", (await p.$$("#sheetBox .step")).length === 2);
  await p.type(".step-add input", "Order a laptop"); // typed but not added: still kept on save
  await p.click('#sheetBox [data-act="save"]');
  check("pending step kept on save", (await data()).tasks[0].steps.map(x => x.t).join("|") === "Create the account|Send the welcome email|Order a laptop");

  // Templates
  await p.click(".quest .q-text"); await wait(120);
  await p.click('#sheetBox [data-act="template"]');
  check("save as template", (await data()).templates.length === 1 && (await data()).templates[0].steps.every(x => !x.d));
  await p.click('#sheetBox [data-act="save"]');
  await p.click("#templatesBtn");
  check("templates sheet lists it", (await p.$$("#sheetBox .tpl")).length === 1);
  await p.screenshot({ path: SHOTS + "/v2_templates.png" });
  await p.click("#sheetBox .tpl-add");
  check("template adds a fresh quest", (await data()).tasks.length === 2 && (await data()).tasks[1].steps.every(x => !x.d) && (await data()).tasks[1].note === "Badge photo pending");
  await p.click("#sheetBox .tpl .step-x");
  check("delete template", (await data()).templates.length === 0 && (await p.$eval("#sheetBox", e => e.textContent)).includes("NONE YET"));
  await p.evaluate(() => window.onBack());

  // Share into the app
  await p.evaluate(() => window.onShared("Printer jam on 3rd floor", "Ticket 991\nUser says tray 2 jams"));
  check("share opens a prefilled quest", (await p.$eval("#sheetBox input", e => e.value)) === "Printer jam on 3rd floor" && (await p.$eval("#sheetBox textarea.notes", e => e.value)).includes("tray 2"));
  await p.screenshot({ path: SHOTS + "/v3_share.png" });
  await p.click('#sheetBox [data-act="add"]');
  check("shared quest added", (await data()).tasks.some(t => t.text === "Printer jam on 3rd floor" && t.note.includes("Ticket 991")));
  await p.evaluate(() => window.onShared("", "Restart the print spooler"));
  check("share without subject: text becomes the title, no duplicate note", (await p.$eval("#sheetBox input", e => e.value)) === "Restart the print spooler" && (await p.$eval("#sheetBox textarea.notes", e => e.value)) === "");
  await p.click('#sheetBox [data-act="cancel"]');
  check("cancel adds nothing", (await data()).tasks.length === 3);

  // Finish the shared quest, then search and the weekly summary
  const finishByText = async (txt, n) => {
    const i = await p.$$eval(".quest .t", (ts, txt) => ts.findIndex(t => t.textContent === txt), txt);
    await (await p.$$(".quest .q-check"))[i].click(); await p.click(".rate .r" + n); await wait(600); await dismissLoot();
  };
  await finishByText("Printer jam on 3rd floor", 3);
  await finishByText("Set up a new user account", 4);
  await p.click('.tab[data-view="log"]');
  await p.type("#logSearch", "tray");
  check("search finds by notes", (await p.$$(".entry")).length === 1 && (await p.$eval(".result-count", e => e.textContent)) === "1 RESULT");
  await p.screenshot({ path: SHOTS + "/v4_search.png" });
  await p.$eval("#logSearch", e => { e.value = "welcome email"; e.dispatchEvent(new Event("input")); });
  check("search finds by checklist steps (all words)", (await p.$$(".entry")).length === 1);
  await p.$eval("#logSearch", e => { e.value = "zzz"; e.dispatchEvent(new Event("input")); });
  check("no matches", (await p.$$(".entry")).length === 0 && (await p.$eval(".result-count", e => e.textContent)) === "0 RESULTS");
  await p.$eval("#logSearch", e => { e.value = ""; e.dispatchEvent(new Event("input")); });
  check("clear search shows all", (await p.$$(".entry")).length === 2);
  await p.evaluate(() => { window.__copied = null; const orig = document.execCommand.bind(document); document.execCommand = c => { if (c === "copy") { window.__copied = document.activeElement.value; return true; } return orig(c); }; });
  await p.click("#weekBtn");
  check("week summary totals", (await p.$eval(".week-mid", e => e.textContent)).includes("2 QUESTS · 7 XP") && (await p.$eval(".week-mid", e => e.textContent)).includes("THIS WEEK"));
  check("next week disabled on this week", await p.$eval('#sheetBox [aria-label="Next week"]', e => e.disabled));
  await p.screenshot({ path: SHOTS + "/v5_week.png" });
  await p.click('#sheetBox [data-act="copy"]');
  const copied = await p.evaluate(() => window.__copied || "");
  check("copy gives a plain-text week", copied.startsWith("Week of ") && copied.includes("2 quests, 7 XP") && copied.includes("- Printer jam on 3rd floor") && (await p.$eval('#sheetBox [data-act="copy"]', e => e.textContent)) === "COPIED");
  await p.click('#sheetBox [aria-label="Previous week"]');
  check("previous week is empty", (await p.$eval("#sheetBox", e => e.textContent)).includes("NOTHING FINISHED THIS WEEK") && await p.$eval('#sheetBox [data-act="copy"]', e => e.disabled));
  await p.evaluate(() => window.onBack());

  // Loot, wearing it, undo takes it back
  const d1 = await data();
  const dropped = d1.tasks.filter(t => t.done && t.drop);
  check("first finished quest dropped loot", dropped.length >= 1 && dropped.some(t => t.text === "Printer jam on 3rd floor"));
  const lootId = dropped[0].drop, slot = lootId.split("/")[0];
  await p.evaluate((slot, id) => { const d = JSON.parse(localStorage.getItem("questlog-data")); d.hero.equip = {}; d.hero.equip[slot] = id; localStorage.setItem("questlog-data", JSON.stringify(d)); }, slot, lootId);
  await p.reload();
  check("worn loot drawn on the hero", (await dollSrcs("#hudHero")).includes("img/doll/" + lootId + ".png"));
  await p.click('.tab[data-view="hero"]');
  check("loot section counts it", (await p.$eval("#lootCount", e => e.textContent)) === dropped.length + "/45" && (await p.$$("#lootGrid .gear-slot.current")).length === 1);
  check("gear row ignores cosmetics", !(await dollSrcs("#gearGrid .gear-slot")).includes("img/doll/" + lootId + ".png"));
  check("badges listed", (await p.$$("#badgeGrid .badge-card")).length === 22 && (await p.$$("#badgeGrid .badge-card:not(.locked)")).length >= 2);
  await p.screenshot({ path: SHOTS + "/v6_hero_loot.png", fullPage: true });
  await p.click("#editHeroBtn");
  check("creator shows loot rows when editing", await p.$eval("#crRow-" + slot, e => !e.hidden) && (await p.$eval("#crEq-" + slot, e => e.textContent)) === "1/" + dropped.filter(t => t.drop.startsWith(slot)).length);
  await p.screenshot({ path: SHOTS + "/v7_creator_loot.png" });
  await p.click('[data-part="' + slot + '"][data-step="-1"]');
  check("cycle back to GEAR", (await p.$eval("#crEq-" + slot, e => e.textContent)) === "GEAR");
  await p.click("#crCancel");
  const owner = d1.tasks.find(t => t.drop === lootId);
  await p.click('.tab[data-view="log"]');
  const idx = await p.$$eval(".entry .t", (ts, txt) => ts.findIndex(t => t.textContent === txt), owner.text);
  await (await p.$$(".entry .undo"))[idx].click();
  check("undo removes the drop and takes it off the hero", !(await data()).tasks.find(t => t.id === owner.id).drop && !Object.values((await data()).hero.equip).includes(lootId));
  await p.click('.tab[data-view="hero"]');
  const sumRatings = (await data()).tasks.filter(t => t.done).reduce((n, t) => n + t.rating, 0);
  check("total XP is only the ratings (loot adds nothing)", (await p.$eval("#stTotal", e => e.textContent)) === String(sumRatings));

  // Sound and vibration toggles
  await p.click("#settingsBtn");
  await p.click('#sheetBox [data-act="sound"]');
  check("sound toggles off", (await data()).prefs.sound === false && (await p.$eval('#sheetBox [data-act="sound"]', e => e.textContent)) === "SOUND: OFF");
  await p.click('#sheetBox [data-act="vibration"]');
  check("vibration toggles off", (await data()).prefs.haptics === false);
  await p.screenshot({ path: SHOTS + "/v8_menu.png" });
  check("credits name the sounds", (await p.$eval("#sheetBox", e => e.textContent)).includes("Kenney"));
  await p.evaluate(() => window.onBack());

  // Floors on the new sheets
  await p.click('.tab[data-view="quests"]');
  await p.click(".quest .q-text"); await wait(120);
  const floor = await p.evaluate(() => {
    const small = [], tiny = [];
    document.querySelectorAll("#sheetBox *").forEach(e => {
      if (!e.offsetParent) return;
      const own = Array.from(e.childNodes).some(n => n.nodeType === 3 && n.textContent.trim());
      if (own && parseFloat(getComputedStyle(e).fontSize) < 12) small.push(e.className);
      if (e.matches("button, input, textarea")) { const r = e.getBoundingClientRect(); if (r.width < 44 || r.height < 44) tiny.push(e.className); }
    });
    return { small, tiny };
  });
  check("quest sheet floors " + JSON.stringify(floor), !floor.small.length && !floor.tiny.length);
  await p.evaluate(() => window.onBack());

  check("no page errors (" + errors.join(" | ") + ")", errors.length === 0);
  await b.close();
  console.log(fails ? fails + " FAILED" : "ALL PASSED");
  process.exit(fails ? 1 : 0);
})();

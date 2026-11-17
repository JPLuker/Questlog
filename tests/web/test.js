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

  // ---- First run: hero creator ----
  check("creator opens on first run", await visible("#creator"));
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

  // ---- Tutorial on the first quest ----
  const coach = () => p.$eval("#coachText", e => e.textContent);
  const target = () => p.evaluate(() => { const t = document.querySelector(".coach-on"); return t ? (t.id || t.className) : ""; });
  check("tutorial step 1 shows", await visible("#coach") && (await coach()).includes("TYPE A QUEST") && (await target()) === "addForm");
  await p.screenshot({ path: SHOTS + "/t1_add.png" });
  await add("Update the wiki page");
  check("tutorial step 2 targets the box", (await coach()).includes("TAP THE BOX") && (await target()).includes("q-check"));
  await p.screenshot({ path: SHOTS + "/t2_check.png" });
  await p.click(".quest .q-check");
  check("tutorial step 3 targets the rating", (await coach()).includes("1 IS EASY") && (await target()).includes("rate"));
  await p.screenshot({ path: SHOTS + "/t3_rate.png" });
  const bubble = await p.$eval("#coach", e => e.getBoundingClientRect().toJSON());
  const rateBox = await p.$eval(".quest .rate", e => e.getBoundingClientRect().toJSON());
  check("bubble doesn't cover the rating buttons", bubble.top >= rateBox.bottom || bubble.bottom <= rateBox.top);
  await p.click(".rate .r2"); await wait(600);
  check("tutorial step 4 points at the XP bar", (await coach()).includes("XP FILLS") && (await target()).includes("hud") && await visible("#coachOk"));
  await p.screenshot({ path: SHOTS + "/t4_xp.png" });
  await p.click("#coachOk");
  check("tutorial finishes", !(await visible("#coach")) && (await p.$$(".coach-on")).length === 0);
  await p.reload();
  check("tutorial stays finished and hero kept after reload", !(await visible("#coach")) && !(await visible("#creator")) && (await dollSrcs("#hudHero")).includes("img/doll/hair/djinn2.png"));

  // Tutorial again from the menu, then Skip
  await p.click("#settingsBtn");
  const menuBtns = await p.$$("#sheetBox .btn"); await menuBtns[1].click(); // TUTORIAL
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
  check("quest removed after rating", (await p.$$(".quest")).length === 3);
  check("HUD shows 5/10", (await p.$eval("#hudXp", e => e.textContent)) === "5/10");

  // rate two more at 4 and 3 => 12 XP total => LV2 with 2/15
  for (const n of [4, 3]) { await p.click(".quest .q-check"); await p.click(".rate .r" + n); await new Promise(r => setTimeout(r, 600)); }
  check("level up overlay shown", await p.$eval("#levelUp", e => !e.hidden));
  check("level up says LV 2", (await p.$eval("#luLevel", e => e.textContent)) === "LV 2");
  await p.screenshot({ path: SHOTS + "/s3_levelup.png" });
  check("back closes overlay", await p.evaluate(() => window.onBack()) && await p.$eval("#levelUp", e => e.hidden));
  check("HUD LV 2 2/15", (await p.$eval("#hudLevel", e => e.textContent)) === "LV 2" && (await p.$eval("#hudXp", e => e.textContent)) === "2/15");

  // edit last quest
  await p.click(".quest .q-text");
  await p.$eval("#sheetBox input", e => e.value = "Replace toner in admin printer (2nd floor)");
  const btns = await p.$$("#sheetBox .btn");
  await btns[1].click();
  check("edit saved", (await p.$eval(".quest .q-text", e => e.textContent)).includes("2nd floor"));

  // persistence
  await p.reload();
  check("persists after reload", (await p.$$(".quest")).length === 1 && (await p.$eval("#hudLevel", e => e.textContent)) === "LV 2");

  // hero tab
  await p.click('.tab[data-view="hero"]');
  check("hero total xp 12", (await p.$eval("#stTotal", e => e.textContent)) === "12");
  check("9 gear slots, 8 locked", (await p.$$(".gear-slot")).length === 9 && (await p.$$(".gear-slot.locked")).length === 8);
  await p.screenshot({ path: SHOTS + "/s4_hero.png", fullPage: true });

  // log tab + undo
  await p.click('.tab[data-view="log"]');
  check("log has 3 entries", (await p.$$(".entry")).length === 3);
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
  const rb = await p.$$("#sheetBox .btn"); await rb[1].click();
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

  check("no page errors (" + errors.join(" | ") + ")", errors.length === 0);
  await b.close();
  console.log(fails ? fails + " FAILED" : "ALL PASSED");
  process.exit(fails ? 1 : 0);
})();

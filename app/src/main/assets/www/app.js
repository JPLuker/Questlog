(function () {
  "use strict";

  var VERSION = "0.3.0";
  var KEY = "questlog-data";

  /* ---------------- hero parts (img/doll) ---------------- */
  var BODIES = ["human_m", "human_f", "elf_m", "elf_f", "dwarf_m", "dwarf_f"];
  var SKINS = 5; // img/doll/base/<body>_s0..s4.png
  var HAIRS = [null, "brown1", "brown2", "elf_black", "fem_black", "fem_red", "fem_white", "fem_yellow", "knot_red",
    "pigtail_red", "pigtails_brown", "pigtails_yellow", "ponytail_yellow", "djinn1", "djinn2"];
  // Gear the hero picks up. Each tier adds to or replaces the slots before it.
  var TIERS = [
    { lv: 1, set: { legs: "pants_brown", body: "shirt_white1", hand1: "knife" } },
    { lv: 3, set: { boots: "middle_ybrown" } },
    { lv: 5, set: { body: "leather_jacket", hand1: "short_sword" } },
    { lv: 8, set: { hand2: "buckler_round" } },
    { lv: 11, set: { gloves: "glove_brown", head: "hood_gray" } },
    { lv: 15, set: { body: "jacket_stud", legs: "leg_armour03", hand1: "long_sword_slant" } },
    { lv: 20, set: { cloak: "red", hand2: "shield_kite1", boots: "middle_gray" } },
    { lv: 25, set: { body: "half_plate", head: "helm_plume", gloves: "glove_gray" } },
    { lv: 30, set: { body: "plate_black", hand1: "heavy_sword", head: "crown_gold1", cloak: "blue" } }
  ];
  var LAYERS = ["cloak", "base", "boots", "legs", "body", "gloves", "hand1", "hand2", "hair", "head"];
  var TUT_STEPS = ["add", "check", "rate", "xp", "done"];

  /* ---------------- storage ---------------- */
  var bridge = window.Android || null;
  var Store = {
    load: function () {
      try {
        var raw = bridge ? bridge.load() : localStorage.getItem(KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (e) { return null; }
    },
    save: function (data) {
      var json = JSON.stringify(data);
      try { if (bridge) bridge.save(json); else localStorage.setItem(KEY, json); } catch (e) {}
    }
  };

  function blank() { return { v: 1, tasks: [], hero: null, tut: "add" }; }
  function clampInt(v, max) { v = Math.round(Number(v)); return v >= 0 && v < max ? v : 0; }
  function cleanHero(h) {
    if (!h || typeof h !== "object") return null;
    return { name: typeof h.name === "string" ? h.name.trim().slice(0, 14) : "", body: clampInt(h.body, BODIES.length),
      skin: clampInt(h.skin, SKINS), hair: clampInt(h.hair, HAIRS.length) };
  }
  function sanitize(d) {
    if (!d || !Array.isArray(d.tasks)) return null;
    var tasks = d.tasks.filter(function (t) { return t && typeof t.text === "string" && t.id; }).map(function (t) {
      var r = Number(t.rating);
      return {
        id: String(t.id), text: t.text.slice(0, 300), note: typeof t.note === "string" ? t.note.slice(0, 4000) : "",
        created: Number(t.created) || Date.now(),
        done: !!t.done && r >= 1 && r <= 5, rating: r >= 1 && r <= 5 ? Math.round(r) : null,
        doneAt: t.doneAt ? Number(t.doneAt) : null
      };
    });
    // Saves from before the tutorial existed (0.1.x) already know the loop: skip it for them.
    var tut = TUT_STEPS.indexOf(d.tut) >= 0 ? d.tut : (tasks.length ? "done" : "add");
    return { v: 1, tasks: tasks, hero: cleanHero(d.hero), tut: tut };
  }

  var state = sanitize(Store.load()) || blank();
  function save() { Store.save(state); }

  /* ---------------- XP and levels ---------------- */
  // Level n -> n+1 costs 10 + 5*(n-1) XP. XP is always worked out from finished quests,
  // so undoing a quest takes its XP back and nothing is ever lost for being late.
  function need(n) { return 10 + 5 * (n - 1); }
  function totalXp() { return state.tasks.reduce(function (s, t) { return s + (t.done ? t.rating : 0); }, 0); }
  function levelInfo(xp) {
    var lv = 1, left = xp;
    while (left >= need(lv)) { left -= need(lv); lv++; }
    return { level: lv, into: left, need: need(lv) };
  }
  function tierFor(level) { var t = 0; for (var i = 0; i < TIERS.length; i++) if (level >= TIERS[i].lv) t = i; return t; }
  function curLevel() { return levelInfo(totalXp()).level; }

  /* ---------------- drawing the hero ---------------- */
  var DEFAULT_HERO = { name: "", body: 0, skin: 0, hair: 1 };
  function heroParts(hero, tier) {
    hero = hero || DEFAULT_HERO;
    var slots = { base: "base/" + BODIES[hero.body] + "_s" + hero.skin };
    if (HAIRS[hero.hair]) slots.hair = "hair/" + HAIRS[hero.hair];
    for (var i = 0; i <= tier; i++) for (var k in TIERS[i].set) slots[k] = k + "/" + TIERS[i].set[k];
    return LAYERS.filter(function (k) { return slots[k]; }).map(function (k) { return "img/doll/" + slots[k] + ".png"; });
  }
  function drawDoll(box, hero, tier) {
    var srcs = heroParts(hero, tier), key = srcs.join("|");
    if (box.dataset.key === key) return; // unchanged: skip reloading images
    box.dataset.key = key; box.textContent = "";
    srcs.forEach(function (src) { var i = document.createElement("img"); i.src = src; i.alt = ""; box.appendChild(i); });
  }
  function heroName() { return (state.hero && state.hero.name) || "HERO"; }

  /* ---------------- helpers ---------------- */
  var $ = function (id) { return document.getElementById(id); };
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function uid() { return "q" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function dayKey(ms) { var d = new Date(ms); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
  function dayStart(ms) { var d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); }
  function dayLabel(ms) {
    var today = dayStart(Date.now()), d = dayStart(ms);
    if (d === today) return "TODAY";
    if (d === today - 86400000) return "YESTERDAY";
    return new Date(ms).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }).toUpperCase();
  }
  function timeLabel(ms) { return new Date(ms).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }); }

  /* ---------------- rendering ---------------- */
  var view = "quests";
  var rating = null; // id of the quest showing its 1–5 picker

  function renderHud() {
    var info = levelInfo(totalXp());
    var tier = tierFor(info.level);
    drawDoll($("hudHero"), state.hero, tier); drawDoll($("tabHero"), state.hero, tier);
    $("hudLevel").textContent = "LV " + info.level;
    $("hudXp").textContent = info.into + "/" + info.need;
    $("hudBar").style.width = (100 * info.into / info.need) + "%";
  }

  function renderQuests() {
    var list = $("questList"); list.textContent = "";
    var open = state.tasks.filter(function (t) { return !t.done; }).sort(function (a, b) { return a.created - b.created; });
    if (!open.length) { list.appendChild(el("li", "empty px small", "NO OPEN QUESTS")); return; }
    open.forEach(function (t) {
      var li = el("li", "win quest"); li.dataset.id = t.id;
      var row = el("div", "q-row");
      var icon = el("img", "q-icon"); icon.src = "img/scroll.png"; icon.alt = "";
      var text = questLabel(t, "q-text");
      var check = el("button", "q-check" + (rating === t.id ? " on" : "")); check.type = "button";
      check.setAttribute("aria-label", "Finish " + t.text);
      check.onclick = function () {
        rating = rating === t.id ? null : t.id;
        if (state.tut === "check" && rating) { state.tut = "rate"; save(); }
        else if (state.tut === "rate" && !rating) { state.tut = "check"; save(); }
        renderQuests(); renderCoach(); // coach after the list, so its target exists
      };
      row.appendChild(icon); row.appendChild(text); row.appendChild(check);
      li.appendChild(row);
      if (rating === t.id) {
        var r = el("div", "rate");
        for (var n = 1; n <= 5; n++) (function (n) {
          var b = el("button", "r" + n, String(n)); b.type = "button";
          b.setAttribute("aria-label", "Difficulty " + n);
          b.onclick = function () { complete(t, n, li); };
          r.appendChild(b);
        })(n);
        var x = el("button", "x", "×"); x.type = "button"; x.setAttribute("aria-label", "Cancel");
        x.onclick = function () {
          rating = null;
          if (state.tut === "rate") { state.tut = "check"; save(); }
          renderQuests(); renderCoach();
        };
        r.appendChild(x);
        li.appendChild(r);
      }
      list.appendChild(li);
    });
  }

  function renderHero() {
    var xp = totalXp(), info = levelInfo(xp), tier = tierFor(info.level);
    drawDoll($("heroBig"), state.hero, tier);
    $("heroName").textContent = heroName();
    $("heroLevel").textContent = "LV " + info.level;
    $("heroBar").style.width = (100 * info.into / info.need) + "%";
    $("heroNext").textContent = (info.need - info.into) + " XP TO LV " + (info.level + 1);
    var done = state.tasks.filter(function (t) { return t.done; });
    var byDay = {};
    done.forEach(function (t) { var k = dayKey(t.doneAt); byDay[k] = (byDay[k] || 0) + t.rating; });
    var best = Object.keys(byDay).reduce(function (m, k) { return Math.max(m, byDay[k]); }, 0);
    $("stTotal").textContent = xp;
    $("stDone").textContent = done.length;
    $("stToday").textContent = (byDay[dayKey(Date.now())] || 0) + " XP";
    $("stBest").textContent = best + " XP";
    var g = $("gearGrid"); g.textContent = "";
    TIERS.forEach(function (t, i) {
      var s = el("div", "gear-slot" + (i > tier ? " locked" : "") + (i === tier ? " current" : ""));
      var frame = el("span", "gear-frame");
      var d = el("div", "doll"); d.setAttribute("role", "img"); d.setAttribute("aria-label", (i > tier ? "Locked gear, level " : "Gear, level ") + t.lv);
      drawDoll(d, state.hero, i);
      frame.appendChild(d); s.appendChild(frame);
      s.appendChild(el("span", "px small " + (i > tier ? "dim" : ""), "LV " + t.lv));
      g.appendChild(s);
    });
  }

  function renderLog() {
    var box = $("logList"); box.textContent = "";
    var done = state.tasks.filter(function (t) { return t.done; }).sort(function (a, b) { return b.doneAt - a.doneAt; });
    if (!done.length) { box.appendChild(el("div", "win empty px small", "NOTHING FINISHED YET")); return; }
    var groups = [], cur = null;
    done.forEach(function (t) {
      var k = dayKey(t.doneAt);
      if (!cur || cur.key !== k) { cur = { key: k, at: t.doneAt, items: [] }; groups.push(cur); }
      cur.items.push(t);
    });
    groups.slice(0, 60).forEach(function (g) {
      var w = el("div", "win day");
      var head = el("div", "day-head");
      var xp = g.items.reduce(function (s, t) { return s + t.rating; }, 0);
      head.appendChild(el("span", "px small", dayLabel(g.at)));
      head.appendChild(el("span", "px small gold", g.items.length + " · " + xp + " XP"));
      w.appendChild(head);
      g.items.forEach(function (t) {
        var e = el("div", "entry");
        e.appendChild(el("span", "badge r" + t.rating, String(t.rating)));
        var body = questLabel(t, "body");
        body.appendChild(el("span", "px small dim", timeLabel(t.doneAt)));
        e.appendChild(body);
        var u = el("button", "undo px small", "UNDO"); u.type = "button";
        u.onclick = function () { undo(t); };
        e.appendChild(u);
        w.appendChild(e);
      });
      box.appendChild(w);
    });
  }

  function render() {
    renderHud();
    if (view === "quests") renderQuests();
    if (view === "hero") renderHero();
    if (view === "log") renderLog();
    renderCoach();
  }

  function show(v) {
    view = v;
    ["quests", "hero", "log"].forEach(function (k) { $("view-" + k).hidden = k !== v; });
    Array.prototype.forEach.call(document.querySelectorAll(".tab"), function (b) { b.classList.toggle("active", b.dataset.view === v); });
    $("views").scrollTop = 0;
    render();
  }

  /* ---------------- actions ---------------- */
  function addQuest(text) {
    state.tasks.push({ id: uid(), text: text, note: "", created: Date.now(), done: false, rating: null, doneAt: null });
    if (state.tut === "add") state.tut = "check";
    save(); render();
  }

  function complete(t, n, li) {
    var before = levelInfo(totalXp()).level;
    t.done = true; t.rating = n; t.doneAt = Date.now();
    rating = null;
    if (state.tut === "rate") state.tut = "xp";
    save();
    var fx = el("span", "float-xp px", "+" + n + " XP");
    li.appendChild(fx); li.classList.add("leaving");
    setTimeout(function () {
      render();
      var after = levelInfo(totalXp()).level;
      if (after > before) levelUp(before, after);
    }, 380);
  }

  function undo(t) {
    t.done = false; t.rating = null; t.doneAt = null;
    save(); render();
  }

  function levelUp(from, to) {
    drawDoll($("luHero"), state.hero, tierFor(to));
    $("luLevel").textContent = "LV " + to;
    $("luGear").hidden = tierFor(to) === tierFor(from);
    $("levelUp").hidden = false;
    renderCoach();
    focusLevelUp();
  }
  $("luOk").onclick = function () { $("levelUp").hidden = true; renderCoach(); };
  function focusLevelUp() { setTimeout(function () { $("luOk").focus(); }, 50); }

  /* ---------------- sheets ---------------- */
  function openSheet(build) {
    var b = $("sheetBox"); b.textContent = ""; build(b); $("sheet").hidden = false; renderCoach();
    if (!b.contains(document.activeElement)) { var f = b.querySelector("input, button"); if (f) setTimeout(function () { if (!$("sheet").hidden && !b.contains(document.activeElement)) f.focus(); }, 60); }
  }
  function closeSheet() { $("sheet").hidden = true; $("sheetBox").textContent = ""; renderCoach(); }
  $("sheet").addEventListener("click", function (e) { if (e.target === $("sheet")) closeSheet(); });

  function button(label, cls, fn) { var b = el("button", "btn px small" + (cls ? " " + cls : ""), label); b.type = "button"; b.onclick = fn; return b; }

  // A quest's title plus the first line of its notes. Tap to open the quest.
  function questLabel(t, cls) {
    var box = el("div", cls);
    box.appendChild(el("span", "t", t.text));
    var first = (t.note || "").split("\n").map(function (l) { return l.trim(); }).filter(Boolean)[0];
    if (first) box.appendChild(el("span", "q-note", first));
    box.tabIndex = 0; box.setAttribute("role", "button");
    box.setAttribute("aria-label", t.text + (t.note ? ", has notes" : "") + ". Open");
    box.onclick = function () { openEdit(t); };
    box.onkeydown = function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openEdit(t); } };
    return box;
  }

  function openEdit(t) {
    openSheet(function (b) {
      b.appendChild(el("div", "px small dim", "QUEST"));
      var input = el("input"); input.type = "text"; input.maxLength = 300; input.value = t.text;
      input.setAttribute("aria-label", "Quest");
      b.appendChild(input);
      b.appendChild(el("div", "px small dim", "NOTES"));
      var notes = el("textarea", "notes"); notes.maxLength = 4000; notes.value = t.note || "";
      notes.setAttribute("aria-label", "Notes"); notes.rows = 6;
      b.appendChild(notes);
      var row = el("div", "sheet-row");
      row.appendChild(button("DELETE", "danger", function () {
        state.tasks = state.tasks.filter(function (x) { return x.id !== t.id; });
        save(); closeSheet(); render();
      }));
      row.appendChild(button("SAVE", "", function () {
        var v = input.value.trim();
        if (v) t.text = v;
        t.note = notes.value.replace(/\s+$/, "");
        save(); closeSheet(); render();
      }));
      b.appendChild(row);
      setTimeout(function () { notes.focus(); notes.selectionStart = notes.selectionEnd = notes.value.length; }, 50);
    });
  }

  function openSettings() {
    openSheet(function (b) {
      b.appendChild(el("div", "px small dim", "HERO"));
      var hr = el("div", "sheet-row");
      hr.appendChild(button("EDIT HERO", "", function () { closeSheet(); openCreator(false); }));
      hr.appendChild(button("TUTORIAL", "", function () { closeSheet(); show("quests"); setTut("add"); }));
      b.appendChild(hr);
      b.appendChild(el("div", "px small dim", "BACKUP"));
      var row = el("div", "sheet-row");
      row.appendChild(button("EXPORT", "", exportBackup));
      row.appendChild(button("IMPORT", "", importBackup));
      b.appendChild(row);
      b.appendChild(el("div", "px small dim", "CREDITS"));
      var c = el("div", "credits");
      [
        "Hero, scroll, book and floor art: Dungeon Crawl Stone Soup tiles by the Dungeon Crawl Stone Soup artists, based on RLTiles. CC0 1.0 (github.com/crawl/tiles). Extra skin tones are recolors of those tiles.",
        "Press Start 2P by CodeMan38. SIL Open Font License 1.1.",
        "Pixelify Sans by Stefie Justprince. SIL Open Font License 1.1."
      ].forEach(function (p) { c.appendChild(el("p", "", p)); });
      b.appendChild(c);
      b.appendChild(el("div", "px small dim", "VERSION " + VERSION));
      b.appendChild(button("CLOSE", "", closeSheet));
    });
  }
  $("settingsBtn").onclick = openSettings;

  function exportBackup() {
    var json = JSON.stringify(state, null, 1);
    var name = "questlog-backup-" + new Date().toISOString().slice(0, 10) + ".json";
    if (bridge && bridge.exportBackup) { bridge.exportBackup(json, name); return; }
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    a.download = name; a.click();
  }

  function importBackup() {
    if (bridge && bridge.importBackup) { bridge.importBackup(); return; }
    var input = document.createElement("input"); input.type = "file"; input.accept = "application/json,.json";
    input.onchange = function () {
      var f = input.files && input.files[0]; if (!f) return;
      f.text().then(window.onBackupImported);
    };
    input.click();
  }

  // Called by the Android side with the picked file's text, or with null if it couldn't be read.
  window.onBackupImported = function (text) {
    var data = null;
    try { data = sanitize(JSON.parse(text)); } catch (e) { data = null; }
    openSheet(function (b) {
      if (!data) {
        b.appendChild(el("div", "px small", "THAT FILE ISN'T A QUEST LOG BACKUP."));
        b.appendChild(button("OK", "", closeSheet));
        return;
      }
      var n = data.tasks.length;
      b.appendChild(el("div", "px small", "REPLACE EVERYTHING WITH THIS BACKUP (" + n + " QUESTS)?"));
      var row = el("div", "sheet-row");
      row.appendChild(button("CANCEL", "", closeSheet));
      row.appendChild(button("REPLACE", "danger", function () {
        state = data; save(); closeSheet(); show("quests");
        if (!state.hero) openCreator(true);
      }));
      b.appendChild(row);
    });
  };

  window.onBackupExported = function (ok) {
    openSheet(function (b) {
      b.appendChild(el("div", "px small", ok ? "BACKUP SAVED." : "COULDN'T SAVE THE BACKUP."));
      b.appendChild(button("OK", "", closeSheet));
    });
  };

  /* ---------------- input ---------------- */
  $("addForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var input = $("newQuest"), v = input.value.trim();
    if (!v) return;
    input.value = "";
    addQuest(v);
    input.focus();
  });

  Array.prototype.forEach.call(document.querySelectorAll(".tab"), function (b) {
    b.onclick = function () { show(b.dataset.view); };
  });

  // Android back button: close what's open, then go back to Quests, then let the app close.
  window.onBack = function () {
    if (!$("creator").hidden) { if (!state.hero) return false; closeCreator(); return true; }
    if (!$("levelUp").hidden) { $("levelUp").hidden = true; renderCoach(); return true; }
    if (!$("sheet").hidden) { closeSheet(); return true; }
    if (rating) { rating = null; renderQuests(); return true; }
    if (view !== "quests") { show("quests"); return true; }
    return false;
  };

  // Esc closes whatever is open, like the Android back button.
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") window.onBack(); });

  // Day labels and "today" stats roll over if the app stays open past midnight.
  document.addEventListener("visibilitychange", function () { if (!document.hidden) render(); });

  /* ---------------- hero creator ---------------- */
  var draft = null;
  function openCreator(first) {
    draft = JSON.parse(JSON.stringify(state.hero || DEFAULT_HERO));
    $("crTitle").textContent = first ? "NEW HERO" : "EDIT HERO";
    $("crDone").textContent = first ? "START" : "SAVE";
    $("crCancel").hidden = first;
    $("crName").value = draft.name;
    renderCreator();
    $("creator").hidden = false;
    renderCoach();
    setTimeout(function () { $("crDone").focus(); }, 50);
  }
  function closeCreator() { $("creator").hidden = true; draft = null; render(); }
  function renderCreator() {
    drawDoll($("crDoll"), draft, state.hero ? tierFor(curLevel()) : 0);
    $("crBody").textContent = (draft.body + 1) + "/" + BODIES.length;
    $("crSkin").textContent = (draft.skin + 1) + "/" + SKINS;
    $("crHair").textContent = draft.hair ? draft.hair + "/" + (HAIRS.length - 1) : "NONE";
  }
  Array.prototype.forEach.call(document.querySelectorAll("#creator .arrow"), function (b) {
    b.onclick = function () {
      var part = b.dataset.part, n = { body: BODIES.length, skin: SKINS, hair: HAIRS.length }[part];
      draft[part] = (draft[part] + Number(b.dataset.step) + n) % n;
      renderCreator();
    };
  });
  $("crDone").onclick = function () {
    draft.name = $("crName").value.trim().slice(0, 14);
    state.hero = cleanHero(draft); save(); closeCreator();
  };
  $("crCancel").onclick = closeCreator;
  $("editHeroBtn").onclick = function () { openCreator(false); };

  /* ---------------- tutorial ---------------- */
  // Teaches the loop on the player's own first quest: add, tap the box, rate, see the XP.
  var COACH = {
    add: { text: "TYPE A QUEST, THEN TAP +", target: function () { return $("addForm"); } },
    check: { text: "DONE WITH IT? TAP THE BOX.", target: function () { return document.querySelector(".quest .q-check"); } },
    rate: { text: "HOW HARD WAS IT? 1 IS EASY, 5 IS HARD. THAT'S YOUR XP.", target: function () { return document.querySelector(".quest .rate"); } },
    xp: { text: "XP FILLS THIS BAR. LEVEL UP FOR NEW GEAR.", target: function () { return document.querySelector(".hud"); }, ok: true }
  };
  function setTut(step) { state.tut = step; save(); renderCoach(); }
  function renderCoach() {
    Array.prototype.forEach.call(document.querySelectorAll(".coach-on"), function (e) { e.classList.remove("coach-on"); });
    var c = $("coach"), step = COACH[state.tut];
    // Only while the hero exists, Quests is showing and nothing else is open.
    if (!step || !state.hero || view !== "quests" || !$("creator").hidden || !$("sheet").hidden || !$("levelUp").hidden) { c.hidden = true; return; }
    if (state.tut === "check" && !document.querySelector(".quest")) { state.tut = "add"; save(); step = COACH.add; }
    var target = step.target();
    if (!target) { c.hidden = true; return; }
    $("coachText").textContent = step.text;
    $("coachOk").hidden = !step.ok;
    $("coachSkip").hidden = !!step.ok; // last step: OK only
    c.hidden = false;
    target.classList.add("coach-on");
    var r = target.getBoundingClientRect(), vh = window.innerHeight;
    if (r.top + r.height / 2 < vh / 2) c.style.top = Math.min(r.bottom + 16, vh - c.offsetHeight - 12) + "px";
    else c.style.top = Math.max(12, r.top - c.offsetHeight - 16) + "px";
  }
  $("coachSkip").onclick = function () { setTut("done"); };
  $("coachOk").onclick = function () { setTut("done"); };
  window.addEventListener("resize", renderCoach);
  $("views").addEventListener("scroll", renderCoach);

  show("quests");
  if (!state.hero) openCreator(true);
})();

(function () {
  "use strict";

  var VERSION = "0.5.0";
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

  // Cosmetic loot: capes, hats and weapon looks. Finishing a quest sometimes drops one.
  // Looks only; nothing here changes XP.
  var LOOT = [
    "cloak/black", "cloak/brown", "cloak/cyan", "cloak/gray", "cloak/magenta", "cloak/white", "cloak/yellow",
    "head/cap_blue", "head/cap_black1", "head/feather_blue", "head/feather_green", "head/feather_red", "head/feather_white",
    "head/feather_yellow", "head/hood_green", "head/hood_red", "head/hood_white", "head/hood_orange", "head/wizard_blue",
    "head/wizard_purple", "head/wizard_red", "head/wizard_darkgreen", "head/straw", "head/band_red", "head/band_blue",
    "head/viking_brown1", "head/viking_gold", "head/crown_gold2", "head/healer", "head/hat_black",
    "hand1/quarterstaff", "hand1/mace", "hand1/spear", "hand1/axe_small", "hand1/rapier", "hand1/scimitar",
    "hand1/katana_slant", "hand1/sword_thief", "hand1/staff_mage", "hand1/trident", "hand1/whip", "hand1/sickle",
    "hand1/war_axe", "hand1/morningstar", "hand1/falchion"
  ];
  var LOOT_SLOTS = { cloak: "CAPE", head: "HAT", hand1: "WEAPON" };
  var DROP_ONE_IN = 4; // about one quest in four drops something new, until the set is complete

  // Badges: plain descriptions of what earned them. Worked out from the quests every time.
  var BADGES = [
    { id: "q1", label: "FIRST QUEST", icon: "img/scroll.png", test: function (s) { return s.done >= 1; } },
    { id: "q10", label: "10 QUESTS", icon: "img/scroll.png", test: function (s) { return s.done >= 10; } },
    { id: "q50", label: "50 QUESTS", icon: "img/scroll.png", test: function (s) { return s.done >= 50; } },
    { id: "q100", label: "100 QUESTS", icon: "img/scroll.png", test: function (s) { return s.done >= 100; } },
    { id: "q250", label: "250 QUESTS", icon: "img/scroll.png", test: function (s) { return s.done >= 250; } },
    { id: "q500", label: "500 QUESTS", icon: "img/scroll.png", test: function (s) { return s.done >= 500; } },
    { id: "q1000", label: "1000 QUESTS", icon: "img/scroll.png", test: function (s) { return s.done >= 1000; } },
    { id: "f1", label: "FIRST 5", icon: "img/badge/orb.png", test: function (s) { return s.fives >= 1; } },
    { id: "f10", label: "10 RATED 5", icon: "img/badge/orb.png", test: function (s) { return s.fives >= 10; } },
    { id: "f50", label: "50 RATED 5", icon: "img/badge/orb.png", test: function (s) { return s.fives >= 50; } },
    { id: "l5", label: "LV 5", icon: "img/badge/gold.png", test: function (s) { return s.level >= 5; } },
    { id: "l10", label: "LV 10", icon: "img/badge/gold.png", test: function (s) { return s.level >= 10; } },
    { id: "l20", label: "LV 20", icon: "img/badge/gold.png", test: function (s) { return s.level >= 20; } },
    { id: "l30", label: "LV 30", icon: "img/badge/gold.png", test: function (s) { return s.level >= 30; } },
    { id: "d25", label: "25 XP IN A DAY", icon: "img/badge/potion.png", test: function (s) { return s.bestDay >= 25; } },
    { id: "d50", label: "50 XP IN A DAY", icon: "img/badge/potion.png", test: function (s) { return s.bestDay >= 50; } },
    { id: "a10", label: "10 DAYS ACTIVE", icon: "img/badge/book.png", test: function (s) { return s.days >= 10; } },
    { id: "a50", label: "50 DAYS ACTIVE", icon: "img/badge/book.png", test: function (s) { return s.days >= 50; } },
    { id: "a100", label: "100 DAYS ACTIVE", icon: "img/badge/book.png", test: function (s) { return s.days >= 100; } },
    { id: "o1", label: "FIRST LOOT", icon: "img/badge/amulet.png", test: function (s) { return s.loot >= 1; } },
    { id: "o10", label: "10 LOOT", icon: "img/badge/amulet.png", test: function (s) { return s.loot >= 10; } },
    { id: "oall", label: "ALL LOOT", icon: "img/badge/amulet.png", test: function (s) { return s.loot >= LOOT.length; } }
  ];
  // The guided tour, in order. "done" means finished or skipped.
  var TUT_STEPS = ["add", "note", "noteSave", "check", "rate", "xp", "hero", "gear", "log", "entry", "menu", "end", "done"];

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

  function blank() { return { v: 1, tasks: [], hero: null, tut: "add", templates: [], prefs: { sound: true, haptics: true } }; }
  function str(v, max) { return typeof v === "string" ? v.slice(0, max) : ""; }
  function cleanSteps(a) {
    return (Array.isArray(a) ? a : []).filter(function (x) { return x && typeof x.t === "string" && x.t.trim(); })
      .slice(0, 50).map(function (x) { return { t: x.t.trim().slice(0, 200), d: !!x.d }; });
  }
  function clampInt(v, max) { v = Math.round(Number(v)); return v >= 0 && v < max ? v : 0; }
  function cleanHero(h) {
    if (!h || typeof h !== "object") return null;
    var equip = {};
    if (h.equip && typeof h.equip === "object") Object.keys(LOOT_SLOTS).forEach(function (k) {
      var id = h.equip[k]; if (LOOT.indexOf(id) >= 0 && id.split("/")[0] === k) equip[k] = id;
    });
    return { name: typeof h.name === "string" ? h.name.trim().slice(0, 14) : "", body: clampInt(h.body, BODIES.length),
      skin: clampInt(h.skin, SKINS), hair: clampInt(h.hair, HAIRS.length), equip: equip };
  }
  function sanitize(d) {
    if (!d || !Array.isArray(d.tasks)) return null;
    var tasks = d.tasks.filter(function (t) { return t && typeof t.text === "string" && t.id; }).map(function (t) {
      var r = Number(t.rating);
      return {
        id: String(t.id), text: t.text.slice(0, 300), note: str(t.note, 4000), steps: cleanSteps(t.steps),
        drop: t.done && LOOT.indexOf(t.drop) >= 0 ? t.drop : null,
        created: Number(t.created) || Date.now(),
        done: !!t.done && r >= 1 && r <= 5, rating: r >= 1 && r <= 5 ? Math.round(r) : null,
        doneAt: t.doneAt ? Number(t.doneAt) : null
      };
    });
    // Saves from before the tutorial existed (0.1.x) already know the loop: skip it for them.
    var tut = TUT_STEPS.indexOf(d.tut) >= 0 ? d.tut : (tasks.length ? "done" : "add");
    var templates = (Array.isArray(d.templates) ? d.templates : []).filter(function (x) { return x && typeof x.text === "string" && x.text.trim(); })
      .slice(0, 100).map(function (x) {
        return { id: String(x.id || uid()), text: x.text.trim().slice(0, 300), note: str(x.note, 4000),
          steps: cleanSteps(x.steps).map(function (st) { return { t: st.t, d: false }; }) };
      });
    var prefs = d.prefs && typeof d.prefs === "object" ? d.prefs : {};
    return { v: 1, tasks: tasks, hero: cleanHero(d.hero), tut: tut, templates: templates,
      prefs: { sound: prefs.sound !== false, haptics: prefs.haptics !== false } };
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
  function ownedLoot() {
    var o = []; state.tasks.forEach(function (t) { if (t.done && t.drop && o.indexOf(t.drop) < 0) o.push(t.drop); });
    return o;
  }
  function stats() {
    var done = state.tasks.filter(function (t) { return t.done; }), byDay = {};
    done.forEach(function (t) { var k = dayKey(t.doneAt); byDay[k] = (byDay[k] || 0) + t.rating; });
    var days = Object.keys(byDay);
    return { done: done.length, fives: done.filter(function (t) { return t.rating === 5; }).length, level: curLevel(),
      bestDay: days.reduce(function (m, k) { return Math.max(m, byDay[k]); }, 0), days: days.length,
      today: byDay[dayKey(Date.now())] || 0, loot: ownedLoot().length, xp: totalXp() };
  }
  function earnedBadges() { var st = stats(); return BADGES.filter(function (b) { return b.test(st); }).map(function (b) { return b.id; }); }

  // The same quest always rolls the same way, so undo and redo can't farm loot.
  function hash(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rollDrop(t) {
    var h = hash(t.id);
    var first = !state.tasks.some(function (x) { return x.done && x !== t; }); // the very first quest always drops
    if (!first && h % DROP_ONE_IN !== 0) return null;
    var owned = ownedLoot(), pool = LOOT.filter(function (id) { return owned.indexOf(id) < 0; });
    return pool.length ? pool[(h >>> 8) % pool.length] : null;
  }
  // A loot item no longer owned (its quest was undone or deleted) can't stay worn.
  function fixEquip() {
    if (!state.hero || !state.hero.equip) return;
    var owned = ownedLoot();
    for (var k in state.hero.equip) if (owned.indexOf(state.hero.equip[k]) < 0) delete state.hero.equip[k];
  }

  /* ---------------- drawing the hero ---------------- */
  var DEFAULT_HERO = { name: "", body: 0, skin: 0, hair: 1 };
  // extra: { plain: true } draws tier gear only; { item: "head/x" } tries a loot item on.
  function heroParts(hero, tier, extra) {
    hero = hero || DEFAULT_HERO; extra = extra || {};
    var slots = { base: "base/" + BODIES[hero.body] + "_s" + hero.skin };
    if (HAIRS[hero.hair]) slots.hair = "hair/" + HAIRS[hero.hair];
    for (var i = 0; i <= tier; i++) for (var k in TIERS[i].set) slots[k] = k + "/" + TIERS[i].set[k];
    if (!extra.plain && hero.equip) for (var e in hero.equip) if (hero.equip[e]) slots[e] = hero.equip[e];
    if (extra.item) slots[extra.item.split("/")[0]] = extra.item;
    return LAYERS.filter(function (k) { return slots[k]; }).map(function (k) { return "img/doll/" + slots[k] + ".png"; });
  }
  function drawDoll(box, hero, tier, extra) {
    var srcs = heroParts(hero, tier, extra), key = srcs.join("|");
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
    var st = stats();
    $("stTotal").textContent = xp;
    $("stDone").textContent = st.done;
    $("stToday").textContent = st.today + " XP";
    $("stBest").textContent = st.bestDay + " XP";
    var g = $("gearGrid"); g.textContent = "";
    TIERS.forEach(function (t, i) {
      var s = el("div", "gear-slot" + (i > tier ? " locked" : "") + (i === tier ? " current" : ""));
      var frame = el("span", "gear-frame");
      var d = el("div", "doll"); d.setAttribute("role", "img"); d.setAttribute("aria-label", (i > tier ? "Locked gear, level " : "Gear, level ") + t.lv);
      drawDoll(d, state.hero, i, { plain: true });
      frame.appendChild(d); s.appendChild(frame);
      s.appendChild(el("span", "px small " + (i > tier ? "dim" : ""), "LV " + t.lv));
      g.appendChild(s);
    });

    var owned = ownedLoot(), lg = $("lootGrid"); lg.textContent = "";
    $("lootCount").textContent = owned.length + "/" + LOOT.length;
    if (!owned.length) lg.appendChild(el("div", "px small dim span-all", "FINISH QUESTS TO FIND CAPES, HATS AND WEAPONS."));
    owned.slice().sort(function (a, b) { return LOOT.indexOf(a) - LOOT.indexOf(b); }).forEach(function (id) {
      var worn = state.hero && state.hero.equip && state.hero.equip[id.split("/")[0]] === id;
      var s = el("div", "gear-slot" + (worn ? " current" : ""));
      var frame = el("span", "gear-frame");
      var d = el("div", "doll"); d.setAttribute("role", "img"); d.setAttribute("aria-label", LOOT_SLOTS[id.split("/")[0]] + (worn ? ", worn" : ""));
      drawDoll(d, state.hero, 0, { plain: true, item: id });
      frame.appendChild(d); s.appendChild(frame);
      s.appendChild(el("span", "px small " + (worn ? "gold" : "dim"), worn ? "WORN" : LOOT_SLOTS[id.split("/")[0]]));
      lg.appendChild(s);
    });

    var earned = earnedBadges(), bg = $("badgeGrid"); bg.textContent = "";
    $("badgeCount").textContent = earned.length + "/" + BADGES.length;
    BADGES.forEach(function (b) {
      var got = earned.indexOf(b.id) >= 0;
      var c = el("div", "badge-card" + (got ? "" : " locked"));
      var img = el("img"); img.src = b.icon; img.alt = "";
      c.appendChild(img);
      c.appendChild(el("span", "px small" + (got ? "" : " dim"), b.label));
      c.setAttribute("aria-label", b.label + (got ? ", earned" : ", not yet"));
      bg.appendChild(c);
    });
  }

  function matches(t, q) {
    if (!q) return true;
    var hay = (t.text + "\n" + (t.note || "") + "\n" + (t.steps || []).map(function (x) { return x.t; }).join("\n")).toLowerCase();
    return q.split(/\s+/).every(function (w) { return hay.indexOf(w) >= 0; });
  }
  function renderLog() {
    var box = $("logList"); box.textContent = "";
    var q = $("logSearch").value.trim().toLowerCase();
    var all = state.tasks.filter(function (t) { return t.done; });
    var done = all.filter(function (t) { return matches(t, q); }).sort(function (a, b) { return b.doneAt - a.doneAt; });
    if (!all.length) { box.appendChild(el("div", "win empty px small", "NOTHING FINISHED YET")); return; }
    if (q) box.appendChild(el("div", "px small dim result-count", done.length + (done.length === 1 ? " RESULT" : " RESULTS")));
    if (!done.length) return;
    var groups = [], cur = null;
    done.forEach(function (t) {
      var k = dayKey(t.doneAt);
      if (!cur || cur.key !== k) { cur = { key: k, at: t.doneAt, items: [] }; groups.push(cur); }
      cur.items.push(t);
    });
    groups.slice(0, q ? groups.length : 60).forEach(function (g) {
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
    if (state.tut === "hero" && v === "hero") { state.tut = "gear"; save(); }
    if (state.tut === "log" && v === "log") { state.tut = "entry"; save(); }
    render();
  }

  /* ---------------- actions ---------------- */
  function addQuest(text) {
    state.tasks.push({ id: uid(), text: text, note: "", steps: [], created: Date.now(), done: false, rating: null, doneAt: null, drop: null });
    if (state.tut === "add") state.tut = "note";
    save(); render();
  }

  function complete(t, n, li) {
    var before = curLevel(), badgesBefore = earnedBadges();
    t.drop = rollDrop(t);
    t.done = true; t.rating = n; t.doneAt = Date.now();
    rating = null;
    if (state.tut === "rate") state.tut = "xp";
    save();
    feedback("complete");
    var fx = el("span", "float-xp px", "+" + n + " XP");
    li.appendChild(fx); li.classList.add("leaving");
    setTimeout(function () {
      render();
      var after = curLevel();
      if (after > before) queuePopup(function () { levelUp(before, after); });
      if (t.drop) queuePopup(function () { showLoot(t.drop); });
      earnedBadges().filter(function (id) { return badgesBefore.indexOf(id) < 0; }).forEach(function (id) {
        var b = BADGES.filter(function (x) { return x.id === id; })[0];
        toast("BADGE: " + b.label, b.icon, "badge");
      });
    }, 380);
  }

  function undo(t) {
    t.done = false; t.rating = null; t.doneAt = null; t.drop = null;
    fixEquip(); save(); render();
  }

  /* ---------------- popups, toasts, sound and haptics ---------------- */
  // Level-ups and loot can arrive together; show them one after another.
  var popups = [];
  function queuePopup(fn) { popups.push(fn); if (popups.length === 1) fn(); }
  function popupDone() { popups.shift(); if (popups.length) popups[0](); else renderCoach(); }

  var lootShown = null;
  function showLoot(id) {
    lootShown = id;
    drawDoll($("lootHero"), state.hero, tierFor(curLevel()), { item: id });
    $("lootWhat").textContent = "NEW " + LOOT_SLOTS[id.split("/")[0]];
    $("loot").hidden = false;
    feedback("loot");
    renderCoach();
    setTimeout(function () { $("lootWear").focus(); }, 50);
  }
  function closeLoot(wear) {
    if (wear && lootShown && state.hero) { state.hero.equip = state.hero.equip || {}; state.hero.equip[lootShown.split("/")[0]] = lootShown; save(); }
    $("loot").hidden = true; lootShown = null; render(); popupDone();
  }
  $("lootOk").onclick = function () { closeLoot(false); };
  $("lootWear").onclick = function () { closeLoot(true); };

  function toast(text, icon, sound) {
    var t = el("div", "win toast");
    if (icon) { var i = el("img"); i.src = icon; i.alt = ""; t.appendChild(i); }
    t.appendChild(el("span", "px small", text));
    var box = $("toasts");
    box.appendChild(t);
    while (box.children.length > 2) box.removeChild(box.firstChild); // keep it to two at a time
    if (sound) feedback(sound);
    setTimeout(function () { t.classList.add("out"); setTimeout(function () { t.remove(); }, 300); }, 3200);
  }

  var SOUNDS = {};
  ["complete", "levelup", "loot", "badge"].forEach(function (k) { try { SOUNDS[k] = new Audio("snd/" + k + ".ogg"); SOUNDS[k].preload = "auto"; } catch (e) {} });
  function feedback(kind) {
    if (state.prefs.sound && SOUNDS[kind]) { try { var a = SOUNDS[kind]; a.currentTime = 0; var pr = a.play(); if (pr && pr.catch) pr.catch(function () {}); } catch (e) {} }
    if (state.prefs.haptics && bridge && bridge.haptic) { try { bridge.haptic(kind === "complete" ? "tick" : "confirm"); } catch (e) {} }
  }

  function levelUp(from, to) {
    drawDoll($("luHero"), state.hero, tierFor(to));
    $("luLevel").textContent = "LV " + to;
    $("luGear").hidden = tierFor(to) === tierFor(from);
    $("levelUp").hidden = false;
    feedback("levelup");
    renderCoach();
    focusLevelUp();
  }
  $("luOk").onclick = function () { $("levelUp").hidden = true; popupDone(); };
  function focusLevelUp() { setTimeout(function () { $("luOk").focus(); }, 50); }

  /* ---------------- sheets ---------------- */
  function openSheet(build) {
    var b = $("sheetBox"); b.textContent = ""; build(b); $("sheet").hidden = false; renderCoach();
    if (!b.contains(document.activeElement)) { var f = b.querySelector("input, button"); if (f) setTimeout(function () { if (!$("sheet").hidden && !b.contains(document.activeElement)) f.focus(); }, 60); }
  }
  var onSheetClose = null; // the open quest's save, so closing by back or tapping outside keeps edits
  function closeSheet() {
    var f = onSheetClose; onSheetClose = null;
    if (f) f();
    $("sheet").hidden = true; $("sheetBox").textContent = "";
    if (state.tut === "noteSave") { state.tut = "check"; save(); }
    renderCoach();
  }
  $("sheet").addEventListener("click", function (e) { if (e.target === $("sheet")) closeSheet(); });

  function button(label, cls, fn) {
    var b = el("button", "btn px small" + (cls ? " " + cls : ""), label); b.type = "button"; b.onclick = fn;
    b.dataset.act = label.split(":")[0].toLowerCase().replace(/\s+/g, "-"); // stable handle for tests
    return b;
  }

  // A quest's title plus the first line of its notes. Tap to open the quest.
  function questLabel(t, cls) {
    var box = el("div", cls);
    box.appendChild(el("span", "t", t.text));
    var first = (t.note || "").split("\n").map(function (l) { return l.trim(); }).filter(Boolean)[0];
    if (first) box.appendChild(el("span", "q-note", first));
    if (t.steps && t.steps.length) {
      var n = t.steps.filter(function (x) { return x.d; }).length;
      box.appendChild(el("span", "q-steps px small" + (n === t.steps.length ? " gold" : ""), "STEPS " + n + "/" + t.steps.length));
    }
    box.tabIndex = 0; box.setAttribute("role", "button");
    box.setAttribute("aria-label", t.text + (t.note ? ", has notes" : "") +
      (t.steps && t.steps.length ? ", checklist " + t.steps.filter(function (x) { return x.d; }).length + " of " + t.steps.length : "") + ". Open");
    box.onclick = function () { openEdit(t); };
    box.onkeydown = function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openEdit(t); } };
    return box;
  }

  // Title, notes and checklist editor. Used for an existing quest, a new shared quest and templates.
  function questFields(b, src) {
    b.appendChild(el("div", "px small dim", "QUEST"));
    var input = el("input"); input.type = "text"; input.maxLength = 300; input.value = src.text || "";
    input.setAttribute("aria-label", "Quest");
    b.appendChild(input);
    b.appendChild(el("div", "px small dim", "NOTES"));
    var notes = el("textarea", "notes"); notes.maxLength = 4000; notes.value = src.note || "";
    notes.setAttribute("aria-label", "Notes"); notes.rows = 5;
    b.appendChild(notes);
    b.appendChild(el("div", "px small dim", "CHECKLIST"));
    var steps = (src.steps || []).map(function (x) { return { t: x.t, d: x.d }; });
    var list = el("ul", "steps"); b.appendChild(list);
    function draw() {
      list.textContent = "";
      steps.forEach(function (st, i) {
        var li = el("li", "step" + (st.d ? " done" : ""));
        var cb = el("button", "step-check" + (st.d ? " on" : "")); cb.type = "button";
        cb.setAttribute("aria-pressed", st.d ? "true" : "false"); cb.setAttribute("aria-label", "Done: " + st.t);
        cb.onclick = function () { st.d = !st.d; draw(); };
        var tx = el("span", "step-t", st.t);
        var rm = el("button", "step-x", "×"); rm.type = "button"; rm.setAttribute("aria-label", "Remove step " + st.t);
        rm.onclick = function () { steps.splice(i, 1); draw(); };
        li.appendChild(cb); li.appendChild(tx); li.appendChild(rm); list.appendChild(li);
      });
    }
    draw();
    var addRow = el("form", "step-add"); addRow.setAttribute("autocomplete", "off");
    var stepIn = el("input"); stepIn.type = "text"; stepIn.maxLength = 200; stepIn.placeholder = "Add a step";
    stepIn.setAttribute("aria-label", "Add a checklist step"); stepIn.setAttribute("enterkeyhint", "done");
    var stepBtn = el("button", "btn px", "+"); stepBtn.type = "submit"; stepBtn.setAttribute("aria-label", "Add step");
    addRow.appendChild(stepIn); addRow.appendChild(stepBtn); b.appendChild(addRow);
    addRow.onsubmit = function (e) {
      e.preventDefault();
      var v = stepIn.value.trim(); if (!v || steps.length >= 50) return;
      steps.push({ t: v, d: false }); stepIn.value = ""; draw(); stepIn.focus();
    };
    return {
      input: input, notes: notes,
      read: function () {
        // A step typed but not added yet still counts.
        var pending = stepIn.value.trim(); if (pending && steps.length < 50) { steps.push({ t: pending, d: false }); stepIn.value = ""; }
        return { text: input.value.trim(), note: notes.value.replace(/\s+$/, ""), steps: steps.map(function (x) { return { t: x.t, d: x.d }; }) };
      }
    };
  }

  function openEdit(t) {
    if (state.tut === "note") { state.tut = "noteSave"; save(); }
    openSheet(function (b) {
      var f = questFields(b, t), deleted = false;
      onSheetClose = function () {
        if (deleted || state.tasks.indexOf(t) < 0) return;
        var v = f.read();
        if (v.text) t.text = v.text;
        t.note = v.note; t.steps = v.steps;
        save(); render();
      };
      var row = el("div", "sheet-row");
      row.appendChild(button("DELETE", "danger", function () {
        deleted = true;
        state.tasks = state.tasks.filter(function (x) { return x.id !== t.id; });
        fixEquip(); save(); closeSheet(); render();
      }));
      row.appendChild(button("TEMPLATE", "", function () {
        var v = f.read();
        state.templates.push({ id: uid(), text: v.text || t.text, note: v.note, steps: v.steps.map(function (x) { return { t: x.t, d: false }; }) });
        save(); toast("SAVED AS TEMPLATE", null, null);
      }));
      b.appendChild(row);
      var saveRow = el("div", "sheet-row");
      saveRow.appendChild(button("SAVE", "", closeSheet));
      b.appendChild(saveRow);
      setTimeout(function () { f.notes.focus(); f.notes.selectionStart = f.notes.selectionEnd = f.notes.value.length; }, 50);
    });
  }

  /* ---------------- templates ---------------- */
  function addFrom(src) {
    state.tasks.push({ id: uid(), text: src.text, note: src.note || "", steps: (src.steps || []).map(function (x) { return { t: x.t, d: false }; }),
      created: Date.now(), done: false, rating: null, doneAt: null, drop: null });
    if (state.tut === "add") state.tut = "note";
    save(); render();
  }
  function openTemplates() {
    openSheet(function (b) {
      b.appendChild(el("div", "px small dim", "TEMPLATES"));
      if (!state.templates.length) b.appendChild(el("p", "px small", "NONE YET. OPEN A QUEST AND TAP TEMPLATE TO SAVE IT HERE."));
      var ul = el("ul", "tpl-list"); b.appendChild(ul);
      state.templates.forEach(function (tp) {
        var li = el("li", "tpl");
        var add = el("button", "tpl-add"); add.type = "button";
        add.appendChild(el("span", "t", tp.text));
        if (tp.steps.length) add.appendChild(el("span", "q-steps px small", tp.steps.length + (tp.steps.length === 1 ? " STEP" : " STEPS")));
        add.setAttribute("aria-label", "Add quest: " + tp.text);
        add.onclick = function () { addFrom(tp); toast("ADDED: " + tp.text.slice(0, 40), "img/scroll.png", null); };
        var rm = el("button", "step-x", "×"); rm.type = "button"; rm.setAttribute("aria-label", "Delete template " + tp.text);
        rm.onclick = function () { state.templates = state.templates.filter(function (x) { return x !== tp; }); save(); closeSheet(); openTemplates(); };
        li.appendChild(add); li.appendChild(rm); ul.appendChild(li);
      });
      b.appendChild(button("CLOSE", "", closeSheet));
    });
  }
  $("templatesBtn").onclick = openTemplates;

  /* ---------------- shared from another app ---------------- */
  // Android hands over text shared to Quest Log; it becomes a new quest you confirm.
  window.onShared = function (subject, text) {
    subject = (subject || "").trim(); text = (text || "").trim();
    if (!subject && !text) return;
    var first = text.split("\n").map(function (l) { return l.trim(); }).filter(Boolean)[0] || "";
    var title = (subject || first).slice(0, 300);
    var note = (subject ? text : (text.length > first.length ? text : "")).slice(0, 4000);
    var showIt = function () {
      if (!$("sheet").hidden) closeSheet();
      show("quests");
      openSheet(function (b) {
        b.appendChild(el("div", "px small gold", "NEW QUEST FROM SHARE"));
        var f = questFields(b, { text: title, note: note, steps: [] });
        var row = el("div", "sheet-row");
        row.appendChild(button("CANCEL", "", closeSheet));
        row.appendChild(button("ADD", "", function () {
          var v = f.read(); if (!v.text) { f.input.focus(); return; }
          addFrom(v); closeSheet(); toast("QUEST ADDED", "img/scroll.png", null);
        }));
        b.appendChild(row);
      });
    };
    if (!state.hero) { pendingShare = showIt; return; } // after the hero is made
    showIt();
  };
  var pendingShare = null;

  /* ---------------- weekly summary ---------------- */
  function weekStart(ms) { var d = new Date(ms); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); }
  function addDays(ms, n) { var d = new Date(ms); d.setDate(d.getDate() + n); return d.getTime(); }
  function weekData(start) {
    var end = addDays(start, 7);
    var items = state.tasks.filter(function (t) { return t.done && t.doneAt >= start && t.doneAt < end; }).sort(function (a, b) { return a.doneAt - b.doneAt; });
    var days = [];
    for (var i = 0; i < 7; i++) {
      var ds = addDays(start, i), de = addDays(start, i + 1);
      var list = items.filter(function (t) { return t.doneAt >= ds && t.doneAt < de; });
      if (list.length) days.push({ at: ds, items: list });
    }
    return { start: start, items: items, xp: items.reduce(function (s, t) { return s + t.rating; }, 0), days: days };
  }
  function longDate(ms, year) {
    return new Date(ms).toLocaleDateString(undefined, year ? { weekday: "short", month: "short", day: "numeric", year: "numeric" } : { weekday: "short", month: "short", day: "numeric" });
  }
  function weekText(w) {
    var lines = ["Week of " + longDate(w.start, true) + ": " + w.items.length + (w.items.length === 1 ? " quest, " : " quests, ") + w.xp + " XP"];
    w.days.forEach(function (d) {
      lines.push(""); lines.push(longDate(d.at, false));
      d.items.forEach(function (t) { lines.push("- " + t.text); });
    });
    return lines.join("\n");
  }
  function copyText(text) {
    if (bridge && bridge.copy) { try { bridge.copy(text); return true; } catch (e) {} }
    try {
      var ta = el("textarea"); ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select(); var ok = document.execCommand("copy"); ta.remove(); return ok;
    } catch (e) { return false; }
  }
  var weekShown = null;
  function openWeek(start) {
    weekShown = start;
    var w = weekData(start), thisWeek = weekStart(Date.now());
    openSheet(function (b) {
      var nav = el("div", "week-nav");
      var prev = el("button", "btn px small", "<"); prev.type = "button"; prev.setAttribute("aria-label", "Previous week");
      prev.onclick = function () { closeSheet(); openWeek(addDays(start, -7)); };
      var next = el("button", "btn px small", ">"); next.type = "button"; next.setAttribute("aria-label", "Next week");
      next.disabled = start >= thisWeek;
      next.onclick = function () { closeSheet(); openWeek(addDays(start, 7)); };
      var mid = el("div", "week-mid");
      mid.appendChild(el("span", "px small", start === thisWeek ? "THIS WEEK" : "WEEK OF " + longDate(start, false).toUpperCase()));
      mid.appendChild(el("span", "px small gold", w.items.length + " QUESTS · " + w.xp + " XP"));
      nav.appendChild(prev); nav.appendChild(mid); nav.appendChild(next);
      b.appendChild(nav);
      var body = el("div", "week-body");
      if (!w.items.length) body.appendChild(el("p", "px small dim", "NOTHING FINISHED THIS WEEK."));
      w.days.forEach(function (d) {
        body.appendChild(el("div", "px small dim week-day", longDate(d.at, false).toUpperCase()));
        d.items.forEach(function (t) {
          var r = el("div", "week-item");
          r.appendChild(el("span", "badge r" + t.rating, String(t.rating)));
          r.appendChild(el("span", "t", t.text));
          body.appendChild(r);
        });
      });
      b.appendChild(body);
      var row = el("div", "sheet-row");
      row.appendChild(button("CLOSE", "", closeSheet));
      var copy = button("COPY", "", function () {
        var ok = copyText(weekText(w));
        copy.textContent = ok ? "COPIED" : "COPY FAILED";
      });
      copy.disabled = !w.items.length;
      row.appendChild(copy);
      b.appendChild(row);
    });
  }
  $("weekBtn").onclick = function () { openWeek(weekStart(Date.now())); };
  $("logSearch").addEventListener("input", function () { renderLog(); renderCoach(); });

  function openSettings() {
    openSheet(function (b) {
      b.appendChild(el("div", "px small dim", "HERO"));
      var hr = el("div", "sheet-row");
      hr.appendChild(button("EDIT HERO", "", function () { closeSheet(); openCreator(false); }));
      hr.appendChild(button("TUTORIAL", "", function () { closeSheet(); show("quests"); setTut("add"); }));
      b.appendChild(hr);
      b.appendChild(el("div", "px small dim", "FEEDBACK"));
      var fr = el("div", "sheet-row");
      ["sound", "haptics"].forEach(function (k) {
        var label = k === "sound" ? "SOUND" : "VIBRATION";
        var t = button(label + ": " + (state.prefs[k] ? "ON" : "OFF"), "", function () {
          state.prefs[k] = !state.prefs[k]; save();
          t.textContent = label + ": " + (state.prefs[k] ? "ON" : "OFF");
          t.setAttribute("aria-pressed", state.prefs[k] ? "true" : "false");
          if (state.prefs[k]) feedback("complete");
        });
        t.setAttribute("aria-pressed", state.prefs[k] ? "true" : "false");
        fr.appendChild(t);
      });
      b.appendChild(fr);
      b.appendChild(el("div", "px small dim", "BACKUP"));
      var row = el("div", "sheet-row");
      row.appendChild(button("EXPORT", "", exportBackup));
      row.appendChild(button("IMPORT", "", importBackup));
      b.appendChild(row);
      b.appendChild(el("div", "px small dim", "CREDITS"));
      var c = el("div", "credits");
      [
        "Hero, scroll, book and floor art: Dungeon Crawl Stone Soup tiles by the Dungeon Crawl Stone Soup artists, based on RLTiles. CC0 1.0 (github.com/crawl/tiles). Extra skin tones are recolors of those tiles.",
        "Sounds: Interface Sounds by Kenney (kenney.nl). CC0 1.0.",
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
    if (!$("welcome").hidden) return false;
    if (!$("creator").hidden) { if (!state.hero) return false; closeCreator(); return true; }
    if (!$("loot").hidden) { closeLoot(false); return true; }
    if (!$("levelUp").hidden) { $("levelUp").hidden = true; popupDone(); return true; }
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
    $("crTitle").textContent = first ? "CREATE YOUR HERO" : "EDIT HERO";
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
    var owned = ownedLoot();
    Object.keys(LOOT_SLOTS).forEach(function (slot) {
      var mine = owned.filter(function (id) { return id.split("/")[0] === slot; });
      var row = $("crRow-" + slot);
      row.hidden = !state.hero; // first-run creator: nothing found yet
      var cur = draft.equip && draft.equip[slot];
      $("crEq-" + slot).textContent = !mine.length ? "NONE FOUND" : cur ? (mine.indexOf(cur) + 1) + "/" + mine.length : "GEAR";
      Array.prototype.forEach.call(row.querySelectorAll("button"), function (b) { b.disabled = !mine.length; });
    });
  }
  function cycleEquip(slot, step) {
    var mine = ownedLoot().filter(function (id) { return id.split("/")[0] === slot; });
    if (!mine.length) return;
    var opts = [null].concat(mine), cur = (draft.equip && draft.equip[slot]) || null;
    var next = opts[(opts.indexOf(cur) + step + opts.length) % opts.length];
    draft.equip = draft.equip || {};
    if (next) draft.equip[slot] = next; else delete draft.equip[slot];
    renderCreator();
  }
  Array.prototype.forEach.call(document.querySelectorAll("#creator .arrow"), function (b) {
    b.onclick = function () {
      var part = b.dataset.part;
      if (LOOT_SLOTS[part]) { cycleEquip(part, Number(b.dataset.step)); return; }
      var n = { body: BODIES.length, skin: SKINS, hair: HAIRS.length }[part];
      draft[part] = (draft[part] + Number(b.dataset.step) + n) % n;
      renderCreator();
    };
  });
  $("crDone").onclick = function () {
    draft.name = $("crName").value.trim().slice(0, 14);
    state.hero = cleanHero(draft); save(); closeCreator();
    if (pendingShare) { var go = pendingShare; pendingShare = null; go(); }
  };
  $("crCancel").onclick = closeCreator;
  $("editHeroBtn").onclick = function () { openCreator(false); };

  /* ---------------- guided tour ---------------- */
  // Runs on the player's own first quest, then shows each tab. Steps move on when the player
  // does the thing (event) or taps OK (next). Skip ends it at any point; the menu replays it.
  function q(sel) { return function () { return document.querySelector(sel); }; }
  var COACH = {
    add: { text: "TYPE A QUEST, THEN TAP +.", target: function () { return $("addForm"); } },
    note: { text: "TAP YOUR QUEST TO OPEN IT.", target: q(".quest .q-text") },
    noteSave: { text: "ADD NOTES OR CHECKLIST STEPS HERE IF YOU WANT. THEN SAVE.", target: q("#sheetBox textarea.notes"), inSheet: true },
    check: { text: "DONE WITH IT? TAP THE BOX.", target: q(".quest .q-check") },
    rate: { text: "HOW HARD WAS IT? 1 IS EASY, 5 IS HARD. THAT'S YOUR XP.", target: q(".quest .rate") },
    xp: { text: "XP FILLS THIS BAR. EACH LEVEL NEEDS A LITTLE MORE.", target: q(".hud"), next: "hero" },
    hero: { text: "TAP HERO TO SEE YOUR CHARACTER.", target: q('.tab[data-view="hero"]') },
    gear: { text: "NEW GEAR UNLOCKS AT THESE LEVELS. EDIT HERO CHANGES YOUR LOOK.", target: function () { return $("gearGrid").parentNode; }, view: "hero", next: "log", scroll: true },
    log: { text: "TAP LOG TO SEE WHAT YOU'VE FINISHED.", target: q('.tab[data-view="log"]'), view: "hero" },
    entry: { text: "FINISHED QUESTS LAND HERE BY DAY. SEARCH THEM, OR TAP WEEK TO COPY A SUMMARY. UNDO TAKES ONE BACK.", target: q(".entry"), view: "log", next: "menu" },
    menu: { text: "THE MENU HAS BACKUPS, HERO EDITS AND THIS TOUR.", target: function () { return $("settingsBtn"); }, view: "log", next: "end" },
    end: { text: "NO DUE DATES. NO PENALTIES. FINISH QUESTS WHEN YOU CAN.", target: function () { return null; }, view: "quests", next: "done", last: true }
  };
  var TOUR = TUT_STEPS.filter(function (s) { return COACH[s]; });
  function setTut(step) { state.tut = step; save(); renderCoach(); }

  // Puts the tour back on track if the player wandered off (deleted the quest, restarted mid-step).
  function repairTut() {
    var t = state.tut, hasQuest = !!document.querySelector(".quest");
    if ((t === "note" || t === "check") && view === "quests" && !hasQuest) t = "add";
    if (t === "rate" && !rating) t = "check";
    if (t === "noteSave" && $("sheet").hidden) t = "check";
    if (t === "entry" && view === "log" && !document.querySelector(".entry")) t = "menu";
    if (t !== state.tut) { state.tut = t; save(); }
  }

  function renderCoach() {
    Array.prototype.forEach.call(document.querySelectorAll(".coach-on"), function (e) { e.classList.remove("coach-on"); });
    var c = $("coach");
    if (!state.hero || !$("creator").hidden || !$("welcome").hidden || !$("levelUp").hidden || !$("loot").hidden) { c.hidden = true; return; }
    repairTut();
    var step = COACH[state.tut];
    if (!step || (step.view || "quests") !== view || (!$("sheet").hidden && !step.inSheet)) { c.hidden = true; return; }
    var target = step.target();
    if (!target && !step.last) { c.hidden = true; return; }
    $("coachText").textContent = step.text;
    $("coachStep").textContent = (TOUR.indexOf(state.tut) + 1) + "/" + TOUR.length;
    $("coachOk").hidden = !step.next;
    $("coachSkip").hidden = !!step.last;
    c.hidden = false;
    var vh = window.innerHeight;
    if (!target) { c.style.top = Math.max(12, (vh - c.offsetHeight) / 2) + "px"; return; }
    if (step.scroll) target.scrollIntoView({ block: "nearest" });
    target.classList.add("coach-on");
    if (step.inSheet) { c.style.top = "12px"; return; } // the sheet fills the bottom; keep its fields visible
    var r = target.getBoundingClientRect();
    if (r.top + r.height / 2 < vh / 2) c.style.top = Math.min(r.bottom + 16, vh - c.offsetHeight - 12) + "px";
    else c.style.top = Math.max(12, r.top - c.offsetHeight - 16) + "px";
  }
  $("coachSkip").onclick = function () { setTut("done"); };
  $("coachOk").onclick = function () {
    var step = COACH[state.tut]; if (!step || !step.next) return;
    if (step.next === "end") { state.tut = "end"; save(); show("quests"); return; }
    setTut(step.next);
  };

  /* ---------------- title screen (first run) ---------------- */
  function openWelcome() {
    [0, 4, 8].forEach(function (tier, i) { drawDoll($("wDoll" + i), null, tier); });
    $("welcome").hidden = false;
    setTimeout(function () { $("wStart").focus(); }, 50);
  }
  $("wStart").onclick = function () { $("welcome").hidden = true; openCreator(true); };
  window.addEventListener("resize", renderCoach);
  $("views").addEventListener("scroll", renderCoach);

  show("quests");
  if (!state.hero) { if (state.tasks.length) openCreator(true); else openWelcome(); }
  if (bridge && bridge.takeShared) {
    try { var sh = JSON.parse(bridge.takeShared() || "null"); if (sh) window.onShared(sh.subject, sh.text); } catch (e) {}
  }
})();

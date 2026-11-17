(function () {
  "use strict";

  var VERSION = "0.1.1";
  var TIERS = [1, 3, 5, 8, 11, 15, 20, 25, 30]; // level each hero look unlocks at (img/hero/tierN.png)
  var KEY = "questlog-data";

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

  function blank() { return { v: 1, tasks: [] }; }
  function sanitize(d) {
    if (!d || !Array.isArray(d.tasks)) return null;
    var tasks = d.tasks.filter(function (t) { return t && typeof t.text === "string" && t.id; }).map(function (t) {
      var r = Number(t.rating);
      return {
        id: String(t.id), text: t.text.slice(0, 300), created: Number(t.created) || Date.now(),
        done: !!t.done && r >= 1 && r <= 5, rating: r >= 1 && r <= 5 ? Math.round(r) : null,
        doneAt: t.doneAt ? Number(t.doneAt) : null
      };
    });
    return { v: 1, tasks: tasks };
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
  function tierFor(level) { var t = 0; for (var i = 0; i < TIERS.length; i++) if (level >= TIERS[i]) t = i; return t; }
  function heroSrc(level) { return "img/hero/tier" + tierFor(level) + ".png"; }

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
    var src = heroSrc(info.level);
    $("hudHero").src = src; $("tabHero").src = src;
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
      var text = el("span", "q-text", t.text);
      text.tabIndex = 0; text.setAttribute("role", "button");
      text.onclick = function () { openEdit(t); };
      text.onkeydown = function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openEdit(t); } };
      var check = el("button", "q-check" + (rating === t.id ? " on" : "")); check.type = "button";
      check.setAttribute("aria-label", "Finish " + t.text);
      check.onclick = function () { rating = rating === t.id ? null : t.id; renderQuests(); };
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
        x.onclick = function () { rating = null; renderQuests(); };
        r.appendChild(x);
        li.appendChild(r);
      }
      list.appendChild(li);
    });
  }

  function renderHero() {
    var xp = totalXp(), info = levelInfo(xp), tier = tierFor(info.level);
    $("heroBig").src = heroSrc(info.level);
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
    TIERS.forEach(function (lv, i) {
      var s = el("div", "gear-slot" + (i > tier ? " locked" : "") + (i === tier ? " current" : ""));
      var frame = el("span", "gear-frame");
      var img = el("img"); img.src = "img/hero/tier" + i + ".png"; img.alt = i > tier ? "Locked" : "Unlocked";
      frame.appendChild(img); s.appendChild(frame); s.appendChild(el("span", "px small " + (i > tier ? "dim" : ""), "LV " + lv));
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
        var body = el("div", "body");
        body.appendChild(el("span", "t", t.text));
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
    state.tasks.push({ id: uid(), text: text, created: Date.now(), done: false, rating: null, doneAt: null });
    save(); render();
  }

  function complete(t, n, li) {
    var before = levelInfo(totalXp()).level;
    t.done = true; t.rating = n; t.doneAt = Date.now();
    rating = null; save();
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
    $("luHero").src = heroSrc(to);
    $("luLevel").textContent = "LV " + to;
    $("luGear").hidden = tierFor(to) === tierFor(from);
    $("levelUp").hidden = false;
    focusLevelUp();
  }
  $("luOk").onclick = function () { $("levelUp").hidden = true; };
  function focusLevelUp() { setTimeout(function () { $("luOk").focus(); }, 50); }

  /* ---------------- sheets ---------------- */
  function openSheet(build) {
    var b = $("sheetBox"); b.textContent = ""; build(b); $("sheet").hidden = false;
    if (!b.contains(document.activeElement)) { var f = b.querySelector("input, button"); if (f) setTimeout(function () { if (!$("sheet").hidden && !b.contains(document.activeElement)) f.focus(); }, 60); }
  }
  function closeSheet() { $("sheet").hidden = true; $("sheetBox").textContent = ""; }
  $("sheet").addEventListener("click", function (e) { if (e.target === $("sheet")) closeSheet(); });

  function button(label, cls, fn) { var b = el("button", "btn px small" + (cls ? " " + cls : ""), label); b.type = "button"; b.onclick = fn; return b; }

  function openEdit(t) {
    openSheet(function (b) {
      b.appendChild(el("div", "px small dim", "EDIT QUEST"));
      var input = el("input"); input.type = "text"; input.maxLength = 300; input.value = t.text;
      b.appendChild(input);
      var row = el("div", "sheet-row");
      row.appendChild(button("DELETE", "danger", function () {
        state.tasks = state.tasks.filter(function (x) { return x.id !== t.id; });
        save(); closeSheet(); render();
      }));
      row.appendChild(button("SAVE", "", function () {
        var v = input.value.trim();
        if (v) { t.text = v; save(); }
        closeSheet(); render();
      }));
      b.appendChild(row);
      setTimeout(function () { input.focus(); }, 50);
    });
  }

  function openSettings() {
    openSheet(function (b) {
      b.appendChild(el("div", "px small dim", "BACKUP"));
      var row = el("div", "sheet-row");
      row.appendChild(button("EXPORT", "", exportBackup));
      row.appendChild(button("IMPORT", "", importBackup));
      b.appendChild(row);
      b.appendChild(el("div", "px small dim", "CREDITS"));
      var c = el("div", "credits");
      [
        "Hero, scroll, book and floor art: Dungeon Crawl Stone Soup tiles by the Dungeon Crawl Stone Soup artists, based on RLTiles. CC0 1.0 (github.com/crawl/tiles).",
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
      row.appendChild(button("REPLACE", "danger", function () { state = data; save(); closeSheet(); show("quests"); }));
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
    if (!$("levelUp").hidden) { $("levelUp").hidden = true; return true; }
    if (!$("sheet").hidden) { closeSheet(); return true; }
    if (rating) { rating = null; renderQuests(); return true; }
    if (view !== "quests") { show("quests"); return true; }
    return false;
  };

  // Esc closes whatever is open, like the Android back button.
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") window.onBack(); });

  // Day labels and "today" stats roll over if the app stays open past midnight.
  document.addEventListener("visibilitychange", function () { if (!document.hidden) render(); });

  show("quests");
})();

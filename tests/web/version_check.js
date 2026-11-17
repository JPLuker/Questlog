// Fails if the app's shown version drifts from the VERSION file (VERSIONING.md 4.2).
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, "../..");
const want = fs.readFileSync(path.join(root, "VERSION"), "utf8").trim();
const js = fs.readFileSync(path.join(root, "app/src/main/assets/www/app.js"), "utf8");
const m = js.match(/var VERSION = "([^"]+)";/);
if (!m || m[1] !== want) { console.error(`app.js VERSION is ${m ? m[1] : "missing"}, VERSION file says ${want}`); process.exit(1); }
console.log("PASS version " + want);

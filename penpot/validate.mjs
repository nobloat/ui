// node validate.mjs apps/<app>.json  — checks a screen spec against the DSL before it is rendered in Penpot
import fs from "node:fs";
const icons = new Set(fs.readdirSync(new URL("../icons/", import.meta.url)).filter(f => f.endsWith(".svg")).map(f => f.slice(0, -4)));
const ORDER = ["header","head","dialog","menu","empty","menuitem","tile","btn","ibtn","field","mfield","table","list","tiles","info","tabs","crumbs","pager","bars","columns","meter","seg","card","col","row","money","check","radio","chip","tag","status","badge","id","msg","toast","tab","nav","avatar","logo","search","key","icon","rect","spacer","hr","t"];
const SP = [null, undefined, "3xs","2xs","xs","sm","md","lg","xl","2xl"], ST = ["h1","h2","body","small","label","figure"];
const COL = ["fg","muted","accent","on","red","green","yellow","blue","grey","white","on-tile"], FILL = ["bg","surface","chip","sel","hover","accent","line","line-strong","stage","tile","tint.blue","state.green","state.yellow","state.red","state.blue","state.grey"];
const errs = []; let nodes = 0;
const E = (p, m) => errs.push(`${p}: ${m}`);
const en = (p, v, list, what) => { if (v !== undefined && !list.includes(v)) E(p, `${what} "${v}" not in ${list.filter(Boolean).join("|")}`); };
const ic = (p, v) => { if (v && !icons.has(v)) E(p, `unknown icon "${v}"`); };
const kids = (p, a) => { if (!Array.isArray(a)) return E(p, "children must be an array"); a.forEach((k, i) => k != null && k !== false && node(`${p}[${i}]`, k)); };
function node(p, o) {
  nodes++;
  if (typeof o === "string") return;
  if (typeof o !== "object") return E(p, "node must be an object or string");
  const k = ORDER.find(k => o[k] !== undefined);
  if (!k) { if (o.kids) return kids(p, o.kids); return E(p, "unknown node " + JSON.stringify(o).slice(0, 80)); }
  p += "." + k;
  for (const key of ORDER) if (key !== k && o[key] !== undefined && !(k === "btn" && key === "icon") && !(k === "empty" && (key === "icon" || key === "btn")) && !(k === "menuitem" && (key === "icon" || key === "key")) && !(k === "field" && key === "msg") && !(k === "mfield" && key === "msg") && !(k === "card" && key === "t") && !(k === "status" && key === "t"))
    E(p, `also has key "${key}", which is its own node type (a "${ORDER.indexOf(key) < ORDER.indexOf(k) ? key : k}" wins); rename or nest it`);
  en(p, o.gap, SP, "gap"); (Array.isArray(o.pad) ? o.pad : [o.pad]).forEach(x => en(p, x, SP, "pad"));
  en(p, o.fill, [undefined, ...FILL], "fill"); en(p, o.only, [undefined, "d", "p"], "only");
  en(p, o.radius, [undefined, "small", "control", "panel", "pill"], "radius");
  if (k === "t") { en(p, o.s, [undefined, ...ST], "text style s"); en(p, o.c, [undefined, ...COL], "text color c"); if (typeof o.t !== "string" && typeof o.t !== "number") E(p, "t must be a string"); }
  if (k === "col" || k === "row" || k === "card") kids(p, o[k]);
  if (k === "btn") { en(p, o.kind, [undefined, "primary", "secondary", "delete"], "kind"); if (o.icon !== false) ic(p, o.icon); if (typeof o.btn !== "string") E(p, "btn must be the label string"); }
  if (k === "ibtn") { ic(p, o.ibtn); en(p, o.kind, [undefined, "default", "primary", "danger"], "kind"); en(p, o.size, [undefined, "sm", "md", "lg"], "size"); }
  if (k === "icon") { ic(p, o.icon); en(p, o.c, [undefined, ...COL], "c"); }
  if (k === "field") { en(p, o.type, [undefined, "Text", "Select", "Textarea"], "type"); en(p, o.state, [undefined, "Default", "Error", "Saved"], "state"); if (o.sm && (o.type === "Textarea" || o.state && o.state !== "Default")) E(p, "sm only for Text/Select in Default state"); if (o.msg && (!o.state || o.state === "Default")) E(p, "msg needs state Error or Saved"); }
  if (k === "mfield") { en(p, o.cur, [undefined, "EUR", "USD", "GBP", "CHF"], "cur"); en(p, o.state, [undefined, "Default", "Error"], "state"); }
  if (k === "money") en(p, o.sign, [undefined, "pos", "neg"], "sign");
  if (k === "status") en(p, o.s, [undefined, "ok", "pending", "bad", "running", "off"], "s");
  if (k === "msg") en(p, o.kind, [undefined, "error", "ok", "warning", "info"], "kind");
  if (k === "toast") en(p, o.kind, [undefined, "ok", "error"], "kind");
  if (k === "seg" || k === "tabs" || k === "crumbs") { if (!Array.isArray(o[k]) || o[k].some(x => typeof x !== "string")) E(p, "must be an array of strings"); }
  if (k === "head") { if (typeof o.head !== "string") E(p, "head must be the title string"); (o.actions || []).forEach((a, i) => node(`${p}.actions[${i}]`, a)); if (o.state) node(p + ".state", o.state); if (o.sub) node(p + ".sub", o.sub); }
  if (k === "table") { const t = o.table; if (!t?.cols || !t?.rows) return E(p, "table needs cols and rows"); t.rows.forEach((r, i) => { if (r.length !== t.cols.length) E(`${p}.rows[${i}]`, `has ${r.length} cells, table has ${t.cols.length} cols`); r.forEach((c, j) => c && typeof c === "object" && node(`${p}.rows[${i}][${j}]`, c)); }); if (t.cols.filter(c => !c.w).length < 1) E(p, "at least one column must have no w (it takes the free width)"); }
  if (k === "list") o.list.forEach((r, i) => { if (typeof r.main !== "string") E(`${p}[${i}]`, "list row needs main (string)"); en(`${p}[${i}]`, r.dot, [undefined, "ok", "pending", "bad", "running", "off"], "dot"); (r.act || []).forEach((a, j) => node(`${p}[${i}].act[${j}]`, a)); });
  if (k === "info") o.info.forEach((r, i) => { if (!Array.isArray(r) || r.length !== 2) return E(`${p}[${i}]`, "info rows are [label, value]"); if (typeof r[1] === "object") node(`${p}[${i}]`, r[1]); });
  if (k === "tiles") o.tiles.forEach((t, i) => { if (typeof t.tile !== "string" || t.value === undefined) E(`${p}[${i}]`, "tile needs tile (label) and value"); });
  if (k === "bars") o.bars.forEach((b, i) => { if (!Array.isArray(b) || b.length !== 3 || typeof b[2] !== "number" || b[2] > 1) E(`${p}[${i}]`, "bars rows are [label, valueText, fraction 0..1]"); });
  if (k === "columns" && (!Array.isArray(o.columns) || o.columns.some(v => typeof v !== "number"))) E(p, "columns is an array of numbers");
  if (k === "dialog") { kids(p, o.kids || []); (o.actions || []).forEach((a, i) => node(`${p}.actions[${i}]`, a)); }
  if (k === "menu") o.menu.forEach((m, i) => { if (Array.isArray(m)) ic(`${p}[${i}]`, m[0]); else if (typeof m !== "string") E(`${p}[${i}]`, "menu rows are \"-\", a label string, or [icon, label, key?]"); });
  if (k === "empty") { ic(p, o.icon); if (o.btn) node(p + ".btn", o.btn); }
  if (k === "rect" && (!Array.isArray(o.rect) || o.rect.length < 3 || !FILL.includes(o.rect[2]))) E(p, "rect is [w, h, fill]");
}
for (const f of process.argv.slice(2)) {
  const j = JSON.parse(fs.readFileSync(f, "utf8"));
  if (!j.app?.name || !Array.isArray(j.screens)) { E(f, "needs app{name,ch,nav,user} and screens[]"); continue; }
  const names = new Set();
  j.screens.forEach((s, i) => { const p = `${f}#${i}(${s.name})`; if (!s.name) E(p, "screen needs name"); if (names.has(s.name)) E(p, "duplicate screen name"); names.add(s.name); if (s.here && !(j.app.nav || []).includes(s.here) && s.here !== "") E(p, `here "${s.here}" is not in app.nav`); kids(p, s.kids || []); });
  console.log(`${f}: ${j.screens.length} screens, ${nodes} nodes`);
}
if (errs.length) { console.log(errs.length + " problems:\n" + errs.slice(0, 60).join("\n")); process.exit(1); } else console.log("valid");

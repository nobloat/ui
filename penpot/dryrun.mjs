// node dryrun.mjs [apps...] — runs the renderer against every screen with a mock Penpot, to catch errors before Penpot time is spent
import fs from "node:fs";
const shape = (type, name = type) => ({ type, name, children: [], tokens: {}, fills: [], strokes: [], parent: null, layoutChild: {}, flex: null,
  addFlexLayout() { return this.flex = {}; }, appendChild(c) { this.children.push(c); c.parent = this; }, resize() {}, remove() {}, sendToBack() {},
  swapComponent(c) { this.name = "icon / " + c.name; } });
const inst = name => { const b = shape("board", name); b.flex = {}; const ic = shape("board", "icon / plus"); b.appendChild(ic); b.isInst = true; return b; };
const comp = (name, variantProps) => ({ name, variantProps, instance: () => inst(name) });
const penpotUtils = { findShapes: (p, root) => root?.isInst || root?.isBox ? [0, 1, 2, 3].map(() => { const t = shape("text"); t.parent = shape("board"); return t; }) : [], findShape: (p, root) => { const b = shape("board"); b.isBox = true; return b; }, getPages: () => [], getPageByName: () => null, getPageById: () => null };
const tokNames = ["brand","bg","surface","fg","muted","line","line-strong","chip","accent","on-accent","sel","focus","hover","accent-hover","on-danger","stage","tile","on-tile","tint.blue","state.green","state.yellow","state.red","state.blue","state.grey","state-text.green","state-text.yellow","state-text.red","state-text.blue","state-text.grey"].map(n => "color." + n)
  .concat(["3xs","2xs","xs","sm","md","lg","xl","2xl","unit"].map(n => "space." + n), ["small","control","panel","pill"].map(n => "radius." + n), ["border.thin","border.focus","size.control.sm","size.control.md","size.control.lg","size.icon.md","size.icon.lg","shadow.overlay"], ["body","small","label","h1","h2","figure"].map(n => "text." + n));
const penpot = { createBoard: () => shape("board"), createText: () => shape("text"), createRectangle: () => shape("rectangle"), root: shape("board"), currentPage: {},
  library: { local: { components: [], tokens: { themes: [], sets: [{ active: true, tokens: tokNames.map(name => ({ name, applyToShapes() {} })) }] } } } };
const storage = {};
globalThis.fetch = async () => ({ text: async () => "", json: async () => ({}) });
await new Function("storage", "penpot", "penpotUtils", "return (async () => {" + fs.readFileSync(new URL("./lib.js", import.meta.url), "utf8") + "\n})()")(storage, penpot, penpotUtils);
const { H, R } = storage;
const V = (name, axes) => { const keys = Object.keys(axes); let combos = [{}]; for (const k of keys) combos = combos.flatMap(c => axes[k].map(v => ({ ...c, [k]: v }))); return combos.map(c => comp(name, c)); };
H.loadComps = () => {};
H.sets = { Button: V("Button", { Type: ["Primary", "Secondary", "Delete"], Size: ["sm", "md"] }), "Icon button": V("Icon button", { Type: ["Default", "Primary", "Danger"], Size: ["sm", "md", "lg"] }),
  Money: V("Money", { Sign: ["Neutral", "Positive", "Negative"], Currency: ["EUR", "USD", "GBP", "CHF"] }),
  Field: [...V("Field", { Type: ["Text", "Select", "Textarea"], Size: ["md"], State: ["Default", "Error", "Saved"] }), ...V("Field", { Type: ["Text", "Select"], Size: ["sm"], State: ["Default"] })],
  "Money field": V("Money field", { Currency: ["EUR", "USD", "GBP", "CHF"], State: ["Default", "Error"] }), Checkbox: V("Checkbox", { Checked: ["On", "Off"] }), Radio: V("Radio", { Checked: ["On", "Off"] }),
  Chip: V("Chip", { Selected: ["On", "Off"] }), Tag: V("Tag", { Style: ["Plain", "Colored"] }), Status: V("Status", { State: ["Ok", "Pending", "Bad", "Running", "Off"] }),
  Message: V("Message", { Type: ["Error", "Ok", "Warning", "Info"] }), Toast: V("Toast", { Type: ["Ok", "Error"] }), Tab: V("Tab", { State: ["Active", "Default"] }), "Nav item": V("Nav item", { State: ["Active", "Default"] }) };
H.singles = Object.fromEntries(["Badge", "Id", "Key", "Menu item", "Avatar", "Stat tile", "Segmented"].map(n => [n, comp(n)]));
H.icons = Object.fromEntries(fs.readdirSync(new URL("../icons/", import.meta.url)).filter(f => f.endsWith(".svg")).map(f => f.slice(0, -4)).map(n => [n, comp(n)]));
const files = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync(new URL("./apps/", import.meta.url)).filter(f => f.endsWith(".json")).map(f => f.slice(0, -5));
let total = 0, bad = 0;
for (const f of files) {
  const spec = JSON.parse(fs.readFileSync(new URL(`./apps/${f}.json`, import.meta.url), "utf8")); let errs = 0;
  spec.screens.forEach((s, i) => { for (const vp of ["d", "p"]) { if (s.only && s.only !== vp) continue; total++; try { R.screen(spec.app, s, vp); H.flush(); } catch (e) { H.q = []; errs++; bad++; console.log(`  ${f}[${i}] ${s.name} (${vp}): ${e.message}`); } } });
  console.log(`${f}: ${spec.screens.length} screens, ${errs} errors`);
}
console.log(`${total} boards, ${bad} errors`); process.exit(bad ? 1 : 0);

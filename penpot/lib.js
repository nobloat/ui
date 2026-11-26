// nobloat design system: helpers (storage.H) and the screen renderer (storage.R) for the Penpot plugin.
// Loaded with: await (await fetch("http://127.0.0.1:8765/lib.js")).text() -> AsyncFunction(storage, penpot, penpotUtils)
const H = storage.H = {};
const R = storage.R = {};
const lib = penpot.library.local, cat = lib.tokens;
const BASE = "http://127.0.0.1:8765/";

H.wait = ms => new Promise(r => setTimeout(r, ms));
H.json = async f => (await fetch(BASE + f + "?" + Date.now())).json();
H.radii = ["borderRadiusTopLeft", "borderRadiusTopRight", "borderRadiusBottomRight", "borderRadiusBottomLeft"];

// ---- tokens: queue bindings, apply them grouped (applyToShapes toggles, so never apply what is already bound)
H.loadTokens = () => { H.tokens = {}; for (const s of cat.sets) for (const t of s.tokens) if (!H.tokens[t.name] || s.active) H.tokens[t.name] = t; };
H.loadTokens();
H.q = [];
H.use = (shape, name, props) => { if (!H.tokens[name]) throw new Error("no token " + name); H.q.push([shape, name, props]); };
H.flush = () => {
  const g = new Map();
  for (const [s, n, p] of H.q) {
    const need = p.filter(x => s.tokens?.[x] !== n); if (!need.length) continue;
    const k = n + "|" + need.join(","); if (!g.has(k)) g.set(k, { n, need, shapes: [] }); g.get(k).shapes.push(s);
  }
  H.q = [];
  for (const { n, need, shapes } of g.values()) H.tokens[n].applyToShapes(shapes, need);
  return g.size;
};

// ---- pages, themes
H.page = async name => { let p = penpotUtils.getPageByName(name); if (!p) { p = penpot.createPage(); p.name = name; } if (penpot.currentPage.id !== p.id) await penpot.openPage(p); return p; };
H.theme = async name => {
  const t = cat.themes.find(x => x.name === name); if (!t.active) t.toggleActive();
  await H.wait(1800);
  const ok = cat.themes.every(x => x.active === (x.name === name)) && cat.sets.every(s => s.active === (s.name === "core" || s.name === "mode/" + name));
  if (!ok) throw new Error("theme state wrong: " + JSON.stringify(cat.sets.map(s => [s.name, s.active])));
  H.loadTokens(); return name;
};

// ---- components
H.loadComps = () => {
  H.sets = {}; H.singles = {}; H.icons = {};
  for (const pg of penpotUtils.getPages()) for (const s of penpotUtils.findShapes(x => x.isVariantContainer?.(), penpotUtils.getPageById(pg.id).root)) H.sets[s.name] = s.variants.variantComponents();
  for (const c of lib.components) { if (c.path === "icon") H.icons[c.name] = c; else if (!H.sets[c.name]) H.singles[c.name] = c; }
};
H.comp = (name, props) => {
  if (!H.sets) H.loadComps();
  const set = H.sets[name];
  const c = set ? set.find(c => Object.entries(props || {}).every(([k, v]) => c.variantProps?.[k] === v)) : H.singles[name];
  if (!c) throw new Error("no component " + name + " " + JSON.stringify(props || {}));
  return c;
};
H.icon = name => { if (!H.sets) H.loadComps(); const c = H.icons[name]; if (!c) throw new Error("no icon " + name); return c; };
H.tint = (ic, token) => { // direct, guarded: nested copies inherit the main's binding
  const st = penpotUtils.findShapes(s => s.type !== "board" && s.strokes?.length && s.tokens?.strokeColor !== token, ic);
  const fi = penpotUtils.findShapes(s => s.type !== "board" && s.fills?.length && s.tokens?.fill !== token, ic);
  if (st.length) H.tokens[token].applyToShapes(st, ["strokeColor"]);
  if (fi.length) H.tokens[token].applyToShapes(fi, ["fill"]);
};
H.single = (shape, name, path) => { const c = lib.createComponent([shape]); c.name = name; if (path) c.path = path; H.sets = null; return c; };
H.variants = (name, items, x, y) => {
  const its = items.map(({ shape, properties }) => { const c = lib.createComponent([shape]); c.name = name; return { shape: c.mainInstance(), properties }; });
  const v = penpotUtils.createVariantContainer(its); v.name = name; v.fills = []; v.x = x; v.y = y;
  const ms = its.map(i => i.shape); v.resize(Math.max(...ms.map(m => m.x + m.width)) - v.x + 24, Math.max(...ms.map(m => m.y + m.height)) - v.y + 24);
  H.sets = null; return v;
};

// ---- checks (current page)
const lum = c => { const v = c.replace("#", "").match(/../g).map(x => parseInt(x, 16) / 255).map(v => v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; };
const cr = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return +((x + .05) / (y + .05)).toFixed(2); };
const where = s => { const p = []; let x = s; while (x && x.parent) { p.unshift(x.name); x = x.parent; } return p.slice(0, 2).concat(p.length > 3 ? ["…"] : [], p.slice(-1)).join(" > "); };
const faded = s => { let p = s; while (p) { if (p.opacity != null && p.opacity < 1) return true; p = p.parent; } return false; };
H.audit = () => {
  const res = {}; for (const s of cat.sets) if (s.active) for (const t of s.tokens) if (t.type === "color") res[t.name] = (t.resolvedValueString || "").toLowerCase();
  const bad = {};
  const add = (k, s) => { (bad[k] ??= []).push(where(s)); };
  for (const s of penpotUtils.findShapes(x => !x.isVariantContainer?.(), penpot.root)) {
    const tk = s.tokens || {};
    if (s.fills?.length) { if (!tk.fill) add("no fill token", s); else if (res[tk.fill] !== s.fills[0].fillColor?.toLowerCase()) add("stale fill " + tk.fill, s); }
    if (s.strokes?.length) { if (!tk.strokeColor) add("no stroke token", s); else if (res[tk.strokeColor] !== s.strokes[0].strokeColor?.toLowerCase()) add("stale stroke " + tk.strokeColor, s); }
    if (s.type === "text" && !tk.typography) add("no text style", s);
  }
  return Object.entries(bad).map(([k, v]) => `${k} ×${v.length}: ${v.slice(0, 2).join(" | ")}`);
};
H.contrast = () => {
  const stage = penpot.root.children.find(c => c.name === "Stage");
  const bgOf = s => { let p = s.parent; while (p && p.parent) { if (p.fills?.length && p.type === "board") return [p.fills[0].fillColor, p.tokens?.fill || p.name]; p = p.parent; } return stage ? [stage.fills[0].fillColor, "color.bg"] : [penpot.currentPage.background || "#E8E9EA", "CANVAS"]; };
  const fails = {}; let low = [99, ""]; const seen = new Set();
  const add = (kind, fg, fgTok, s, min) => { if (!fg) return; const [bg, bgTok] = bgOf(s); const r = cr(fg, bg); const k = `${kind} ${fgTok} on ${bgTok}`; seen.add(k); if (r < low[0]) low = [r, k]; if (r < min) (fails[`${k} = ${r} (<${min})`] ??= []).push(where(s)); };
  for (const s of penpotUtils.findShapes(x => !x.isVariantContainer?.() && x.name !== "Stage", penpot.root)) {
    if (faded(s)) continue;
    if (s.type === "text" && s.fills?.length) add("text", s.fills[0].fillColor, s.tokens?.fill, s, 4.5);
    else if (s.parent?.name?.startsWith("icon /")) add("icon", s.strokes?.[0]?.strokeColor || s.fills?.[0]?.fillColor, s.tokens?.strokeColor || s.tokens?.fill, s.parent, 3);
    else if (s.type === "board" && s.strokes?.length && ["input", "box", "search"].includes(s.name)) add("edge", s.strokes[0].strokeColor, s.tokens?.strokeColor, s, 3);
    else if (s.name === "dot" && s.strokes?.length) add("dot", s.strokes[0].strokeColor, s.tokens?.strokeColor, s, 3);
  }
  return { pairs: seen.size, lowest: low.join(" "), fails: Object.entries(fails).map(([k, v]) => `${k} ×${v.length}: ${v.slice(0, 2).join(" | ")}`) };
};
H.layout = () => { // children sticking out of their parent, collapsed boards
  const bad = [];
  for (const s of penpotUtils.findShapes(x => x.parent?.type === "board" && x.parent.parent && !x.parent.name.startsWith("icon /") && !x.parent.isVariantContainer?.(), penpot.root)) {
    const p = s.parent;
    if (s.name === "spacer" || s.name === "hr" || s.hidden || s.parent.hidden || (s.type === "board" && s.children.length && s.children.every(k => k.hidden))) continue;
    if (s.type === "board" && (s.width < 1 || s.height < 1)) bad.push("collapsed: " + where(s));
    else if (s.x < p.x - 1.5 || s.y < p.y - 1.5 || s.x + s.width > p.x + p.width + 1.5 || s.y + s.height > p.y + p.height + 1.5) bad.push(`overflow ${Math.round(s.x + s.width - p.x - p.width)}/${Math.round(s.y + s.height - p.y - p.height)}: ` + where(s));
  }
  return bad.length ? [`${bad.length} layout problems`, ...bad.slice(0, 6)] : [];
};
H.fit = () => { // texts wrap, boxes take the parent's width, rows of components wrap
  let n = 0;
  for (const s of penpotUtils.findShapes(x => x.parent?.type === "board" && x.parent.parent && x.parent.flex && !x.hidden && x.layoutChild && !x.parent.name.startsWith("icon /"), penpot.root)) {
    const p = s.parent; if (s.x + s.width <= p.x + p.width + 1.5 || s.name === "spacer" || s.name === "hr") continue;
    let inst = false; try { inst = !!s.isComponentInstance?.(); } catch (e) {}
    let pin = false; try { pin = !!p.isComponentInstance?.() || !!p.isComponentCopyInstance?.(); } catch (e) {}
    if (pin) continue;
    if (s.type === "text") { s.growType = "auto-height"; s.layoutChild.horizontalSizing = "fill"; n++; }
    else if (s.type === "board" && s.flex && !inst) { const vs = s.flex.verticalSizing; s.flex.horizontalSizing = "fix"; s.flex.verticalSizing = vs; s.layoutChild.horizontalSizing = "fill"; n++; }
    else if (p.flex.dir === "row" && p.flex.wrap !== "wrap") { p.flex.wrap = "wrap"; n++; }
  }
  return n;
};
H.check = () => ({ audit: H.audit(), contrast: H.contrast(), layout: H.layout() });
H.checkBoth = async () => { // light, dark, back to light
  const out = {};
  for (const t of ["light", "dark"]) { await H.theme(t); const c = H.check(); out[t] = { audit: c.audit, contrastFails: c.contrast.fails, lowest: c.contrast.lowest, pairs: c.contrast.pairs }; if (t === "light") out.layout = c.layout; }
  await H.theme("light"); return out;
};
H.stage = () => { // themed background behind everything on a page that has loose shapes (Components)
  let st = penpot.root.children.find(c => c.name === "Stage");
  const kids = penpot.root.children.filter(c => c.name !== "Stage"); if (!kids.length) return;
  if (!st) { st = penpot.createBoard(); st.name = "Stage"; H.use(st, "color.bg", ["fill"]); H.flush(); }
  st.blocked = false;
  const x0 = Math.min(...kids.map(k => k.x)) - 80, y0 = Math.min(...kids.map(k => k.y)) - 116, x1 = Math.max(...kids.map(k => k.x + k.width)) + 80, y1 = Math.max(...kids.map(k => k.y + k.height)) + 80;
  st.x = x0; st.y = y0; st.resize(x1 - x0, y1 - y0); st.sendToBack(); st.blocked = true;
};

// ================= renderer =================
const C = { fg: "color.fg", muted: "color.muted", accent: "color.accent", on: "color.on-accent", red: "color.state-text.red", green: "color.state-text.green", yellow: "color.state-text.yellow", blue: "color.state-text.blue", grey: "color.state-text.grey", white: "color.on-danger" };
const D = { fg: "color.on-tile", muted: "color.on-tile", grey: "color.state.grey", accent: "color.state.blue", red: "color.state.red", green: "color.state.green", yellow: "color.state.yellow", blue: "color.state.blue" };
const col = (c, ctx) => (ctx && ctx.dark && D[c || "fg"]) || C[c || "fg"] || "color." + c;
const T = { h1: "text.h1", h2: "text.h2", body: "text.body", small: "text.small", label: "text.label", figure: "text.figure" };
const cap = s => s[0].toUpperCase() + s.slice(1);
const texts = i => penpotUtils.findShapes(s => s.type === "text", i);
const nm = s => String(s).split(String.fromCharCode(47)).join(" ").trim().slice(0, 40) || "text";
const setText = (t, s) => { if (t && s != null) { t.characters = String(s).length ? String(s) : " "; t.name = nm(s); } };
const inner = (i, boxName) => { const b = penpotUtils.findShape(s => s.type === "board" && s.name === boxName, i); return b ? texts(b)[0] : null; };

R.text = (o, ctx) => {
  const s = String(o.t ?? ""); const t = penpot.createText(s.length ? s : " "); t.name = nm(s); t.growType = "auto-width";
  H.use(t, T[o.s || "body"], ["typography"]); H.use(t, col(o.c, ctx), ["fill"]);
  if (o.right) t.align = "right"; if (o.center) t.align = "center";
  return t;
};
R.rect = (w, h, fill, radius) => { const r = penpot.createRectangle(); r.name = "bar"; r.resize(Math.max(w, 1), Math.max(h, 1)); H.use(r, "color." + fill, ["fill"]); if (radius) H.use(r, "radius." + radius, H.radii); return r; };
R.box = (o, dir, ctx) => {
  if (ctx.vp === "p" && o.w > 358 && !o.screen) o = { ...o, w: 358 };
  if (o.fill === "stage" || o.fill === "tile") ctx = { ...ctx, dark: true };
  const b = penpot.createBoard(); b.name = o.name || dir; b.fills = []; b.clipContent = !!o.clip;
  const f = b.addFlexLayout(); f.dir = dir;
  f.alignItems = o.align || (dir === "row" ? "center" : "start"); f.justifyContent = o.justify || "start";
  if (o.wrap) f.wrap = "wrap";
  if (o.w || o.h) b.resize(o.w || 100, o.h || 100);
  f.horizontalSizing = o.w ? "fix" : "auto"; f.verticalSizing = o.h ? "fix" : "auto";
  if (o.gap) H.use(b, "space." + o.gap, ["rowGap", "columnGap"]);
  if (o.pad) { const [py, px] = Array.isArray(o.pad) ? o.pad : [o.pad, o.pad]; if (py) H.use(b, "space." + py, ["paddingTop", "paddingBottom"]); if (px) H.use(b, "space." + px, ["paddingLeft", "paddingRight"]); }
  if (o.fill) H.use(b, "color." + o.fill, ["fill"]);
  if (o.radius) H.use(b, "radius." + o.radius, H.radii);
  if (o.stroke) { b.strokes = [{ strokeColor: "#000000", strokeWidth: 1, strokeAlignment: "inner", strokeOpacity: 1 }]; H.use(b, "color." + o.stroke, ["strokeColor"]); }
  if (o.shadow) H.use(b, "shadow.overlay", ["shadow"]);
  if (o.ctl) H.use(b, "size.control." + o.ctl, ["height"]);
  for (const k0 of (o.kids || [])) {
    if (k0 == null || k0 === false) continue;
    const k = typeof k0 === "string" ? { t: k0 } : k0;
    if (k.only && k.only !== ctx.vp) continue;
    const c = R.node(k, ctx); if (!c) continue;
    b.appendChild(c); R.place(c, k, dir);
  }
  return b;
};
const HUG = ["btn", "ibtn", "chip", "tag", "status", "badge", "id", "key", "money", "check", "radio", "seg", "icon", "avatar", "logo", "nav", "t", "pager", "tab", "menuitem"];
R.fillW = c => {
  if (c.type === "board" && c.flex) { const vs = c.flex.verticalSizing; c.flex.horizontalSizing = "fix"; c.flex.verticalSizing = vs; }
  if (c.type === "text") c.growType = "auto-height";
  c.layoutChild.horizontalSizing = "fill";
};
R.place = (c, k, dir) => {
  if (!c.layoutChild) return;
  const hug = k.hug || k.w || HUG.includes(R.kind(k));
  const fill = k.fillW ?? (dir === "column" ? (k.wrap || k.full || !hug) : !!k.grow);
  if (fill) R.fillW(c);
  if (k.fillH) c.layoutChild.verticalSizing = "fill";
  if (k.self) c.layoutChild.alignSelf = k.self;
};
const swapIcon = (inst, name, token) => {
  const ic = inst.children.find(c => c.name.startsWith("icon /")); if (!ic) return;
  if (name === false) { ic.hidden = true; return; }
  if (name && ic.name !== "icon / " + name) { ic.swapComponent(H.icon(name)); const n = inst.children.find(c => c.name.startsWith("icon /")); if (n && token) H.tint(n, token); }
};

R.types = {
  t: (o, ctx) => R.text(o, ctx),
  col: (o, ctx) => R.box({ ...o, kids: o.col }, "column", ctx),
  row: (o, ctx) => (ctx.vp === "p" && o.stack) ? R.box({ ...o, kids: o.row.map(k => k && k.kind === "primary" ? { ...k, full: true } : k), align: "start", gap: o.gap || "sm" }, "column", ctx) : R.box({ ...o, kids: o.row }, "row", ctx),
  card: (o, ctx) => R.box({ name: "card", fill: "surface", stroke: "line", radius: "panel", pad: o.pad || "md", gap: o.gap || "sm", ...o, kids: [o.title ? { t: o.title, s: "h2" } : null, ...o.card] }, "column", ctx),
  spacer: () => { const b = penpot.createBoard(); b.name = "spacer"; b.fills = []; b.resize(8, 1); return b; },
  hr: () => { const r = R.rect(100, 1, "line"); r.name = "hr"; return r; },
  icon: (o, ctx) => { const i = H.icon(o.icon).instance(); if ((o.c && o.c !== "fg") || ctx.dark) H.tint(i, col(o.c, ctx)); return i; },
  btn: (o, ctx) => {
    const kind = o.kind || "secondary";
    const i = H.comp("Button", { Type: cap(kind), Size: o.sm ? "sm" : "md" }).instance();
    setText(texts(i)[0], o.btn);
    swapIcon(i, o.icon ?? (kind === "delete" ? undefined : false), kind === "primary" ? "color.on-accent" : kind === "delete" ? "color.state-text.red" : null);
    return i;
  },
  ibtn: o => { const i = H.comp("Icon button", { Type: cap(o.kind || "default"), Size: o.size || "md" }).instance(); swapIcon(i, o.ibtn, o.kind === "primary" ? "color.on-accent" : o.kind === "danger" ? "color.on-danger" : null); return i; },
  field: o => {
    const i = H.comp("Field", { Type: o.type || "Text", Size: o.sm ? "sm" : "md", State: o.state || "Default" }).instance();
    setText(texts(i)[0], o.field); const v = inner(i, "input"); setText(v, o.v ?? o.ph ?? " ");
    if (o.ph && o.v == null && v) H.use(v, "color.muted", ["fill"]);
    if (o.msg) setText(inner(i, "message"), o.msg);
    return i;
  },
  mfield: o => { const i = H.comp("Money field", { Currency: o.cur || "EUR", State: o.state || "Default" }).instance(); setText(texts(i)[0], o.mfield); setText(inner(i, "input"), o.v); if (o.msg) setText(inner(i, "message"), o.msg); return i; },
  money: o => { const i = H.comp("Money", { Sign: o.sign === "pos" ? "Positive" : o.sign === "neg" ? "Negative" : "Neutral", Currency: "EUR" }).instance(); setText(texts(i)[0], o.money); return i; },
  check: o => { const i = H.comp("Checkbox", { Checked: o.on ? "On" : "Off" }).instance(); setText(texts(i)[0], o.check); return i; },
  radio: o => { const i = H.comp("Radio", { Checked: o.on ? "On" : "Off" }).instance(); setText(texts(i)[0], o.radio); return i; },
  chip: o => { const i = H.comp("Chip", { Selected: o.on ? "On" : "Off" }).instance(); const t = texts(i); setText(t[0], o.chip); if (o.n == null) t[1].hidden = true; else setText(t[1], o.n); return i; },
  tag: o => { const i = H.comp("Tag", { Style: o.tint ? "Colored" : "Plain" }).instance(); setText(texts(i)[1], o.tag); return i; },
  status: o => { const i = H.comp("Status", { State: cap(o.s || "ok") }).instance(); if (o.status) setText(texts(i)[0], o.status); else texts(i)[0].hidden = true; return i; },
  badge: o => { const i = H.comp("Badge").instance(); setText(texts(i)[0], o.badge); return i; },
  id: o => { const i = H.comp("Id").instance(); setText(texts(i)[0], o.id); return i; },
  key: o => { const i = H.comp("Key").instance(); setText(texts(i)[0], o.key); return i; },
  msg: o => { const i = H.comp("Message", { Type: cap(o.kind || "info") }).instance(); setText(texts(i)[0], o.msg); return i; },
  toast: o => { const i = H.comp("Toast", { Type: cap(o.kind || "ok") }).instance(); setText(texts(i)[0], o.toast); return i; },
  tab: o => { const i = H.comp("Tab", { State: o.on ? "Active" : "Default" }).instance(); setText(texts(i)[0], o.tab); return i; },
  nav: o => { const i = H.comp("Nav item", { State: o.on ? "Active" : "Default" }).instance(); setText(texts(i)[0], o.nav); return i; },
  menuitem: o => { const i = H.comp("Menu item").instance(); const t = texts(i); setText(t[0], o.menuitem); if (o.key) setText(t[1], o.key); else if (t[1]) t[1].parent.hidden = true; swapIcon(i, o.icon || false, "color.muted"); return i; },
  avatar: o => { const i = H.comp("Avatar").instance(); setText(texts(i)[0], o.avatar); return i; },
  tile: o => { const i = H.comp("Stat tile").instance(); const t = texts(i); setText(t[0], o.tile); setText(t[1], o.value); if (o.delta) { setText(t[2], o.delta); if (o.bad) H.use(t[2], "color.state-text.red", ["fill"]); } else t[2].hidden = true; if (o.cap) setText(t[3], o.cap); else t[3].hidden = true; return i; },
  seg: (o, ctx) => R.box({ name: "Segmented", radius: "pill", stroke: "line", fill: "surface", pad: "3xs", kids: o.seg.map((l, n) => ({ row: [{ t: l, c: n === (o.on || 0) ? "accent" : "fg" }], name: "option", pad: [null, "sm"], radius: "pill", ctl: "sm", h: 28, justify: "center", hug: true, ...(n === (o.on || 0) ? { fill: "sel", stroke: "accent" } : {}) })) }, "row", ctx),
  logo: (o, ctx) => R.box({ name: "logo", kids: [{ t: "][", s: "h2", c: "grey" }, { t: o.ch || "n", s: "h2", c: "accent" }, { t: " " + o.logo, s: "h2" }] }, "row", ctx),
  search: (o, ctx) => R.box({ name: "search", fill: "surface", stroke: "line-strong", radius: "control", pad: [null, "sm"], gap: "xs", h: 40, ctl: "md", w: o.w, kids: [{ icon: "search", c: "muted" }, { t: o.search || "Search", c: "muted", grow: true }, ctx.vp === "d" ? { key: "Ctrl K" } : null] }, "row", ctx),
  tabs: (o, ctx) => R.box({ name: "tabs", kids: [{ row: o.tabs.map((l, n) => ({ tab: l, on: n === (o.on || 0) })), gap: "md", hug: true }, { hr: 1 }] }, "column", ctx),
  crumbs: (o, ctx) => ctx.vp === "p"
    ? R.box({ name: "crumbs", gap: "2xs", kids: [{ icon: "arrow-left", c: "muted" }, { t: o.crumbs.at(-2) || o.crumbs[0], c: "muted" }] }, "row", ctx)
    : R.box({ name: "crumbs", gap: "xs", kids: o.crumbs.flatMap((c, n, a) => n < a.length - 1 ? [{ t: c, c: "muted" }, { t: "/", c: "muted" }] : [{ t: c }]) }, "row", ctx),
  head: (o, ctx) => {
    const title = { row: [{ t: o.head, s: "h1" }, ...(o.state ? [o.state] : [])], gap: "sm", grow: true, wrap: true };
    const acts = o.actions || [];
    return ctx.vp === "p"
      ? R.box({ name: "pagehead", gap: "sm", kids: [title, o.sub, acts.length ? { row: acts.filter(a => a.kind !== "primary"), gap: "xs", wrap: true, hug: true } : null, ...acts.filter(a => a.kind === "primary").map(a => ({ ...a, full: true }))] }, "column", ctx)
      : R.box({ name: "pagehead", gap: "sm", kids: [{ row: [title, acts.length ? { row: acts, gap: "xs" } : null], gap: "md", align: "center" }, o.sub] }, "column", ctx);
  },
  pager: (o, ctx) => R.box({ name: "pager", gap: "xs", kids: [{ t: o.pager, c: "muted" }, { ibtn: "chevron-left", size: "sm" }, { ibtn: "chevron-right", size: "sm" }] }, "row", ctx),
  empty: (o, ctx) => R.box({ name: "empty", align: "center", gap: "sm", pad: ["xl", "md"], kids: [{ icon: o.icon || "folder", c: "muted", hug: true }, { t: o.empty, c: "muted", hug: true }, o.btn ? { ...o.btn, hug: true } : null] }, "column", ctx),
  info: (o, ctx) => R.box({ name: "info", gap: ctx.vp === "p" ? "sm" : "xs", kids: o.info.map(([l, v]) => ctx.vp === "p"
    ? { col: [{ t: l, s: "label", c: "muted" }, typeof v === "string" ? { t: v, wrap: true } : v], gap: "3xs" }
    : { row: [{ col: [{ t: l, s: "label", c: "muted" }], w: o.lw || 160 }, typeof v === "string" ? { t: v, grow: true } : v], gap: "md", align: "start" }) }, "column", ctx),
  table: (o, ctx) => {
    const { cols, rows } = o.table; const cell = (c, col, head) => { const n = typeof c === "string" || typeof c === "number" ? { t: String(c), ...(head ? { s: "label", c: "muted" } : {}) } : (c || { t: " " }); return { row: [n], name: "cell", w: col.w, grow: !col.w, justify: col.right ? "end" : "start", clip: true }; };
    if (ctx.vp === "p") return R.box({ name: "table", gap: "sm", kids: rows.map(r => ({ card: cols.map((col, n) => (col.h ? { row: [{ t: col.h, s: "label", c: "muted" }, { spacer: 1, grow: true }, typeof r[n] === "object" && r[n] ? r[n] : { t: String(r[n] ?? "") }], gap: "sm" } : (typeof r[n] === "object" && r[n] ? { row: [r[n]], justify: "end" } : null))), gap: "xs", pad: "sm" })) }, "column", ctx);
    const line = (r, head, sel) => ({ row: r.map((c, n) => cell(c, cols[n], head)), name: head ? "thead" : "tr", gap: "md", pad: ["xs", "xs"], ...(sel ? { fill: "sel" } : {}) });
    return R.box({ name: "table", kids: [line(cols.map(c => c.h || ""), true), { hr: 1 }, ...rows.flatMap((r, n) => [line(r, false, o.table.sel === n), { hr: 1 }])] }, "column", ctx);
  },
  list: (o, ctx) => R.box({ name: "rows", kids: o.list.flatMap(r => {
    const main = [r.dot ? { status: "", s: r.dot } : null, { t: r.main, grow: true }];
    const row = ctx.vp === "p"
      ? { col: [{ row: [...main, r.num ? { t: r.num } : null, ...(r.act || [])], gap: "sm" }, r.meta ? { t: r.meta, s: "small", c: "muted", wrap: true } : null], gap: "3xs", pad: ["xs", null], name: "li" }
      : { row: [...main, r.meta ? { t: r.meta, s: "small", c: "muted" } : null, r.num ? { t: r.num } : null, ...(r.act || [])], gap: "md", pad: ["xs", "xs"], name: "li" };
    return [row, { hr: 1 }];
  }) }, "column", ctx),
  tiles: (o, ctx) => R.box({ name: "tiles", gap: "md", align: "start", kids: o.tiles.map(t => ({ ...t, grow: true, fillW: true })) }, ctx.vp === "p" ? "column" : "row", ctx),
  bars: (o, ctx) => ctx.vp === "p"
    ? R.box({ name: "bars", gap: "sm", kids: o.bars.map(([l, v, f]) => ({ col: [{ row: [{ t: l, grow: true }, { t: v, c: "muted" }], gap: "sm" }, { rect: [Math.max(2, Math.round(300 * f)), 10, "accent"], hug: true }], gap: "2xs" })) }, "column", ctx)
    : R.box({ name: "bars", gap: "xs", kids: o.bars.map(([l, v, f]) => ({ row: [{ col: [{ t: l }], w: 140, clip: true }, { rect: [Math.max(2, Math.round(320 * f)), 10, "accent"] }, { t: v, c: "muted" }], gap: "sm" })) }, "column", ctx),
  columns: (o, ctx) => { const max = Math.max(...o.columns), Hh = o.h || 120, n = o.columns.length; return R.box({ name: "columns", gap: "xs", kids: [{ row: o.columns.map((v, i) => ({ rect: [ctx.vp === "p" ? 16 : 32, Math.max(2, Math.round(Hh * v / max)), i === n - 1 ? "accent" : "line-strong"] })), gap: ctx.vp === "p" ? "2xs" : "xs", align: "end", h: Hh, hug: true }, o.cap ? { t: o.cap, s: "small", c: "muted" } : null] }, "column", ctx); },
  meter: (o, ctx) => { const W = o.w || 200; return R.box({ name: "meter", fill: "chip", radius: "pill", w: W, h: 8, clip: true, kids: [{ rect: [Math.round(W * o.meter), 8, o.c || "accent"] }] }, "row", ctx); },
  rect: o => R.rect(...o.rect),
  dialog: (o, ctx) => R.box({ name: "dialog", fill: "surface", stroke: "line", radius: "panel", shadow: true, pad: "lg", gap: "md", w: ctx.vp === "p" ? 358 : (o.w || 480), kids: [{ t: o.dialog, s: "h2" }, ...(o.kids || []), o.actions ? { row: [{ spacer: 1, grow: true }, ...o.actions], gap: "xs" } : null] }, "column", ctx),
  menu: (o, ctx) => R.box({ name: "menu", fill: "surface", stroke: "line", radius: "panel", shadow: true, pad: "xs", w: ctx.vp === "p" ? 390 : (o.w || 260), kids: o.menu.map(m => m === "-" ? { hr: 1 } : typeof m === "string" ? { row: [{ t: m, s: "label", c: "muted" }], pad: ["xs", "sm"] } : { menuitem: m[1], icon: m[0], key: m[2], fillW: true }) }, "column", ctx),
  header: (o, ctx) => {
    const a = o.header;
    return ctx.vp === "p"
      ? R.box({ name: "header", gap: "sm", kids: [{ row: [{ logo: a.name, ch: a.ch }, { spacer: 1, grow: true }, a.search === false ? null : { ibtn: "search", size: "md" }, { avatar: a.user || "P" }, (a.nav || []).length ? { ibtn: "menu", size: "md" } : null], gap: "xs" }] }, "column", ctx)
      : R.box({ name: "header", gap: "sm", kids: [{ row: [{ logo: a.name, ch: a.ch }, { row: (a.nav || []).map(n => ({ nav: n, on: n === o.here })), gap: "2xs" }, { spacer: 1, grow: true }, a.search === false ? null : { search: a.searchText || "Search", w: 300 }, { avatar: a.user || "P" }], gap: "lg" }] }, "column", ctx);
  },
};
R.order = ["header","head","dialog","menu","empty","menuitem","tile","btn","ibtn","field","mfield","table","list","tiles","info","tabs","crumbs","pager","bars","columns","meter","seg","card","col","row","money","check","radio","chip","tag","status","badge","id","msg","toast","tab","nav","avatar","logo","search","key","icon","rect","spacer","hr","t"];
for (const k of Object.keys(R.types)) if (!R.order.includes(k)) throw new Error("type not ordered: " + k);
R.kind = o => R.order.find(k => o[k] !== undefined);
R.node = (o, ctx) => {
  const kd = R.kind(o); if (kd) return R.types[kd](o, ctx);
  if (o.kids) return R.box(o, o.dir || "column", ctx);
  throw new Error("unknown node " + JSON.stringify(o).slice(0, 100));
};

// a full screen: app shell + body. vp "d" (1280) or "p" (390)
R.screen = (app, s, vp) => {
  const ctx = { vp };
  const kids = [];
  if (!s.bare) kids.push({ header: app, here: s.here });
  if (s.crumbs) kids.push({ crumbs: s.crumbs });
  const body = { col: s.kids, gap: s.gap || "lg", name: "main", ...(s.center ? { align: "center", fillW: true } : {}) };
  kids.push(s.narrow && vp === "d" ? { row: [{ ...body, w: s.narrow }], justify: s.center ? "center" : "start" } : body);
  if (!s.bare) kids.push({ t: `nobloat/${app.name} · v1`, s: "small", c: "muted" });
  const b = R.box({ name: s.name, fill: s.fill || "bg", w: vp === "d" ? 1280 : 390, pad: vp === "d" ? ["lg", "xl"] : ["md", "md"], gap: "lg", kids, clip: true, screen: true }, "column", ctx);
  return b;
};
// build screen i of apps/<file>.json on the current page: desktop and phone side by side
R.build = async (file, i) => {
  const spec = await H.json("apps/" + file + ".json"); const s = spec.screens[i]; if (!s) return { done: true, n: spec.screens.length };
  const made = []; const before = new Set(penpot.root.children.map(c => c.id));
  try {
    for (const vp of ["d", "p"]) {
      if (s.only && s.only !== vp) continue;
      const name = `${String(i + 1).padStart(2, "0")} ${s.name} · ${vp === "d" ? "desktop" : "phone"}`;
      penpot.root.children.filter(c => c.name === name).forEach(c => c.remove());
      const b = R.screen(spec.app, s, vp); b.name = name; made.push(b);
      b.x = (i % 4) * 1840 + (vp === "p" ? 1340 : 0); b.y = Math.floor(i / 4) * 2600;
    }
    const groups = H.flush();
    return { screen: s.name, n: spec.screens.length, groups };
  } catch (e) { H.q = []; penpot.root.children.filter(c => !before.has(c.id)).forEach(c => c.remove()); throw new Error(`${file}[${i}] ${s.name}: ${e.message}`); }
};
// build every screen of a file as a background job in the plugin; poll storage.prog
R.buildAll = (file, page) => {
  storage.prog = { file, i: 0, n: null, errs: [], done: false };
  (async () => {
    await H.page(page);
    for (let i = 0; ; i++) {
      try { const r = await R.build(file, i); storage.prog.n = r.n; if (r.done) break; }
      catch (e) { storage.prog.errs.push(String(e.message || e).slice(0, 220)); if (storage.prog.errs.length > 40) break; }
      storage.prog.i = i + 1; await H.wait(120);
    }
    await H.wait(2500); storage.prog.fit = []; for (let k = 0; k < 4; k++) { const n = H.fit(); storage.prog.fit.push(n); if (!n) break; await H.wait(1500); }
    storage.prog.layout = H.layout(); storage.prog.audit = H.audit(); storage.prog.done = true;
  })().catch(e => { storage.prog.errs.push("fatal " + (e.message || e)); storage.prog.done = true; });
  return "started";
};
H.checkStart = () => { storage.res = null; H.checkBoth().then(r => storage.res = r).catch(e => storage.res = { err: String(e.message || e) }); return "started"; };
H.poll = async (key, secs = 22) => { for (let i = 0; i < secs && !(key === "prog" ? storage.prog?.done : storage.res); i++) await H.wait(1000); return key === "prog" ? storage.prog : (storage.res || "running"); };
return "lib ok";

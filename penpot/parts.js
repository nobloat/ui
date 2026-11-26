// Composed parts as components on the Components page. Safe to re-run: skips what exists.
const H = storage.H, R = storage.R, ctx = { vp: "d" };
await H.page("Components"); H.loadComps();
const have = n => { if (!H.sets) H.loadComps(); return H.sets[n] || H.singles[n]; };
const mk = n => R.node(n, ctx);
const head = (label, x, y) => { const t = R.text({ t: label, s: "h2", c: "muted" }); t.name = "§ " + label; t.x = x; t.y = y - 36; };
const made = [];
const vset = async (name, x, y, prop, defs, dy = 56) => {
  if (have(name)) return;
  const items = defs.map(([val, node], i) => { const b = mk({ ...node, name }); b.x = x; b.y = y + i * dy; return { shape: b, properties: { [prop]: val } }; });
  H.flush(); await H.wait(900); H.variants(name, items, x, y); head(name, x, y); made.push(name);
};
const one = async (name, x, y, node) => { if (have(name)) return; const b = mk({ ...node, name }); b.x = x; b.y = y; H.flush(); await H.wait(500); H.single(b, name); head(name, x, y); made.push(name); };
const Y = 3300;
await vset("Nav item", 0, Y, "State", [["Default", { row: [{ t: "Invoices" }], pad: ["2xs", "xs"], radius: "control" }], ["Active", { row: [{ t: "Invoices", c: "accent" }], pad: ["2xs", "xs"], radius: "control", fill: "sel" }]], 44);
await vset("Tab", 200, Y, "State", [["Default", { col: [{ t: "Details", c: "muted" }, { rect: [8, 2, "line"], fillW: true }], gap: "2xs" }], ["Active", { col: [{ t: "Details" }, { rect: [8, 2, "accent"], fillW: true }], gap: "2xs" }]], 48);
const M = { Error: ["error", "red", "Could not save: the server did not answer."], Ok: ["ok", "green", "Invoice sent to ACME GmbH."], Warning: ["warning", "yellow", "3 invoices are overdue."], Info: ["info", "blue", "A new version is available."] };
await vset("Message", 400, Y, "Type", Object.entries(M).map(([k, [ic, c, txt]]) => [k, { row: [{ icon: ic, c }, { t: txt, grow: true }], w: 480, gap: "xs", pad: ["xs", "sm"], radius: "control", fill: "surface", stroke: "state-text." + c, align: "start" }]), 60);
await vset("Toast", 960, Y, "Type", [["Ok", { row: [{ icon: "ok", c: "green" }, { t: "Customer created", grow: true }, { ibtn: "x", size: "sm" }], w: 360, gap: "xs", pad: ["xs", "sm"], radius: "control", fill: "surface", stroke: "line", shadow: true }], ["Error", { row: [{ icon: "error", c: "red" }, { t: "Could not delete", grow: true }, { ibtn: "x", size: "sm" }], w: 360, gap: "xs", pad: ["xs", "sm"], radius: "control", fill: "surface", stroke: "line", shadow: true }]], 72);
await one("Menu item", 0, Y + 320, { row: [{ icon: "cog", c: "muted" }, { t: "Settings", grow: true }, { key: "g s" }], w: 240, gap: "sm", pad: ["xs", "sm"], radius: "control" });
await one("Avatar", 300, Y + 320, { row: [{ t: "P" }], w: 40, h: 40, radius: "pill", fill: "chip", justify: "center", ctl: "md" });
await one("Stat tile", 400, Y + 320, { card: [{ t: "Open invoices", s: "label", c: "muted" }, { t: "12.480,00 €", s: "figure" }, { row: [{ t: "+8 %", s: "small", c: "green" }, { t: "vs. last month", s: "small", c: "muted" }], gap: "xs", hug: true }], w: 260, gap: "2xs" });
H.flush(); await H.wait(600); H.stage(); H.loadComps();
return { made };

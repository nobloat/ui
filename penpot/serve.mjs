import http from "node:http"; import fs from "node:fs"; import path from "node:path";
const root = path.resolve(process.argv[2]);
http.createServer((q, r) => {
  const h = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Private-Network": "true", "Access-Control-Allow-Headers": "*", "Cache-Control": "no-store" };
  if (q.method === "OPTIONS") { r.writeHead(204, h); return r.end(); }
  const f = path.join(root, path.normalize(decodeURIComponent(q.url.split("?")[0])).replace(/^([\/]|\.\.)+/, ""));
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404, h); return r.end("no"); }
  r.writeHead(200, { ...h, "Content-Type": f.endsWith(".json") ? "application/json" : "text/plain; charset=utf-8" }); fs.createReadStream(f).pipe(r);
}).listen(8765, "127.0.0.1", () => console.log("up"));

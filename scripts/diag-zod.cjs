// Diagnose the zod / better-auth version mismatch.
const path = require("path");
const root = path.join(__dirname, "..");

const pkg = require(path.join(root, "package.json"));
console.log("host zod (package.json):", pkg.dependencies.zod);

const zodPkg = require(path.join(root, "node_modules/zod/package.json"));
console.log("installed zod:", zodPkg.version);

const ba = require(path.join(root, "node_modules/better-auth/package.json"));
console.log("better-auth:", ba.version);
console.log(
  "better-auth zod peer:",
  JSON.stringify(ba.peerDependencies ? ba.peerDependencies.zod : undefined),
);

const z = require(path.join(root, "node_modules/zod"));
console.log("z.loose:", typeof z.loose);
console.log("z.email:", typeof z.email);
console.log("z.object:", typeof z.object);

// Where do WE use zod in src?
console.log("\nzod importers in src/ (searching):");
const fs = require("fs");
function walk(dir, out) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(f.name)) out.push(p);
  }
  return out;
}
const files = walk(path.join(root, "src"), []);
for (const f of files) {
  const c = fs.readFileSync(f, "utf8");
  if (/\bfrom\s+["']zod["']|\brequire\(["']zod["']\)/.test(c)) {
    console.log("  " + path.relative(root, f));
  }
}

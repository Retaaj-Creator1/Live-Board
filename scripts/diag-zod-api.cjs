// Check the exact API better-auth needs on zod v4.
const path = require("path");
const root = path.join(__dirname, "..");
const z = require(path.join(root, "node_modules/zod"));

const schema = z.object({ a: z.string() });
console.log(
  "installed zod version:",
  require(path.join(root, "node_modules/zod/package.json")).version,
);
console.log("schema.loose:", typeof schema.loose);
console.log("schema.looseObject:", typeof schema.looseObject);
console.log("schema.catchall:", typeof schema.catchall);
console.log("z.email:", typeof z.email);
console.log("z.loose:", typeof z.loose);
console.log("z.looseObject:", typeof z.looseObject);

// Simulate what better-auth does: sessionSchema.loose()
try {
  const loose = schema.loose();
  console.log("schema.loose() OK:", !!loose);
} catch (e) {
  console.log("schema.loose() FAILED:", e.message);
}

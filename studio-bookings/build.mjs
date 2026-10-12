// Copies components/<Name>.tsx and functions/<id>.ts into app.json, so the
// contract you apply always carries the files you edited.
//
//   node build.mjs          update app.json in place
//
// A component's source lives in the contract (that is what the platform
// builds), so after editing a .tsx file run this, then `appbricx apply app.json`.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(dir, "app.json");
const contract = JSON.parse(fs.readFileSync(file, "utf8"));

for (const c of contract.components ?? []) {
  const src = path.join(dir, "components", `${c.name}.tsx`);
  if (fs.existsSync(src)) c.source = fs.readFileSync(src, "utf8");
}
for (const w of contract.workflows ?? []) {
  const src = path.join(dir, "functions", `${w.id}.ts`);
  if (!fs.existsSync(src)) continue;
  const step = (w.do ?? []).find((s) => s.action === "custom");
  if (step) step.code = fs.readFileSync(src, "utf8").replace(/^(\/\/.*\n)+/, "").trim();
}

fs.writeFileSync(file, JSON.stringify(contract, null, 2) + "\n");
console.log(`app.json: ${contract.components?.length ?? 0} components, ${contract.workflows?.length ?? 0} workflows`);

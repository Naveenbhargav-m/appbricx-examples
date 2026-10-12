#!/usr/bin/env node
import { main } from "../src/main.mjs";

main(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (err) => {
    process.stderr.write(`appbricx: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  },
);

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const componentDirectory = dirname(fileURLToPath(import.meta.url));
const componentPath = resolve(componentDirectory, "rollingDrag.vue");
const arrowAssetPath = resolve(
  componentDirectory,
  "../../assets/icon_arrow.svg"
);

test("rolling comparison drag control has its arrow asset", () => {
  const componentSource = readFileSync(componentPath, "utf8");

  assert.match(componentSource, /assets\/icon_arrow\.svg/);
  assert.equal(existsSync(arrowAssetPath), true);
});

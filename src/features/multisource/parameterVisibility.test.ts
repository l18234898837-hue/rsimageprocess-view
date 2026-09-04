import test from "node:test";
import assert from "node:assert/strict";
import { getVisibleParameterGroups } from "./parameterVisibility";

test("empty selection has no visible parameter groups", () => {
  assert.deepEqual(getVisibleParameterGroups("gf6-wfv-l1a-v1", []), []);
});

test("GF-6 exposes only the groups required by selected functions", () => {
  assert.deepEqual(
    getVisibleParameterGroups("gf6-wfv-l1a-v1", ["preprocess"]),
    ["preprocess"]
  );
  assert.deepEqual(
    getVisibleParameterGroups("gf6-wfv-l1a-v1", ["rgb-fusion"]),
    ["rgb-fusion"]
  );
  assert.deepEqual(
    getVisibleParameterGroups("gf6-wfv-l1a-v1", [
      "tile-mosaic",
      "rpc-geolocation",
      "projection-standardization",
      "feature-extraction",
      "rgb-fusion"
    ]),
    ["preprocess", "feature-extraction", "rgb-fusion"]
  );
});

test("visibility follows the selected product's supported functions", () => {
  assert.deepEqual(
    getVisibleParameterGroups("hy2d-altimeter-v1", ["anomaly-detection"]),
    ["anomaly-detection"]
  );
  assert.deepEqual(
    getVisibleParameterGroups("hy2d-altimeter-v1", ["rgb-fusion"]),
    []
  );
});

import test from "node:test";
import assert from "node:assert/strict";
import {
  buildFy4bAgriSnapshot,
  defaultFy4bAgriForm,
  validateFy4bAgriForm
} from "./fy4bAgriParameters";

test("FY-4B default form builds the exact Worker snapshot", () => {
  const snapshot = buildFy4bAgriSnapshot(defaultFy4bAgriForm());

  assert.deepEqual(snapshot, {
    schemaVersion: "1",
    targetCrs: "EPSG:4326",
    roi: null,
    features: { enabled: false, metrics: ["statistics"] },
    fusion: { enabled: false, mode: "NIR_RED_BLUE", percentiles: [2, 98] },
    saliency: {
      enabled: false,
      source: "C02_REFLECTANCE_500M",
      threshold: 0.5,
      windowSize: 3
    }
  });
});

test("FY-4B rejects invalid ROI, percentiles, and non-odd saliency windows", () => {
  const form = defaultFy4bAgriForm();
  form.roi = [120, 30, 119, 31];
  form.fusion.lowPercentile = 99;
  form.fusion.highPercentile = 98;
  form.saliency.enabled = true;
  form.saliency.windowSize = 4;

  const result = validateFy4bAgriForm(form);

  assert.equal(result.valid, false);
  assert.deepEqual(
    new Set(result.issues.map(issue => issue.field)),
    new Set(["roi", "fusion.percentiles", "saliency.windowSize"])
  );
});

test("FY-4B rejects unsupported CRS, metrics, fusion mode, and saliency source", () => {
  const form = defaultFy4bAgriForm();
  form.targetCrs = "EPSG:3857" as never;
  form.features.metrics = ["not-a-metric"] as never;
  form.fusion.mode = "TRUE_COLOR" as never;
  form.saliency.enabled = true;
  form.saliency.source = "B1" as never;

  const result = validateFy4bAgriForm(form);

  assert.equal(result.valid, false);
  assert.deepEqual(
    new Set(result.issues.map(issue => issue.field)),
    new Set(["targetCrs", "features.metrics", "fusion.mode", "saliency.source"])
  );
});

test("FY-4B derived saliency sources require their enabled feature metric", () => {
  const withoutFeatures = defaultFy4bAgriForm();
  withoutFeatures.saliency.enabled = true;
  withoutFeatures.saliency.source = "toa_nir_red_nd";
  const missingMetric = defaultFy4bAgriForm();
  missingMetric.features.enabled = true;
  missingMetric.features.metrics = ["statistics"];
  missingMetric.saliency.enabled = true;
  missingMetric.saliency.source = "btd_c13_c14";
  const configured = defaultFy4bAgriForm();
  configured.features.enabled = true;
  configured.features.metrics = ["toa_nir_red_nd"];
  configured.saliency.enabled = true;
  configured.saliency.source = "toa_nir_red_nd";

  assert.equal(validateFy4bAgriForm(withoutFeatures).valid, false);
  assert.equal(validateFy4bAgriForm(missingMetric).valid, false);
  assert.equal(validateFy4bAgriForm(configured).valid, true);
});

test("FY-4B ignores derived saliency dependencies when saliency is disabled", () => {
  const form = defaultFy4bAgriForm();
  form.saliency.source = "toa_nir_red_nd";

  assert.equal(validateFy4bAgriForm(form).valid, true);
});

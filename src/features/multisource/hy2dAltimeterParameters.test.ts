import test from "node:test";
import assert from "node:assert/strict";
import {
  buildHy2dAltimeterSnapshot,
  defaultHy2dAltimeterForm,
  validateHy2dAltimeterForm
} from "./hy2dAltimeterParameters";

test("default HY-2D form builds the exact Worker parameter object", () => {
  const snapshot = buildHy2dAltimeterSnapshot(defaultHy2dAltimeterForm());

  assert.deepEqual(snapshot, {
    qualityPolicyVersion: "hy2d-idr-2mc-baseline-v1",
    featureWindowSize: 21,
    anomaly: {
      madThreshold: 5,
      jumpThresholdMeters: 0.5
    },
    grid: {
      enabled: true,
      spacingDegrees: 0.25
    }
  });
  assert.equal("schemaVersion" in snapshot, false);
  assert.equal("operation" in snapshot, false);
});

test("HY-2D validation rejects even windows, non-positive thresholds and wide grids", () => {
  const form = defaultHy2dAltimeterForm();
  form.featureWindowSize = 20;
  form.anomaly.madThreshold = 0;
  form.anomaly.jumpThresholdMeters = Number.NaN;
  form.grid.spacingDegrees = 6;

  const result = validateHy2dAltimeterForm(form);

  assert.equal(result.valid, false);
  assert.deepEqual(
    new Set(result.issues.map(issue => issue.field)),
    new Set([
      "featureWindowSize",
      "anomaly.madThreshold",
      "anomaly.jumpThresholdMeters",
      "grid.spacingDegrees"
    ])
  );
});

test("HY-2D validation rejects grid spacing below the allocation-safe minimum", () => {
  const form = defaultHy2dAltimeterForm();
  form.grid.enabled = true;
  form.grid.spacingDegrees = 0.05;

  const result = validateHy2dAltimeterForm(form);

  assert.equal(result.valid, false);
  assert.equal(result.issues[0]?.field, "grid.spacingDegrees");
});

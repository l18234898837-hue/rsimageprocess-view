import test from "node:test";
import assert from "node:assert/strict";
import {
  buildFy3hMersiSnapshot,
  defaultFy3hMersiForm,
  fy3hVariableName,
  validateFy3hMersiForm
} from "./fy3hMersiParameters";

test("default FY-3H form builds the exact Worker parameter object", () => {
  const snapshot = buildFy3hMersiSnapshot(defaultFy3hMersiForm());

  assert.deepEqual(snapshot, {
    targetCrs: "EPSG:4326",
    resolutionDegrees: 0.01,
    continuousResampling: "nearest",
    bands: Array.from({ length: 25 }, (_, index) => index + 1),
    features: { enabled: false },
    fusion: { enabled: false },
    saliency: { enabled: false }
  });
  assert.equal("schemaVersion" in snapshot, false);
  assert.equal("operation" in snapshot, false);
});

test("FY-3H snapshot switches projected grids to meter resolution and adds ROI", () => {
  const form = defaultFy3hMersiForm();
  form.targetCrs = "EPSG:32650";
  form.resolutionMeters = 1200;
  Object.assign(form.roi, {
    enabled: true,
    minLon: 115,
    minLat: 14,
    maxLon: 117,
    maxLat: 16
  });

  const snapshot = buildFy3hMersiSnapshot(form);

  assert.equal(snapshot.resolutionDegrees, undefined);
  assert.equal(snapshot.resolutionMeters, 1200);
  assert.deepEqual(snapshot.roi, [115, 14, 117, 16]);
});

test("FY-3H normalizes EPSG aliases before selecting degree or meter resolution", () => {
  for (const alias of [
    "4326",
    "urn:ogc:def:crs:EPSG::4326",
    "http://www.opengis.net/def/crs/EPSG/0/4326"
  ]) {
    const form = defaultFy3hMersiForm();
    form.targetCrs = alias;
    const snapshot = buildFy3hMersiSnapshot(form);

    assert.equal(snapshot.targetCrs, "EPSG:4326");
    assert.equal(snapshot.resolutionDegrees, 0.01);
    assert.equal(snapshot.resolutionMeters, undefined);
  }

  const projected = defaultFy3hMersiForm();
  projected.targetCrs = "urn:ogc:def:crs:EPSG::32650";
  assert.equal(buildFy3hMersiSnapshot(projected).targetCrs, "EPSG:32650");

  const invalid = defaultFy3hMersiForm();
  invalid.targetCrs = "not-a-crs";
  assert.equal(validateFy3hMersiForm(invalid).valid, false);
});

test("FY-3H enabled optional algorithms use only Worker-supported keys", () => {
  const form = defaultFy3hMersiForm();
  form.features.enabled = true;
  form.features.metrics = ["gradient", "local_variance"];
  form.fusion.enabled = true;
  form.saliency.enabled = true;
  form.saliency.source = `gradient:${fy3hVariableName(1)}`;

  const snapshot = buildFy3hMersiSnapshot(form);

  assert.deepEqual(snapshot.features, {
    enabled: true,
    metrics: ["gradient", "local_variance"],
    windowSize: 3
  });
  assert.deepEqual(snapshot.fusion, {
    enabled: true,
    red: 3,
    green: 2,
    blue: 1,
    percentiles: [2, 98]
  });
  assert.deepEqual(snapshot.saliency, {
    enabled: true,
    source: "gradient:CH01_REFLECTANCE",
    windowSize: 3,
    threshold: 0.5
  });
});

test("FY-3H rejects thermal RGB and invalid odd windows", () => {
  const form = defaultFy3hMersiForm();
  form.features.enabled = true;
  form.features.metrics = ["local_variance"];
  form.features.windowSize = 4;
  form.fusion.enabled = true;
  form.fusion.red = 20;

  const result = validateFy3hMersiForm(form);

  assert.equal(result.valid, false);
  assert.deepEqual(
    new Set(result.issues.map(issue => issue.field)),
    new Set(["features.windowSize", "fusion.bands"])
  );
});

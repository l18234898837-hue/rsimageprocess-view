import test from "node:test";
import assert from "node:assert/strict";
import {
  buildGf6WfvL1aSnapshot,
  defaultGf6WfvL1aForm,
  GF6_WFV_L1A_MAX_WINDOW_SIZE,
  gf6ResolutionConstraint,
  validateGf6WfvL1aForm
} from "./gf6WfvL1aParameters";

test("GF-6 default form builds the fast smoke-test Worker snapshot", () => {
  const snapshot = buildGf6WfvL1aSnapshot(defaultGf6WfvL1aForm());

  assert.deepEqual(snapshot, {
    schemaVersion: "gf6-wfv-l1a-v1",
    targetCrs: "EPSG:4326",
    resolution: 0.1,
    rpcHeightMode: "CONSTANT",
    rpcHeight: 0,
    roi: [107.6, 8.7, 107.7, 8.8],
    bands: [3],
    features: { enabled: false, metrics: ["statistics"] },
    fusion: {
      enabled: false,
      red: 3,
      green: 3,
      blue: 3,
      percentiles: [2, 98]
    },
    saliency: {
      enabled: false,
      source: "B3",
      threshold: 0.95,
      windowSize: 9
    }
  });
});

test("GF-6 rejects non-positive resolution, malformed ROI, and duplicate bands", () => {
  const form = defaultGf6WfvL1aForm();
  form.resolution = 0;
  form.roi = [120, 30, 119, 31];
  form.bands = [1, 1];

  const result = validateGf6WfvL1aForm(form);

  assert.equal(result.valid, false);
  assert.deepEqual(
    new Set(result.issues.map(issue => issue.field)),
    new Set(["resolution", "roi", "bands"])
  );
});

test("GF-6 validates selected RGB and saliency bands plus algorithm windows", () => {
  const form = defaultGf6WfvL1aForm();
  form.bands = [1, 2];
  form.features.enabled = true;
  form.features.metrics = ["local_variance"];
  form.features.windowSize = 4;
  form.fusion.enabled = true;
  form.fusion.red = 3;
  form.fusion.lowPercentile = 99;
  form.fusion.highPercentile = 98;
  form.saliency.enabled = true;
  form.saliency.source = "B3";
  form.saliency.windowSize = 2;
  form.saliency.threshold = 1.1;

  const result = validateGf6WfvL1aForm(form);

  assert.equal(result.valid, false);
  assert.deepEqual(
    new Set(result.issues.map(issue => issue.field)),
    new Set([
      "features.windowSize",
      "fusion.bands",
      "fusion.percentiles",
      "saliency.source",
      "saliency.windowSize",
      "saliency.threshold"
    ])
  );
});

test("GF-6 serializes a non-default local-variance window", () => {
  const form = defaultGf6WfvL1aForm();
  form.features.enabled = true;
  form.features.metrics = ["local_variance"];
  form.features.windowSize = 7;

  assert.deepEqual(buildGf6WfvL1aSnapshot(form).features, {
    enabled: true,
    metrics: ["local_variance"],
    windowSize: 7
  });
});

test("GF-6 applies the same 255-pixel neighbourhood limit before submission", () => {
  const form = defaultGf6WfvL1aForm();
  form.features.enabled = true;
  form.features.metrics = ["local_variance"];
  form.features.windowSize = 257;
  form.saliency.enabled = true;
  form.saliency.windowSize = 257;

  const result = validateGf6WfvL1aForm(form);

  assert.equal(GF6_WFV_L1A_MAX_WINDOW_SIZE, 255);
  assert.deepEqual(
    result.issues.map(issue => issue.field),
    ["features.windowSize", "saliency.windowSize"]
  );
  assert.ok(result.issues.every(issue => issue.message.includes("255")));
  assert.throws(() => buildGf6WfvL1aSnapshot(form), /255/);
});

test("GF-6 ignores disabled algorithm values and normalizes their snapshot", () => {
  const form = defaultGf6WfvL1aForm();
  form.bands = [1];
  form.fusion.red = 3;
  form.fusion.green = 8;
  form.fusion.blue = 6;
  form.fusion.lowPercentile = 99;
  form.fusion.highPercentile = 98;
  form.saliency.source = "B3";
  form.saliency.threshold = 2;
  form.saliency.windowSize = 4;

  const result = validateGf6WfvL1aForm(form);

  assert.equal(result.valid, true);
  assert.deepEqual(buildGf6WfvL1aSnapshot(form).fusion, {
    enabled: false,
    red: 1,
    green: 1,
    blue: 1,
    percentiles: [2, 98]
  });
  assert.deepEqual(buildGf6WfvL1aSnapshot(form).saliency, {
    enabled: false,
    source: "B1",
    threshold: 0.95,
    windowSize: 9
  });
});

test("GF-6 applies degree and metre resolution floors before submission", () => {
  const geographic = defaultGf6WfvL1aForm();
  geographic.resolution = 0.000001;
  assert.equal(validateGf6WfvL1aForm(geographic).valid, false);
  assert.match(
    validateGf6WfvL1aForm(geographic).issues.find(
      issue => issue.field === "resolution"
    )!.message,
    /0\.00001°/
  );
  assert.deepEqual(gf6ResolutionConstraint("EPSG:4326"), {
    minimum: 0.00001,
    step: 0.00001,
    unit: "度"
  });

  const projected = defaultGf6WfvL1aForm();
  projected.targetCrs = "EPSG:32648";
  projected.resolution = 0.5;
  assert.equal(validateGf6WfvL1aForm(projected).valid, false);
  assert.match(
    validateGf6WfvL1aForm(projected).issues.find(
      issue => issue.field === "resolution"
    )!.message,
    /1 米/
  );
  assert.deepEqual(gf6ResolutionConstraint("EPSG:32648"), {
    minimum: 1,
    step: 1,
    unit: "米"
  });
});

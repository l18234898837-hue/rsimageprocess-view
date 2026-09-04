import test from "node:test";
import assert from "node:assert/strict";
import {
  buildHy1cCziL2aSnapshot,
  buildHy1cCziL2aPanelSummary,
  defaultL2aForm,
  validateHy1cCziL2aForm
} from "./hy1cCziL2aParameters";

test("default HY-1C form builds exactly the public STANDARDIZE_L2A snapshot", () => {
  assert.deepEqual(buildHy1cCziL2aSnapshot(defaultL2aForm()), {
    schemaVersion: "1",
    operation: "STANDARDIZE_L2A",
    bands: ["B460", "B560", "B650", "B825"],
    grid: {
      targetCrs: "AUTO_UTM",
      resolutionMeters: 50,
      scienceResampling: "nearest"
    },
    quality: { policy: "default" },
    algorithms: {
      features: {
        enabled: true,
        metrics: ["statistics", "gradient", "local_variance"],
        windowSize: 3
      },
      fusion: {
        enabled: true,
        red: "B650",
        green: "B560",
        blue: "B460",
        lowPercentile: 2,
        highPercentile: 98
      },
      saliency: {
        enabled: true,
        source: "B560",
        threshold: 0.5,
        windowSize: 5
      }
    }
  });
});

test("snapshot omits a disabled ROI and includes the configured WGS84 ROI", () => {
  const form = defaultL2aForm();
  form.roi.enabled = false;
  assert.equal(buildHy1cCziL2aSnapshot(form).roiWgs84, undefined);

  form.roi.enabled = true;
  Object.assign(form.roi, {
    minLon: 120,
    minLat: 30,
    maxLon: 121,
    maxLat: 31
  });

  const snapshot = buildHy1cCziL2aSnapshot(form);

  assert.deepEqual(snapshot.roiWgs84, {
    minLon: 120,
    minLat: 30,
    maxLon: 121,
    maxLat: 31
  });
  assert.deepEqual(Object.keys(snapshot), [
    "schemaVersion",
    "operation",
    "bands",
    "grid",
    "roiWgs84",
    "quality",
    "algorithms"
  ]);
});

test("validation rejects invalid grid, ROI, fusion bands and saliency source", () => {
  const form = defaultL2aForm();
  form.bands = ["B460"];
  form.grid.resolutionMeters = 0;
  form.roi = {
    enabled: true,
    minLon: 121,
    minLat: -91,
    maxLon: 120,
    maxLat: 31
  };
  form.algorithms.fusion.enabled = true;
  form.algorithms.saliency.enabled = true;
  form.algorithms.saliency.source = "B825";

  const result = validateHy1cCziL2aForm(form);

  assert.equal(result.valid, false);
  assert.deepEqual(
    new Set(result.issues.map(issue => issue.field)),
    new Set([
      "grid.resolutionMeters",
      "roiWgs84",
      "algorithms.fusion",
      "algorithms.saliency.source"
    ])
  );
});

test("validation requires at least one selected band", () => {
  const form = defaultL2aForm();
  form.bands = [];

  const result = validateHy1cCziL2aForm(form);

  assert.equal(result.valid, false);
  assert.ok(result.issues.some(issue => issue.field === "bands"));
});

test("snapshot construction drops UI-only algorithm properties", () => {
  const form = defaultL2aForm();
  Object.assign(form.algorithms.fusion, {
    previewPath: "D:/derived/fusion.tif",
    displayProduct: true
  });
  Object.assign(form.algorithms.saliency, {
    workerConfiguration: { tileSize: 512 },
    derivedScienceValue: 0.91
  });

  const snapshot = buildHy1cCziL2aSnapshot(form);

  assert.deepEqual(Object.keys(snapshot.algorithms.fusion), [
    "enabled",
    "red",
    "green",
    "blue",
    "lowPercentile",
    "highPercentile"
  ]);
  assert.deepEqual(Object.keys(snapshot.algorithms.saliency), [
    "enabled",
    "source",
    "threshold",
    "windowSize"
  ]);
});

test("panel summary reflects the selected satellite processing configuration", () => {
  const form = defaultL2aForm();
  form.grid.targetCrs = "  EPSG:32650  ";
  form.grid.resolutionMeters = 30;
  form.roi.enabled = true;
  form.algorithms.features.enabled = true;
  form.algorithms.features.metrics = ["statistics"];
  form.algorithms.fusion.enabled = true;
  form.algorithms.saliency.enabled = true;
  form.algorithms.saliency.source = "B825";
  form.algorithms.saliency.threshold = 0.65;

  const expectedSummary = {
    bands: "B460 / B560 / B650 / B825",
    grid: "EPSG:32650 · 30 m",
    roi: "已启用 ROI 裁剪",
    algorithms: [
      "特征提取 · 1 项",
      "RGB 融合 · B650/B560/B460",
      "显著性 · B825 / 0.65"
    ]
  };

  assert.deepEqual(buildHy1cCziL2aPanelSummary(form), expectedSummary);
});

test("default HY-1C form keeps the full product extent", () => {
  assert.deepEqual(buildHy1cCziL2aPanelSummary(defaultL2aForm()), {
    bands: "B460 / B560 / B650 / B825",
    grid: "AUTO_UTM · 50 m",
    roi: "全幅产品",
    algorithms: [
      "特征提取 · 3 项",
      "RGB 融合 · B650/B560/B460",
      "显著性 · B560 / 0.5"
    ]
  });
});

import test from "node:test";
import assert from "node:assert/strict";
import type { ExecutionProgressArtifact } from "../../api/multiSourceSatellite";
import { artifactInterpretation } from "./artifactInterpretation";

const artifact = (
  type: string,
  overrides: Partial<ExecutionProgressArtifact> = {}
) =>
  ({
    stageId: "stage-1",
    type,
    uri: `rs://output/${type}`,
    ...overrides
  }) as ExecutionProgressArtifact;
const interpret = (type: string, snapshot?: unknown) =>
  artifactInterpretation(
    artifact(type),
    undefined,
    snapshot === undefined ? undefined : JSON.stringify(snapshot)
  );
const content = (type: string, snapshot?: unknown) =>
  JSON.stringify(interpret(type, snapshot));

test("track grid colors describe the actual four-band statistical COG", () => {
  const result = content("TRACK_GRID_COG");
  assert.match(result, /红色.*平均海面高度/);
  assert.match(result, /绿色.*标准差/);
  assert.match(result, /蓝色.*有效观测数/);
  assert.match(result, /第四波段.*有效比例/);
  assert.doesNotMatch(result, /灰度展示平均海面高度/);
});

const families: Record<string, string[]> = {
  validation: [
    "VALIDATION_METADATA_JSON",
    "HY1C_INPUT_VALIDATION_JSON",
    "GF6_INPUT_VALIDATION_JSON",
    "FY3H_INPUT_VALIDATION_JSON",
    "FY4B_INPUT_VALIDATION_JSON",
    "BROWSE_VALIDATION_JSON"
  ],
  footprint: ["FOOTPRINT_SHP", "FOOTPRINT_SHX", "FOOTPRINT_DBF"],
  browse: ["BROWSE_IMAGE"],
  georeference: [
    "BROWSE_GEOREFERENCE_JSON",
    "GF6_RPC_GRID_JSON",
    "FY4B_NOMINAL_GRID_JSON"
  ],
  browseReport: ["BROWSE_FEATURES_JSON", "BROWSE_REPORT_JSON"],
  standard: [
    "DECODED_CZI_RASTER",
    "QUALITY_MASKED_CZI_RASTER",
    "GEOLOCATED_CZI_RASTER",
    "CROPPED_CZI",
    "STANDARD_COG",
    "STANDARD_METADATA_JSON",
    "GF6_TILE_MOSAIC_VRT",
    "GF6_PROJECTED_RASTER",
    "GF6_STANDARD_COG",
    "GF6_PROCESSING_SUMMARY_JSON",
    "DECODED_MERSI_L1",
    "CALIBRATED_MERSI_RASTER",
    "QUALITY_MERSI_RASTER",
    "GRIDDED_MERSI_RASTER",
    "STANDARD_MERSI_COG",
    "STANDARD_MERSI_SUMMARY_JSON",
    "FY4B_CALIBRATION_SUMMARY_JSON",
    "FY4B_RED_500M_COG",
    "FY4B_VIS_NIR_1000M_COG",
    "FY4B_SPECTRAL_2000M_COG",
    "FY4B_MULTISPECTRAL_4000M_COG",
    "FY4B_STANDARD_SUMMARY_JSON"
  ],
  quality: [
    "MERSI_QUALITY_SUMMARY_JSON",
    "GRIDDED_MERSI_QUALITY_MASK",
    "STANDARD_MERSI_QUALITY_COG",
    "FY4B_RED_500M_QUALITY_COG",
    "FY4B_VIS_NIR_1000M_QUALITY_COG",
    "FY4B_SPECTRAL_2000M_QUALITY_COG",
    "FY4B_MULTISPECTRAL_4000M_QUALITY_COG",
    "TRACK_QUALITY_SUMMARY_JSON"
  ],
  feature: [
    "FEATURE_COG",
    "FEATURE_METADATA_JSON",
    "GF6_FEATURES_COG",
    "GF6_FEATURES_SUMMARY_JSON",
    "MERSI_FEATURE_COG",
    "MERSI_FEATURE_SUMMARY_JSON",
    "FY4B_FEATURE_COG",
    "FY4B_FEATURE_SUMMARY_JSON"
  ],
  fusion: [
    "FUSION_COG",
    "FUSION_METADATA_JSON",
    "FUSION_PREVIEW_PNG",
    "GF6_RGB_FUSION_COG",
    "GF6_FUSION_SUMMARY_JSON",
    "MERSI_FUSION_COG",
    "MERSI_FUSION_SUMMARY_JSON",
    "FY4B_FALSE_COLOR_COG",
    "FY4B_FUSION_SUMMARY_JSON"
  ],
  saliencyScore: [
    "SALIENCY_SCORE_COG",
    "GF6_SALIENCY_SCORE_COG",
    "MERSI_SALIENCY_SCORE_COG",
    "FY4B_SALIENCY_SCORE_COG"
  ],
  saliencyMask: [
    "SALIENCY_MASK_COG",
    "GF6_SALIENCY_MASK_COG",
    "MERSI_SALIENCY_MASK_COG",
    "FY4B_SALIENCY_MASK_COG"
  ],
  saliencyPreview: ["SALIENCY_PREVIEW_PNG"],
  saliencyReport: [
    "SALIENCY_METADATA_JSON",
    "GF6_SALIENCY_SUMMARY_JSON",
    "MERSI_SALIENCY_SUMMARY_JSON",
    "FY4B_SALIENCY_SUMMARY_JSON"
  ],
  track: [
    "DECODED_ALTIMETER_TRACK",
    "QUALITY_FILTERED_ALTIMETER_TRACK",
    "BASELINE_SSH_TRACK",
    "STANDARD_TRACK_CSV",
    "STANDARD_TRACK_GEOJSON",
    "STANDARD_TRACK_NETCDF",
    "STANDARD_TRACK_PARQUET",
    "STANDARD_TRACK_SUMMARY_JSON"
  ],
  trackFeature: ["TRACK_FEATURES_JSON", "TRACK_FEATURE_WINDOWS_PARQUET"],
  trackAnomaly: [
    "TRACK_ANOMALIES_GEOJSON",
    "TRACK_ANOMALY_SUMMARY_JSON",
    "STANDARD_TRACK_ANOMALIES_GEOJSON"
  ],
  trackGrid: ["TRACK_GRID_COG", "TRACK_GRID_NETCDF", "TRACK_GRID_SUMMARY_JSON"]
};

for (const [category, types] of Object.entries(families)) {
  test(`all ${category} products have meaningful, type-specific interpretations`, () => {
    for (const type of types) {
      const result = interpret(type);
      assert.equal(result.category, category, type);
      assert.ok(result.purpose.length > 20, type);
      assert.ok(result.reading.length >= 2, type);
      assert.ok(result.generation.length >= 2, type);
      assert.ok(result.uses.length >= 2, type);
    }
  });
}

test("saliency score explains local contrast and real tile colors without land-cover claims", () => {
  const result = interpret("MERSI_SALIENCY_SCORE_COG", {
    resolutionDegrees: 0.01,
    saliency: { source: "CH02_REFLECTANCE", windowSize: 5, threshold: 0.7 }
  });
  assert.match(JSON.stringify(result), /局部均值/);
  assert.match(JSON.stringify(result), /0[～~—]1/);
  assert.match(JSON.stringify(result), /当前瓦片/);
  assert.match(JSON.stringify(result), /不是.*(概率|分类)/);
  assert.match(JSON.stringify(result), /边缘/);
  assert.equal(result.legend.items[0].color, "#440154");
  assert.equal(result.legend.items.at(-1).color, "#fde725");
  assert.match(
    result.parameters.find(item => item.key === "saliency.threshold")!.effect,
    /不改变.*分数/
  );
  assert.match(
    result.parameters.find(item => item.key === "saliency.source")!.value,
    /CH02.*绿光/
  );
  assert.match(
    result.parameters.find(item => item.key === "resolutionDegrees")!.value,
    /0\.01.*°/
  );
  assert.doesNotMatch(JSON.stringify(result), /绿色.*[—：]植被|黄色.*[—：]云/);
});

test("mask, heatmap preview, and report are not confused with a continuous score map", () => {
  const mask = interpret("GF6_SALIENCY_MASK_COG", {
    saliency: { threshold: 0.6 }
  });
  assert.equal(mask.legend.items[0].color, "#f4d03f");
  assert.match(JSON.stringify(mask), /大于等于.*0\.6/);
  assert.match(JSON.stringify(mask), /未达到阈值.*无效/);
  const preview = interpret("SALIENCY_PREVIEW_PNG");
  assert.equal(preview.legend.items.at(-1).color, "#ff0000");
  assert.match(JSON.stringify(preview), /透明度/);
  assert.equal(interpret("SALIENCY_METADATA_JSON").legend, undefined);
});

test("fusion displays all RGB assignments and percentile range with sensor band names", () => {
  const result = interpret("GF6_RGB_FUSION_COG", {
    targetCrs: "EPSG:4326",
    resolution: 0.01,
    bands: [1, 2, 4, 5],
    fusion: { enabled: true, red: 2, green: 4, blue: 5, percentiles: [2, 98] }
  });
  assert.match(JSON.stringify(result.legend), /B2.*绿光/);
  assert.match(JSON.stringify(result.legend), /B4.*近红外/);
  assert.match(JSON.stringify(result.legend), /B5.*红边/);
  assert.match(
    result.parameters.find(item => item.key === "bands")!.value,
    /B1.*B2.*B4.*B5/
  );
  assert.match(
    result.parameters.find(item => item.key === "fusion.percentiles")!.value,
    /2%.*98%/
  );
  assert.match(
    result.parameters.find(item => item.key === "resolution")!.value,
    /°/
  );
  assert.doesNotMatch(JSON.stringify(result), /算法设置|自然彩色影像/);
});

test("HY1 nested parameters and FY4 fixed fusion mode are human readable", () => {
  const hy1 = interpret("SALIENCY_SCORE_COG", {
    grid: {
      targetCrs: "AUTO_UTM",
      resolutionMeters: 30,
      scienceResampling: "nearest"
    },
    roiWgs84: { minLon: 100, minLat: 20, maxLon: 110, maxLat: 30 },
    algorithms: {
      saliency: {
        enabled: true,
        source: "B560",
        threshold: 0.5,
        windowSize: 3
      },
      fusion: { red: "B650", green: "B560", blue: "B460" }
    }
  });
  assert.match(JSON.stringify(hy1.parameters), /自动.*UTM/);
  assert.match(JSON.stringify(hy1.parameters), /30 m/);
  assert.match(JSON.stringify(hy1.parameters), /B560.*绿光/);
  assert.match(
    JSON.stringify(hy1.parameters),
    /西.*100.*南.*20.*东.*110.*北.*30/
  );
  assert.doesNotMatch(JSON.stringify(hy1.parameters), /红色显示通道/);
  const fy4 = interpret("FY4B_FALSE_COLOR_COG", {
    fusion: { mode: "NIR_RED_BLUE", percentiles: [2, 98] }
  });
  assert.match(JSON.stringify(fy4.legend), /C03.*近红外/);
  assert.match(JSON.stringify(fy4.legend), /C02.*红光/);
  assert.match(JSON.stringify(fy4.legend), /C01.*蓝光/);
});

test("features explain selected metrics without pretending every feature is gradient", () => {
  const result = interpret("FY4B_FEATURE_COG", {
    features: {
      enabled: true,
      metrics: ["local_variance", "toa_nir_red_nd", "btd_c13_c14"],
      windowSize: 7
    }
  });
  assert.match(JSON.stringify(result), /纹理复杂度/);
  assert.match(JSON.stringify(result), /C13.*C14/);
  assert.match(JSON.stringify(result), /7 × 7 像元/);
  assert.match(JSON.stringify(result.reading), /三个及以上波段/);
  assert.equal(result.legend, undefined);
});

test("quality bitfields are not rendered as land-cover classes or binary saliency masks", () => {
  const result = interpret("FY4B_RED_500M_QUALITY_COG");
  assert.equal(result.legend, undefined);
  assert.match(JSON.stringify(result), /质量标志/);
  assert.match(JSON.stringify(result), /不是.*地物/);
});

test("track anomaly reasons and grid statistics use their own definitions and units", () => {
  const snapshot = {
    qualityPolicyVersion: "hy2d-idr-2mc-baseline-v1",
    featureWindowSize: 21,
    anomaly: { madThreshold: 5, jumpThresholdMeters: 0.5 },
    grid: { enabled: true, spacingDegrees: 0.25 }
  };
  const anomaly = interpret("TRACK_ANOMALIES_GEOJSON", snapshot);
  assert.match(JSON.stringify(anomaly), /MAD_OUTLIER/);
  assert.match(JSON.stringify(anomaly), /ADJACENT_JUMP/);
  assert.match(JSON.stringify(anomaly), /工程.*100 m/);
  assert.match(JSON.stringify(anomaly.parameters), /21 个观测点/);
  assert.match(JSON.stringify(anomaly.parameters), /0\.5 m/);
  assert.doesNotMatch(JSON.stringify(anomaly), /显著性分数|识别概率/);
  const grid = interpret("TRACK_GRID_COG", snapshot);
  assert.match(JSON.stringify(grid), /不.*插值/);
  assert.match(JSON.stringify(grid), /平均.*海面高度|海面高度.*平均/);
  assert.match(JSON.stringify(grid.parameters), /0\.25.*°/);
  assert.doesNotMatch(JSON.stringify(grid.parameters), /MAD 阈值/);
});

test("source labels support feature sources and thermal channels", () => {
  assert.match(
    content("MERSI_SALIENCY_SCORE_COG", {
      saliency: {
        source: "gradient:CH25_BRIGHTNESS_TEMPERATURE",
        windowSize: 3
      }
    }),
    /边界与变化.*CH25/
  );
  assert.match(
    content("FY4B_SALIENCY_SCORE_COG", {
      saliency: { source: "C13_BRIGHTNESS_TEMPERATURE_4000M" }
    }),
    /热红外亮温/
  );
});

test("invalid snapshots and unknown products have safe descriptions without invented defaults", () => {
  for (const snapshot of [undefined, "{", "null", "[]", '"string"']) {
    const result = artifactInterpretation(
      artifact("UNKNOWN_OUTPUT", {
        uri: "rs://output/saliency/fusion.json",
        displayName: "异常结果"
      }),
      "自定义结果说明",
      snapshot
    );
    assert.equal(result.category, "generic");
    assert.equal(result.purpose, "自定义结果说明");
    assert.deepEqual(result.parameters, []);
    assert.equal(result.legend, undefined);
  }
  assert.equal(interpret("GF6_RGB_FUSION_COG").legend, undefined);
  assert.doesNotMatch(content("MERSI_SALIENCY_MASK_COG"), /阈值为 0\./);
});

test("all parameter arrays stay intact and disabled unrelated algorithms are not listed", () => {
  const result = interpret("STANDARD_MERSI_COG", {
    targetCrs: "EPSG:3857",
    resolutionMeters: 1000,
    bands: [1, 2, 3, 20, 21, 22, 23, 24, 25],
    roi: [100, 20, 120, 40],
    features: { enabled: false, windowSize: 3 },
    saliency: { enabled: false, threshold: 0.6 }
  });
  assert.match(JSON.stringify(result.parameters), /CH01.*CH25/);
  assert.match(JSON.stringify(result.parameters), /1000 m/);
  assert.doesNotMatch(JSON.stringify(result.parameters), /阈值|邻域窗口/);
});

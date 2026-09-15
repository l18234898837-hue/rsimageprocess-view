import test from "node:test";
import assert from "node:assert/strict";
import {
  FY4B_AGRI_TEMPLATE,
  FY3H_MERSI_TEMPLATE,
  GF6_WFV_L1A_TEMPLATE,
  HY1C_CZI_L2A_TEMPLATE,
  HY2D_ALTIMETER_TEMPLATE
} from "./productTemplates";
import {
  assertValidPipelineDefinition,
  getPipelineDefinition,
  getTargetSteps,
  type PipelineDefinition
} from "./pipelineDefinitions";

test("image products expose product-specific preprocessing subfunctions", () => {
  assert.deepEqual(
    getTargetSteps(GF6_WFV_L1A_TEMPLATE.id).map(step => step.key),
    [
      "tile-mosaic",
      "rpc-geolocation",
      "projection-standardization",
      "feature-extraction",
      "rgb-fusion",
      "anomaly-detection"
    ]
  );
  assert.deepEqual(
    getTargetSteps(FY4B_AGRI_TEMPLATE.id)
      .map(step => step.key)
      .slice(0, 4),
    [
      "geo-grid-construction",
      "calibration-georeference",
      "reprojection-crop",
      "feature-extraction"
    ]
  );
  assert.deepEqual(
    getTargetSteps(HY1C_CZI_L2A_TEMPLATE.id)
      .map(step => step.key)
      .slice(0, 4),
    [
      "band-metadata-decode",
      "scale-factor-processing",
      "l2-quality-control",
      "projection-standardization"
    ]
  );
  assert.deepEqual(
    getTargetSteps(FY3H_MERSI_TEMPLATE.id)
      .map(step => step.key)
      .slice(0, 4),
    [
      "data-decode",
      "radiometric-calibration",
      "quality-control",
      "swath-standardization"
    ]
  );
});

test("HY-2D keeps an independent along-track pipeline", () => {
  const definition = getPipelineDefinition(HY2D_ALTIMETER_TEMPLATE.id);

  assert.equal(definition.pipelineType, "altimeter");
  assert.deepEqual(
    getTargetSteps(HY2D_ALTIMETER_TEMPLATE.id).map(step => step.key),
    [
      "along-track-decode",
      "along-track-feature-extraction",
      "anomaly-detection",
      "track-gridding",
      "map-preview"
    ]
  );
  assert.equal(
    definition.steps.some(step => step.key === "standard-product"),
    false
  );
  assert.deepEqual(
    definition.steps.find(step => step.key === "anomaly-detection")?.dependsOn,
    ["along-track-feature-extraction"]
  );
});

test("every registered pipeline has complete acyclic dependencies", () => {
  for (const template of [
    GF6_WFV_L1A_TEMPLATE,
    FY4B_AGRI_TEMPLATE,
    HY1C_CZI_L2A_TEMPLATE,
    FY3H_MERSI_TEMPLATE,
    HY2D_ALTIMETER_TEMPLATE
  ]) {
    assert.doesNotThrow(() =>
      assertValidPipelineDefinition(getPipelineDefinition(template.id))
    );
  }
});

test("pipeline validation rejects missing and circular step dependencies", () => {
  const missingDependency: PipelineDefinition = {
    productId: "test-product",
    pipelineType: "image",
    steps: [
      {
        key: "feature-extraction",
        title: "Feature extraction",
        kind: "target",
        dependsOn: ["missing-step"],
        configurable: true
      }
    ]
  };
  const circularDependency: PipelineDefinition = {
    productId: "test-product",
    pipelineType: "image",
    steps: [
      {
        key: "preprocess",
        title: "Preprocess",
        kind: "system",
        dependsOn: ["quality-control"],
        configurable: false
      },
      {
        key: "quality-control",
        title: "Quality control",
        kind: "system",
        dependsOn: ["preprocess"],
        configurable: false
      }
    ]
  };

  assert.throws(
    () => assertValidPipelineDefinition(missingDependency),
    /missing-step/
  );
  assert.throws(
    () => assertValidPipelineDefinition(circularDependency),
    /circular/i
  );
});

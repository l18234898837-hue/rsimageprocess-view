import test from "node:test";
import assert from "node:assert/strict";
import { getPipelineDefinition } from "./pipelineDefinitions";
import {
  resolveProcessingPlan,
  updatePlanTargets,
  updateStepParameters
} from "./processingPlan";

const gf6Pipeline = getPipelineDefinition("gf6-wfv-l1a-v1");
const hy2dPipeline = getPipelineDefinition("hy2d-altimeter-v1");

test("a selected image target resolves its complete locked prerequisite chain", () => {
  const plan = resolveProcessingPlan(gf6Pipeline, ["rgb-fusion"]);

  assert.deepEqual(plan.selectedTargets, ["rgb-fusion"]);
  assert.deepEqual(plan.resolvedSteps, [
    "upload-validation",
    "preprocess",
    "quality-control",
    "spatial-standardization",
    "standard-product",
    "rgb-fusion"
  ]);
  assert.deepEqual(plan.lockedPrerequisites, [
    "upload-validation",
    "preprocess",
    "quality-control",
    "spatial-standardization",
    "standard-product"
  ]);
});

test("multiple image targets share one prerequisite chain", () => {
  const plan = resolveProcessingPlan(gf6Pipeline, [
    "feature-extraction",
    "rgb-fusion"
  ]);

  assert.deepEqual(plan.resolvedSteps, [
    "upload-validation",
    "preprocess",
    "quality-control",
    "spatial-standardization",
    "standard-product",
    "feature-extraction",
    "rgb-fusion"
  ]);
  assert.equal(
    plan.resolvedSteps.filter(step => step === "standard-product").length,
    1
  );
});

test("removing a target removes prerequisites no longer used by any target", () => {
  const initial = resolveProcessingPlan(gf6Pipeline, [
    "feature-extraction",
    "rgb-fusion"
  ]);
  const updated = updatePlanTargets(initial, gf6Pipeline, [
    "feature-extraction"
  ]);

  assert.deepEqual(updated.selectedTargets, ["feature-extraction"]);
  assert.equal(updated.resolvedSteps.includes("rgb-fusion"), false);
  assert.equal(updated.resolvedSteps.includes("standard-product"), true);
});

test("HY-2D anomaly detection auto-adds locked along-track feature extraction", () => {
  const plan = resolveProcessingPlan(hy2dPipeline, ["anomaly-detection"]);

  assert.deepEqual(plan.selectedTargets, ["anomaly-detection"]);
  assert.equal(
    plan.resolvedSteps.includes("along-track-feature-extraction"),
    true
  );
  assert.equal(
    plan.lockedPrerequisites.includes("along-track-feature-extraction"),
    true
  );
});

test("changing a prerequisite parameter marks only its resolved descendants for rerun", () => {
  const plan = resolveProcessingPlan(gf6Pipeline, ["feature-extraction"]);
  const updated = updateStepParameters(plan, gf6Pipeline, "quality-control", {
    cloudThreshold: 0.2
  });

  assert.deepEqual(updated.parameters, {
    "quality-control": { cloudThreshold: 0.2 }
  });
  assert.deepEqual(updated.invalidatedSteps, [
    "spatial-standardization",
    "standard-product",
    "feature-extraction"
  ]);
});

test("the resolver rejects unsupported and non-target selections", () => {
  assert.throws(
    () => resolveProcessingPlan(gf6Pipeline, ["track-gridding"]),
    /unsupported/i
  );
  assert.throws(
    () => resolveProcessingPlan(gf6Pipeline, ["quality-control"]),
    /target/i
  );
});

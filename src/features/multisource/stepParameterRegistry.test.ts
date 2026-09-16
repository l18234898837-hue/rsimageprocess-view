import test from "node:test";
import assert from "node:assert/strict";
import { getPipelineDefinition } from "./pipelineDefinitions";
import { resolveProcessingPlan } from "./processingPlan";
import {
  getConfigurablePlanSteps,
  getStepParameterRegistry
} from "./stepParameterRegistry";

test("GF-6 keeps one existing form while exposing selected configurable steps", () => {
  const registry = getStepParameterRegistry("gf6-wfv-l1a-v1");
  const plan = resolveProcessingPlan(getPipelineDefinition("gf6-wfv-l1a-v1"), [
    "feature-extraction"
  ]);

  assert.deepEqual(
    getConfigurablePlanSteps(
      plan,
      getPipelineDefinition("gf6-wfv-l1a-v1"),
      registry
    ),
    ["projection-standardization", "feature-extraction"]
  );
  assert.deepEqual(registry.validate(registry.createDefault()), []);
  assert.equal(
    (
      registry.buildSnapshot(registry.createDefault()) as {
        schemaVersion: string;
      }
    ).schemaVersion,
    "gf6-wfv-l1a-v1"
  );
});

test("HY-2D maps its existing form to the independent along-track steps", () => {
  const registry = getStepParameterRegistry("hy2d-altimeter-v1");
  const plan = resolveProcessingPlan(
    getPipelineDefinition("hy2d-altimeter-v1"),
    ["anomaly-detection"]
  );

  assert.deepEqual(
    getConfigurablePlanSteps(
      plan,
      getPipelineDefinition("hy2d-altimeter-v1"),
      registry
    ),
    ["along-track-feature-extraction", "anomaly-detection"]
  );
  assert.deepEqual(registry.validate(registry.createDefault()), []);
});

test("a registry does not expose unsupported configurable pipeline steps", () => {
  const registry = getStepParameterRegistry("hy2d-altimeter-v1");

  assert.equal(registry.supportsStep("rgb-fusion"), false);
  assert.equal(registry.supportsStep("track-gridding"), true);
});

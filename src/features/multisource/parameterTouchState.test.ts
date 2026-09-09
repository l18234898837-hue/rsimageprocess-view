import assert from "node:assert/strict";
import test from "node:test";
import { createParameterTouchState } from "./parameterTouchState";

test("parameter touch state only marks fields that the user changed", () => {
  const state = createParameterTouchState();

  assert.equal(state.isTouched("resolution"), false);
  state.touch("resolution");

  assert.equal(state.isTouched("resolution"), true);
  assert.equal(state.isTouched("targetCrs"), false);
});

test("parameter touch state treats a grouped validation result as changed when any field was edited", () => {
  const state = createParameterTouchState();
  state.touch("fusion.lowPercentile");

  assert.equal(
    state.isTouched("fusion.lowPercentile", "fusion.highPercentile"),
    true
  );
});

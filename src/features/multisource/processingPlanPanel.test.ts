import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const panel = readFileSync(
  "src/components/LeftPanel/ProcessingPlanPanel.vue",
  "utf8"
);
const workspace = readFileSync(
  "src/components/LeftPanel/MultiSourceSatelliteProcess.vue",
  "utf8"
);

test("processing plan panel exposes selectable targets and automatic prerequisites", () => {
  assert.match(panel, /选择处理功能/);
  assert.match(panel, /系统自动添加/);
  assert.match(panel, /update:selectedTargets/);
  assert.match(panel, /:disabled="disabled"/);
});

test("multisource workspace integrates the plan before upload and requires a target", () => {
  assert.match(workspace, /<ProcessingPlanPanel/);
  assert.match(workspace, /:target-steps="targetSteps"/);
  assert.match(workspace, /selectedTargets\.value\.length > 0/);
  assert.match(workspace, /function updateSelectedTargets/);
});

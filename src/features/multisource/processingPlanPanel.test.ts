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

test("selected processing targets expand their detail and configuration entry", () => {
  assert.match(panel, /processing-plan__detail/);
  assert.match(panel, /v-if="selectedTargets\.includes\(step\.key\)"/);
  assert.match(panel, /getPrerequisiteSteps\(step\)/);
  assert.match(panel, /configure:\s*\[\]/);
  assert.match(panel, /@click="emit\('configure'\)"/);
  assert.match(workspace, /@configure="isParameterDrawerOpen = true"/);
});

test("multisource workspace integrates the plan before upload and requires a target", () => {
  assert.match(workspace, /<ProcessingPlanPanel/);
  assert.match(workspace, /:target-steps="targetSteps"/);
  assert.match(workspace, /selectedTargets\.value\.length > 0/);
  assert.match(workspace, /function updateSelectedTargets/);
});

test("multisource workspace places file upload before processing plan selection", () => {
  assert.ok(workspace.indexOf('aria-labelledby="package-title"') >= 0);
  assert.ok(
    workspace.indexOf('aria-labelledby="package-title"') <
      workspace.indexOf("<ProcessingPlanPanel")
  );
});

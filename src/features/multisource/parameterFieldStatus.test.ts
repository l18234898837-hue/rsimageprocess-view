import assert from "node:assert/strict";
import test from "node:test";
import { resolveParameterFieldStatus } from "./parameterFieldStatus";

test("field status shows the matching validation error beside its field", () => {
  const status = resolveParameterFieldStatus(
    [
      {
        field: "fusion.percentiles",
        message: "融合百分位必须满足 0 <= 低值 < 高值 <= 100"
      },
      {
        field: "roi",
        message: "ROI 必须按 minLon、minLat、maxLon、maxLat 排列"
      }
    ],
    ["fusion.percentiles"],
    "范围 0 到 100 %"
  );

  assert.deepEqual(status, {
    state: "invalid",
    message: "融合百分位必须满足 0 <= 低值 < 高值 <= 100"
  });
});

test("field status keeps numeric guidance neutral until the user changes the value", () => {
  const status = resolveParameterFieldStatus(
    [
      {
        field: "roi",
        message: "ROI 必须按 minLon、minLat、maxLon、maxLat 排列"
      }
    ],
    ["fusion.percentiles"],
    "范围 0 到 100 %"
  );

  assert.deepEqual(status, { state: "neutral", message: "范围 0 到 100 %" });
});

test("field status confirms a changed value only after its rules pass", () => {
  const status = resolveParameterFieldStatus(
    [],
    ["fusion.percentiles"],
    "范围 0 到 100 %",
    true
  );

  assert.deepEqual(status, { state: "valid", message: "输入有效" });
});

test("field status remains silent when a control has no rule to communicate", () => {
  const status = resolveParameterFieldStatus([], ["fusion.red"]);

  assert.deepEqual(status, { state: "neutral", message: "" });
});

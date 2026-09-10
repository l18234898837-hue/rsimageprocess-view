import assert from "node:assert/strict";
import test from "node:test";
import { resolveParameterFieldStatus } from "./parameterFieldStatus";

test("field status distinguishes a default value from an empty field", () => {
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

  assert.deepEqual(status, { state: "neutral", message: "待填写" });
  assert.deepEqual(
    resolveParameterFieldStatus([], ["resolution"], "范围大于 0", "default"),
    { state: "neutral", message: "使用默认值" }
  );
});

test("field status shows guidance while the user is editing", () => {
  const status = resolveParameterFieldStatus(
    [
      {
        field: "roi",
        message: "ROI 必须按 minLon、minLat、maxLon、maxLat 排列"
      }
    ],
    ["fusion.percentiles"],
    "范围 0 到 100 %",
    "editing"
  );

  assert.deepEqual(status, { state: "neutral", message: "范围 0 到 100 %" });
});

test("field status shows the matching validation error after validation", () => {
  const status = resolveParameterFieldStatus(
    [
      {
        field: "fusion.percentiles",
        message: "融合百分位必须满足 0 <= 低值 < 高值 <= 100"
      }
    ],
    ["fusion.percentiles"],
    "范围 0 到 100 %",
    "invalid"
  );

  assert.deepEqual(status, {
    state: "invalid",
    message: "融合百分位必须满足 0 <= 低值 < 高值 <= 100"
  });
});

test("field status confirms a validated value when no issue remains", () => {
  const status = resolveParameterFieldStatus(
    [],
    ["fusion.percentiles"],
    "范围 0 到 100 %",
    "valid"
  );

  assert.deepEqual(status, { state: "valid", message: "输入有效" });
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  GF6_OUTPUT_BANDS,
  GF6_BAND_PRESETS,
  HY1C_OUTPUT_BANDS,
  HY1C_BAND_PRESETS,
  FY3H_OUTPUT_BANDS,
  FY3H_BAND_PRESETS,
  FY4B_SOURCE_DESCRIPTIONS,
  bandsForPreset
} from "./outputBandOptions";
import { defaultGf6WfvL1aForm, GF6_WFV_L1A_BANDS } from "./gf6WfvL1aParameters";
import { FY3H_MERSI_BANDS } from "./fy3hMersiParameters";
import { HY1C_CZI_BANDS } from "./hy1cCziL2aParameters";
import { FY4B_AGRI_SALIENCY_SOURCES } from "./fy4bAgriParameters";

test("every selectable band has a Chinese name, purpose, wavelength and guidance", () => {
  for (const [options, values] of [
    [GF6_OUTPUT_BANDS, GF6_WFV_L1A_BANDS],
    [HY1C_OUTPUT_BANDS, HY1C_CZI_BANDS],
    [FY3H_OUTPUT_BANDS, FY3H_MERSI_BANDS]
  ] as const) {
    assert.deepEqual(
      options.map(band => band.value),
      [...values]
    );
    for (const band of options) {
      assert.match(band.label, /[\u4e00-\u9fff]/);
      assert.ok(
        band.category && band.description && band.wavelength && band.pairing
      );
    }
  }
  assert.match(GF6_OUTPUT_BANDS[3].label, /近红外/);
  assert.match(GF6_OUTPUT_BANDS[4].label, /红边/);
  assert.match(FY3H_OUTPUT_BANDS[20].category, /火点/);
  assert.ok(new Set(FY3H_OUTPUT_BANDS.map(band => band.group)).size > 2);
});

test("purpose presets contain only available unique bands and cover all-band selection", () => {
  for (const [options, presets] of [
    [GF6_OUTPUT_BANDS, GF6_BAND_PRESETS],
    [HY1C_OUTPUT_BANDS, HY1C_BAND_PRESETS],
    [FY3H_OUTPUT_BANDS, FY3H_BAND_PRESETS]
  ] as const) {
    for (const preset of presets) {
      assert.ok(preset.bands.length);
      assert.ok(
        preset.description?.trim(),
        `${preset.label} needs a purpose description`
      );
      assert.deepEqual(bandsForPreset(preset, options), preset.bands);
      assert.equal(new Set(preset.bands).size, preset.bands.length);
    }
    assert.deepEqual(
      presets.at(-1)?.bands,
      options.map(band => band.value)
    );
  }
  assert.deepEqual(GF6_BAND_PRESETS[0].bands, [1, 2, 3]);
});

test("presets change only output selection and never mutate defaults or fusion settings", () => {
  const form = defaultGf6WfvL1aForm();
  const before = structuredClone(form);
  const selection = bandsForPreset(GF6_BAND_PRESETS[0], GF6_OUTPUT_BANDS);
  form.bands = selection as number[];
  assert.deepEqual(form.fusion, before.fusion);
  assert.deepEqual(form.saliency, before.saliency);
  assert.deepEqual(defaultGf6WfvL1aForm(), before);
  selection.pop();
  assert.deepEqual(GF6_BAND_PRESETS[0].bands, [1, 2, 3]);
  assert.deepEqual(
    bandsForPreset(
      { label: "受限波段", description: "仅选择可用波段。", bands: [4, 99] },
      GF6_OUTPUT_BANDS
    ),
    [4]
  );
});

test("FY-4B source explanations cover existing API values without changing them", () => {
  assert.deepEqual(Object.keys(FY4B_SOURCE_DESCRIPTIONS), [
    ...FY4B_AGRI_SALIENCY_SOURCES
  ]);
  for (const entry of Object.values(FY4B_SOURCE_DESCRIPTIONS)) {
    assert.match(entry.label, /[\u4e00-\u9fff]/);
    assert.ok(entry.description);
  }
  assert.match(
    FY4B_SOURCE_DESCRIPTIONS.C13_BRIGHTNESS_TEMPERATURE_4000M.label,
    /亮温/
  );
});

test("compact picker separates detail buttons from selection and supports collapsible groups", () => {
  const picker = readFileSync(
    "src/features/multisource/OutputBandPicker.vue",
    "utf8"
  );
  assert.match(picker, /columns: 2/);
  assert.match(picker, /collapseGroups/);
  assert.match(picker, /<\/label>\s*<button[\s\S]*?output-band-picker__info/);
  assert.match(picker, /aria-expanded/);
  assert.match(picker, /波段说明/);
  assert.match(picker, /不改变.*融合组合/);
  assert.match(picker, /:disabled="disabled"[\s\S]*?@click="applyPreset/);
  assert.match(
    picker,
    /<el-tooltip[\s\S]*?:content="presetHelpText\(preset\)"/
  );
  assert.match(picker, /preset\.description/);
  assert.match(picker, /选中波段/);
  assert.match(picker, /:trigger="\['hover', 'focus'\]"/);
  assert.match(picker, /:trigger-keys="\[\]"/);
});

test("product drawers use two-column purpose pickers and retain FY-4B source values", () => {
  for (const [path, prefix] of [
    ["src/features/multisource/Gf6WfvL1aParameterDrawer.vue", "GF6"],
    ["src/features/multisource/Fy3hMersiParameterDrawer.vue", "FY3H"],
    ["src/components/LeftPanel/MultiSourceSatelliteProcess.vue", "HY1C"]
  ]) {
    const source = readFileSync(path, "utf8");
    assert.match(
      source,
      new RegExp(`:presets="${prefix}_BAND_PRESETS"\\s+:columns="2"`)
    );
    if (prefix === "FY3H") assert.match(source, /collapse-groups/);
  }
  const fy4b = readFileSync(
    "src/features/multisource/Fy4bAgriParameterDrawer.vue",
    "utf8"
  );
  assert.match(fy4b, /:value="source"/);
  assert.match(fy4b, /FY4B_SOURCE_DESCRIPTIONS\[source\]\?\.label/);
  assert.match(fy4b, /band-source-description/);
  assert.match(fy4b, /近红外—红光—蓝光假彩色/);
});

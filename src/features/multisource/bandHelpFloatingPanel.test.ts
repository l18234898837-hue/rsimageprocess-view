import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  BAND_HELP_RESIZE_HANDLES,
  bandHelpSplitBounds,
  bandHelpSplitWidth,
  fitBandHelpRect,
  resizeBandHelpRect
} from "./bandHelpPanelGeometry";

const viewport = { width: 1280, height: 900 };
const original = { left: 180, top: 140, width: 720, height: 460 };

test("drag and viewport changes keep the whole panel inside the screen", () => {
  assert.deepEqual(
    fitBandHelpRect({ ...original, left: -300, top: 2000 }, viewport),
    {
      left: 8,
      top: 432,
      width: 720,
      height: 460
    }
  );
  assert.deepEqual(fitBandHelpRect(original, { width: 360, height: 280 }), {
    left: 8,
    top: 8,
    width: 344,
    height: 264
  });
});

test("all eight resize handles change only their own edges", () => {
  assert.equal(BAND_HELP_RESIZE_HANDLES.length, 8);
  for (const handle of BAND_HELP_RESIZE_HANDLES) {
    const resized = resizeBandHelpRect(original, handle, 30, 20, viewport);
    assert.equal(
      resized.left,
      original.left + (handle.includes("w") ? 30 : 0),
      handle
    );
    assert.equal(
      resized.top,
      original.top + (handle.includes("n") ? 20 : 0),
      handle
    );
    assert.equal(
      resized.left + resized.width,
      original.left + original.width + (handle.includes("e") ? 30 : 0),
      handle
    );
    assert.equal(
      resized.top + resized.height,
      original.top + original.height + (handle.includes("s") ? 20 : 0),
      handle
    );
  }
});

test("resize clamps minimum size without moving the opposite corner", () => {
  const resized = resizeBandHelpRect(original, "nw", 10000, 10000, viewport);
  assert.equal(resized.width, 520);
  assert.equal(resized.height, 320);
  assert.equal(resized.left + resized.width, original.left + original.width);
  assert.equal(resized.top + resized.height, original.top + original.height);
  for (const handle of BAND_HELP_RESIZE_HANDLES) {
    for (const delta of [-10000, 10000]) {
      const rect = resizeBandHelpRect(original, handle, delta, delta, viewport);
      assert.ok(rect.left >= 8 && rect.top >= 8);
      assert.ok(rect.left + rect.width <= viewport.width - 8);
      assert.ok(rect.top + rect.height <= viewport.height - 8);
      assert.ok(rect.width >= 520 && rect.height >= 320);
    }
  }
});

test("split limits keep both panes usable even on narrow screens", () => {
  for (const width of [304, 344, 520, 720, 1200]) {
    const bounds = bandHelpSplitBounds(width);
    assert.ok(bounds.minimum <= bounds.maximum);
    assert.equal(bandHelpSplitWidth(width, -1), bounds.minimum);
    assert.equal(bandHelpSplitWidth(width, 2), bounds.maximum);
    assert.ok(
      bounds.available - bounds.maximum >= Math.min(240, bounds.available * 0.5)
    );
  }
  const snapshot = { ...original };
  bandHelpSplitWidth(original.width, 0.6);
  assert.deepEqual(original, snapshot);
});

test("band details open a non-modal floating panel instead of an inline section", () => {
  const picker = readFileSync(
    "src/features/multisource/OutputBandPicker.vue",
    "utf8"
  );
  assert.match(picker, /<BandHelpFloatingPanel/);
  assert.doesNotMatch(picker, /class="output-band-picker__details"/);
  assert.match(picker, /activeBandHelpOwner/);
  assert.match(picker, /onBeforeUnmount/);
  assert.match(picker, /props\.helpEnabled/);
  for (const file of [
    "Gf6WfvL1aParameterDrawer.vue",
    "Fy3hMersiParameterDrawer.vue"
  ]) {
    assert.match(
      readFileSync(`src/features/multisource/${file}`, "utf8"),
      /:help-enabled="open"/
    );
  }
  assert.match(
    readFileSync(
      "src/components/LeftPanel/MultiSourceSatelliteProcess.vue",
      "utf8"
    ),
    /:help-enabled="isParameterDrawerOpen"/
  );
});

test("floating help uses a body portal, shared stacking and independent keyboard-accessible panes", () => {
  const panel = readFileSync(
    "src/features/multisource/BandHelpFloatingPanel.vue",
    "utf8"
  );
  assert.match(panel, /<Teleport to="body">/);
  assert.match(panel, /aria-modal="false"/);
  assert.match(panel, /useFloatingPanelStack/);
  assert.match(panel, /role="separator"/);
  assert.match(panel, /@keydown="resizeSplitWithKeyboard"/);
  assert.match(panel, /BAND_HELP_RESIZE_HANDLES/);
  assert.match(panel, /removeEventListener\("pointermove"/);
  assert.match(panel, /pointercancel/);
  assert.match(panel, /overflow: auto/);
  assert.doesNotMatch(panel, /defineModel|selectedBands|el-dialog/);
  assert.doesNotMatch(
    panel,
    /标题栏拖动位置|以上说明为通道用途|ignore-band-help__notice|<footer/
  );
});

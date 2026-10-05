import test from "node:test";
import assert from "node:assert/strict";
import { createTaskHistorySelection } from "./taskHistorySelection";

test("history selection toggles every eligible task on the current page", () => {
  const selection = createTaskHistorySelection();

  selection.togglePage([
    { taskId: 101 },
    { taskId: "9223372036854775807" },
    { taskId: 103, eligible: false }
  ]);

  assert.equal(selection.selectedCount, 2);
  assert.equal(selection.isSelected(101), true);
  assert.equal(selection.isSelected("9223372036854775807"), true);
  assert.equal(selection.isSelected(103), false);

  selection.togglePage([{ taskId: 101 }, { taskId: "9223372036854775807" }]);
  assert.equal(selection.selectedCount, 0);
});

test("history selection persists normalized IDs across pages", () => {
  const selection = createTaskHistorySelection();

  selection.toggle({ taskId: "9223372036854775807" });
  selection.toggle({ taskId: 202 });

  assert.deepEqual(selection.selectedIds, ["9223372036854775807", "202"]);
  assert.equal(selection.isSelected("9223372036854775807"), true);
  assert.equal(selection.isSelected(202), true);
});

test("history selection safely normalizes numeric IDs", () => {
  const selection = createTaskHistorySelection();

  assert.equal(selection.toggle({ taskId: 101 }), true);
  assert.equal(selection.isSelected("101"), true);
});

test("history selection rejects unsafe numeric IDs", () => {
  const selection = createTaskHistorySelection();
  const unsafeId = Number.MAX_SAFE_INTEGER + 1;

  assert.equal(selection.toggle({ taskId: unsafeId }), false);
  assert.equal(selection.isSelected(unsafeId), false);
  assert.deepEqual(selection.selectedIds, []);
});

test("history selection clears after a successful batch operation", () => {
  const selection = createTaskHistorySelection();
  selection.togglePage([{ taskId: 301 }, { taskId: 302 }]);

  selection.clear();

  assert.equal(selection.selectedCount, 0);
  assert.equal(selection.isSelected(301), false);
  assert.deepEqual(selection.selectedIds, []);
});

test("history selection ignores ineligible rows", () => {
  const selection = createTaskHistorySelection();

  assert.equal(selection.toggle({ taskId: 401, eligible: false }), false);
  selection.togglePage([{ taskId: 401, eligible: false }, { taskId: 402 }]);

  assert.equal(selection.selectedCount, 1);
  assert.equal(selection.isSelected(401), false);
  assert.equal(selection.isSelected(402), true);
});

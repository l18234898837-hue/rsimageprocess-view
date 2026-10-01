import assert from "node:assert/strict";
import test from "node:test";
import { hasRequiredPermissions } from "../../router/utils";

test("requires every declared permission while allowing an empty requirement", () => {
  assert.equal(
    hasRequiredPermissions(["task:read", "task:download"], "task:read"),
    true
  );
  assert.equal(
    hasRequiredPermissions(["task:read"], ["task:read", "task:download"]),
    false
  );
  assert.equal(hasRequiredPermissions([], []), true);
});

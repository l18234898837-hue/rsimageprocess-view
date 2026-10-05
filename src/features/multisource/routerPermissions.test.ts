import assert from "node:assert/strict";
import test from "node:test";
import { hasRequiredPermissions, hasRequiredRoles } from "../../router/utils";

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

test("requires every declared route role while allowing an empty requirement", () => {
  assert.equal(hasRequiredRoles(["admin", "common"], "admin"), true);
  assert.equal(hasRequiredRoles(["common"], ["admin"]), false);
  assert.equal(hasRequiredRoles([], []), true);
});

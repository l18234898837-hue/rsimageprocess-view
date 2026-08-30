import test from "node:test";
import assert from "node:assert/strict";
import { validateFy3hMersiPair } from "./fy3hMersiFiles";

const file = (name: string) => ({ name }) as File;

test("FY-3H accepts a matching 1000M and GEO1K filename pair", () => {
  const result = validateFy3hMersiPair({
    observation: file("FY3H_MERSI_GRAN_L1_20260701_2335_1000M_V0.HDF"),
    geo1k: file("FY3H_MERSI_GRAN_L1_20260701_2335_GEO1K_V0.HDF")
  });

  assert.equal(result.valid, true);
  assert.deepEqual(result.issues, []);
});

test("FY-3H rejects files placed in the wrong slots", () => {
  const result = validateFy3hMersiPair({
    observation: file("FY3H_MERSI_GRAN_L1_20260701_2335_GEO1K_V0.HDF"),
    geo1k: file("FY3H_MERSI_GRAN_L1_20260701_2335_1000M_V0.HDF")
  });

  assert.equal(result.valid, false);
  assert.ok(result.issues.some(issue => issue.code === "WRONG_SLOT"));
});

test("FY-3H rejects different identities and versions", () => {
  const result = validateFy3hMersiPair({
    observation: file("FY3H_MERSI_GRAN_L1_20260701_2335_1000M_V0.HDF"),
    geo1k: file("FY3H_MERSI_GRAN_L1_20260701_2350_GEO1K_V1.HDF")
  });

  assert.equal(result.valid, false);
  assert.deepEqual(
    new Set(result.issues.map(issue => issue.code)),
    new Set(["UNMATCHED_IDENTITY", "UNMATCHED_VERSION"])
  );
});

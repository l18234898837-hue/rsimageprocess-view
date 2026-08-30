import test from "node:test";
import assert from "node:assert/strict";
import { validateFy4bAgriFiles } from "./fy4bAgriFiles";

const file = (name: string) => ({ name }) as File;

const matchingFiles = () => ({
  l1_0500m: file(
    "FY4B-_AGRI--_N_DISK_1050E_L1-_FDI-_MULT_NOM_20260701000000_20260701001459_0500M_V0001.HDF"
  ),
  l1_1000m: file(
    "FY4B-_AGRI--_N_DISK_1050E_L1-_FDI-_MULT_NOM_20260701000000_20260701001459_1000M_V0001.HDF"
  ),
  l1_2000m: file(
    "FY4B-_AGRI--_N_DISK_1050E_L1-_FDI-_MULT_NOM_20260701000000_20260701001459_2000M_V0001.HDF"
  ),
  l1_4000m: file(
    "FY4B-_AGRI--_N_DISK_1050E_L1-_FDI-_MULT_NOM_20260701000000_20260701001459_4000M_V0001.HDF"
  ),
  geo_4000m: file(
    "FY4B-_AGRI--_N_DISK_1050E_L1-_GEO-_MULT_NOM_20260701000000_20260701001459_4000M_V0001.HDF"
  )
});

test("FY-4B accepts the literal matching five-file AGRI package", () => {
  const result = validateFy4bAgriFiles(matchingFiles());

  assert.equal(result.valid, true);
  assert.deepEqual(result.issues, []);
});

test("FY-4B rejects a mixed observation end time and version", () => {
  const files = matchingFiles();
  files.geo_4000m = file(
    "FY4B-_AGRI--_N_DISK_1050E_L1-_GEO-_MULT_NOM_20260701000000_20260701002959_4000M_V0002.HDF"
  );

  const result = validateFy4bAgriFiles(files);

  assert.equal(result.valid, false);
  assert.deepEqual(
    new Set(result.issues.map(issue => issue.code)),
    new Set(["UNMATCHED_OBSERVATION", "UNMATCHED_VERSION"])
  );
});

test("FY-4B rejects an FDI file in the GEO slot and a wrong resolution", () => {
  const files = matchingFiles();
  files.geo_4000m = file(
    "FY4B-_AGRI--_N_DISK_1050E_L1-_FDI-_MULT_NOM_20260701000000_20260701001459_4000M_V0001.HDF"
  );
  files.l1_2000m = file(
    "FY4B-_AGRI--_N_DISK_1050E_L1-_FDI-_MULT_NOM_20260701000000_20260701001459_1000M_V0001.HDF"
  );

  const result = validateFy4bAgriFiles(files);

  assert.equal(result.valid, false);
  assert.deepEqual(
    new Set(result.issues.map(issue => issue.code)),
    new Set(["WRONG_SLOT"])
  );
});

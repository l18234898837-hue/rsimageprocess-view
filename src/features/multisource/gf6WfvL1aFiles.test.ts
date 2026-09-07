import test from "node:test";
import assert from "node:assert/strict";
import { validateGf6WfvL1aFiles } from "./gf6WfvL1aFiles";

const file = (name: string) => ({ name }) as File;

const matchingFiles = () => ({
  mainTiffTile0: file("GF6_WFV_E114.2_N30.1_20260701_L1A-1.tiff"),
  mainTiffTile1: file("GF6_WFV_E114.2_N30.1_20260701_L1A-2.tiff"),
  mainTiffTile2: file("GF6_WFV_E114.2_N30.1_20260701_L1A-3.tiff"),
  metadataXml: file("GF6_WFV_E114.2_N30.1_20260701_L1A.xml"),
  rpcRpb: file("GF6_WFV_E114.2_N30.1_20260701_L1A.rpb"),
  nav: file("GF6_WFV_E114.2_N30.1_20260701_L1A.nav"),
  tileIndexTil: file("GF6_WFV_E114.2_N30.1_20260701_L1A.til")
});

test("GF-6 accepts three normalized TIFF tiles and matching product sidecars", () => {
  const result = validateGf6WfvL1aFiles(matchingFiles());

  assert.equal(result.valid, true);
  assert.deepEqual(result.issues, []);
});

test("GF-6 rejects duplicate or missing tile ordinals", () => {
  const files = matchingFiles();
  files.mainTiffTile1 = file("GF6_WFV_E114.2_N30.1_20260701_L1A-1.tiff");

  const result = validateGf6WfvL1aFiles(files);

  assert.equal(result.valid, false);
  assert.ok(
    result.issues.some(issue => issue.code === "INVALID_TILE_ORDINALS")
  );
});

test("GF-6 binds each TIFF upload slot to its matching tile suffix", () => {
  const files = matchingFiles();
  files.mainTiffTile0 = file("GF6_WFV_E114.2_N30.1_20260701_L1A-2.tiff");
  files.mainTiffTile1 = file("GF6_WFV_E114.2_N30.1_20260701_L1A-1.tiff");

  const result = validateGf6WfvL1aFiles(files);

  assert.equal(result.valid, false);
  assert.ok(result.issues.some(issue => issue.code === "WRONG_TILE_SLOT"));
});

test("GF-6 rejects a tile RPB and mismatched XML basename", () => {
  const files = matchingFiles();
  files.rpcRpb = file("GF6_WFV_E114.2_N30.1_20260701_L1A-2.rpb");
  files.metadataXml = file("different-product.xml");

  const result = validateGf6WfvL1aFiles(files);

  assert.equal(result.valid, false);
  assert.deepEqual(
    new Set(result.issues.map(issue => issue.code)),
    new Set(["TILE_RPB", "UNMATCHED_BASENAME"])
  );
});

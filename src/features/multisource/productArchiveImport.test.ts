import test from "node:test";
import assert from "node:assert/strict";
import {
  matchProductArchiveEntries,
  type ProductArchiveEntry
} from "./productArchiveImport";
import {
  FY3H_MERSI_TEMPLATE,
  FY4B_AGRI_TEMPLATE,
  GF6_WFV_L1A_TEMPLATE,
  HY1C_CZI_L2A_TEMPLATE,
  HY2D_ALTIMETER_TEMPLATE
} from "./productTemplates";

const entry = (name: string): ProductArchiveEntry => ({ name });

test("matches GF-6 archive files to all required slots by extension and tile ordinal", () => {
  const result = matchProductArchiveEntries(
    [
      "GF6_tile_01.tif",
      "GF6_tile_02.tif",
      "GF6_tile_03.tif",
      "GF6_product.xml",
      "GF6_product.rpb",
      "GF6_product.nav",
      "GF6_product.til"
    ].map(entry),
    GF6_WFV_L1A_TEMPLATE
  );

  assert.equal(result.conflicts.length, 0);
  assert.deepEqual(
    result.matches.map(match => match.slot.id),
    [
      "mainTiffTile0",
      "mainTiffTile1",
      "mainTiffTile2",
      "metadataXml",
      "rpcRpb",
      "nav",
      "tileIndexTil"
    ]
  );
  assert.deepEqual(result.missingRequired, []);
});

test("ignores GF-6 footprint sidecars that are outside the upload contract", () => {
  const result = matchProductArchiveEntries(
    [
      "GF6_tile_01.tif",
      "GF6_tile_02.tif",
      "GF6_tile_03.tif",
      "GF6_product.xml",
      "GF6_product.rpb",
      "GF6_product.nav",
      "GF6_product.til",
      "GF6_product.shp",
      "GF6_product.dbf",
      "GF6_product.shx"
    ].map(entry),
    GF6_WFV_L1A_TEMPLATE
  );

  assert.deepEqual(result.missingRequired, []);
  assert.deepEqual(result.unsupported, [
    "GF6_product.dbf",
    "GF6_product.shp",
    "GF6_product.shx"
  ]);
});

test("reports duplicate archive candidates instead of choosing silently", () => {
  const result = matchProductArchiveEntries(
    [entry("GF6_tile_01_a.tif"), entry("GF6_tile_01_b.tif")],
    GF6_WFV_L1A_TEMPLATE
  );

  assert.equal(result.matches.length, 0);
  assert.equal(result.conflicts.length, 1);
  assert.equal(result.conflicts[0].slot.id, "mainTiffTile0");
  assert.equal(result.missingRequired.length, 6);
});

test("matches FY-3H observation and GEO1K HDF files by filename markers", () => {
  const result = matchProductArchiveEntries(
    [entry("FY3H_1000M_OBS.hdf"), entry("FY3H_GEO1K.hdf")],
    FY3H_MERSI_TEMPLATE
  );

  assert.deepEqual(
    result.matches.map(match => match.slot.id),
    ["observation", "geo1k"]
  );
  assert.deepEqual(result.missingRequired, []);
});

test("matches HY-2D tar.gz as the single product slot", () => {
  const result = matchProductArchiveEntries(
    [entry("H2D_OPER_IDR_2MC_20260701.tar.gz")],
    HY2D_ALTIMETER_TEMPLATE
  );

  assert.equal(result.matches[0].slot.id, "main");
  assert.deepEqual(result.missingRequired, []);
});

test("matches HY-1C main, metadata, and browse files", () => {
  const result = matchProductArchiveEntries(
    [
      entry("HY1C_product.h5"),
      entry("HY1C_product.xml"),
      entry("HY1C_product.jpg")
    ],
    HY1C_CZI_L2A_TEMPLATE
  );

  assert.deepEqual(
    result.matches.map(match => match.slot.id),
    ["main", "metadata", "browse"]
  );
  assert.deepEqual(result.missingRequired, []);
});

test("matches FY-4B resolution markers and GEO file", () => {
  const result = matchProductArchiveEntries(
    [
      entry("FY4B_FDI_0500M.hdf"),
      entry("FY4B_FDI_1000M.hdf"),
      entry("FY4B_FDI_2000M.hdf"),
      entry("FY4B_FDI_4000M.hdf"),
      entry("FY4B_GEO_4000M.hdf")
    ],
    FY4B_AGRI_TEMPLATE
  );

  assert.deepEqual(
    result.matches.map(match => match.slot.id),
    ["l1_0500m", "l1_1000m", "l1_2000m", "l1_4000m", "geo_4000m"]
  );
  assert.deepEqual(result.missingRequired, []);
});

test("ignores unsupported extra files while reporting required files that are absent", () => {
  const result = matchProductArchiveEntries(
    [entry("README.txt"), entry("FY3H_1000M_OBS.hdf")],
    FY3H_MERSI_TEMPLATE
  );

  assert.deepEqual(result.unsupported, ["README.txt"]);
  assert.deepEqual(result.missingRequired, ["geo1k"]);
});

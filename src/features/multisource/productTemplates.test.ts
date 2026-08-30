import test from "node:test";
import assert from "node:assert/strict";
import {
  FY4B_AGRI_TEMPLATE,
  FY3H_MERSI_TEMPLATE,
  GF6_WFV_L1A_TEMPLATE,
  GF6_WFV_BROWSE_TEMPLATE,
  HY1C_CZI_L2A_TEMPLATE,
  HY2D_ALTIMETER_TEMPLATE,
  PRODUCT_TEMPLATES,
  basenameWithoutExtension,
  validateProductFiles
} from "./productTemplates";

const file = (name: string) => ({ name }) as File;

test("HY-1C L2A template declares its exact package identity and roles", () => {
  assert.equal(HY1C_CZI_L2A_TEMPLATE.id, "hy1c-czi-l2a-v1");
  assert.equal(HY1C_CZI_L2A_TEMPLATE.label, "HY-1C CZI L2A");
  assert.equal(HY1C_CZI_L2A_TEMPLATE.productCode, "HY-1C-CZI");
  assert.equal(HY1C_CZI_L2A_TEMPLATE.profileVersion, "L2A-v1");
  assert.deepEqual(
    HY1C_CZI_L2A_TEMPLATE.slots.map(slot => [slot.role, slot.extensions]),
    [
      ["MAIN", [".h5", ".hdf5"]],
      ["METADATA", [".xml"]],
      ["BROWSE", [".jpg", ".jpeg"]]
    ]
  );
});

test("HY-1C accepts the real package convention with an Rc1 browse suffix", () => {
  const result = validateProductFiles(
    {
      main: file("H1C_OPER_CZI_L2A_20260715T023726.h5"),
      metadata: file("H1C_OPER_CZI_L2A_20260715T023726.xml"),
      browse: file("H1C_OPER_CZI_L2A_20260715T023726_Rc1.jpg")
    },
    HY1C_CZI_L2A_TEMPLATE
  );

  assert.equal(result.valid, true);
  assert.equal(result.mismatchedBasenames, false);
});

test("GF-6 retains its same-basename validation rule", () => {
  const result = validateProductFiles(
    {
      browseImage: file("GF6_product.jpg"),
      georeference: file("different_product.jgw"),
      metadata: file("GF6_product.json")
    },
    GF6_WFV_BROWSE_TEMPLATE
  );

  assert.equal(result.valid, false);
  assert.equal(result.mismatchedBasenames, true);
});

test("FY-3H template declares the exact paired profile and asset roles", () => {
  assert.equal(FY3H_MERSI_TEMPLATE.productCode, "FY-3H-MERSI");
  assert.equal(FY3H_MERSI_TEMPLATE.profileVersion, "L1-1000M-GEO1K-v1");
  assert.deepEqual(
    FY3H_MERSI_TEMPLATE.slots.map(slot => [
      slot.id,
      slot.role,
      slot.extensions
    ]),
    [
      ["observation", "OBSERVATION", [".hdf"]],
      ["geo1k", "GEO1K", [".hdf"]]
    ]
  );
});

test("FY-3H product validation enforces a matching filename pair", () => {
  const valid = validateProductFiles(
    {
      observation: file("FY3H_MERSI_GRAN_L1_20260701_2335_1000M_V0.HDF"),
      geo1k: file("FY3H_MERSI_GRAN_L1_20260701_2335_GEO1K_V0.HDF")
    },
    FY3H_MERSI_TEMPLATE
  );
  const invalid = validateProductFiles(
    {
      observation: file("FY3H_MERSI_GRAN_L1_20260701_2335_1000M_V0.HDF"),
      geo1k: file("FY3H_MERSI_GRAN_L1_20260701_2350_GEO1K_V0.HDF")
    },
    FY3H_MERSI_TEMPLATE
  );

  assert.equal(valid.valid, true);
  assert.equal(invalid.valid, false);
  assert.ok(invalid.productIssues.some(issue => issue.includes("产品时次")));
});

test("HY-2D accepts a single compound tar.gz package extension", () => {
  const result = validateProductFiles(
    { main: file("H2D_OPER_IDR_2MC_0188_0242_20260701.tar.gz") },
    HY2D_ALTIMETER_TEMPLATE
  );

  assert.equal(result.valid, true);
  assert.equal(
    basenameWithoutExtension("H2D_OPER_IDR_2MC_0188_0242_20260701.tar.gz"),
    "H2D_OPER_IDR_2MC_0188_0242_20260701"
  );
});

test("FY-4B template declares its exact profile and five Worker roles", () => {
  assert.equal(FY4B_AGRI_TEMPLATE.productCode, "FY-4B-AGRI");
  assert.equal(FY4B_AGRI_TEMPLATE.profileVersion, "v1");
  assert.deepEqual(
    FY4B_AGRI_TEMPLATE.slots.map(slot => slot.role),
    ["L1_0500M", "L1_1000M", "L1_2000M", "L1_4000M", "GEO_4000M"]
  );
});

test("GF-6 L1A template replaces Browse in the visible product list", () => {
  assert.equal(GF6_WFV_L1A_TEMPLATE.productCode, "GF-6-WFV-L1A");
  assert.equal(GF6_WFV_L1A_TEMPLATE.profileVersion, "v1");
  assert.deepEqual(
    GF6_WFV_L1A_TEMPLATE.slots
      .slice(0, 3)
      .map(slot => [slot.role, slot.ordinal]),
    [
      ["MAIN_TIFF_TILE", 0],
      ["MAIN_TIFF_TILE", 1],
      ["MAIN_TIFF_TILE", 2]
    ]
  );
  assert.equal(PRODUCT_TEMPLATES.includes(GF6_WFV_BROWSE_TEMPLATE), false);
  assert.equal(PRODUCT_TEMPLATES.includes(GF6_WFV_L1A_TEMPLATE), true);
});

test("template validation surfaces the new product-specific package rules", () => {
  const result = validateProductFiles(
    {
      mainTiffTile0: file("GF6_WFV_E114.2_N30.1_20260701_L1A-1.tiff"),
      mainTiffTile1: file("GF6_WFV_E114.2_N30.1_20260701_L1A-2.tiff"),
      mainTiffTile2: file("GF6_WFV_E114.2_N30.1_20260701_L1A-3.tiff"),
      metadataXml: file("GF6_WFV_E114.2_N30.1_20260701_L1A.xml"),
      rpcRpb: file("GF6_WFV_E114.2_N30.1_20260701_L1A-1.rpb"),
      nav: file("GF6_WFV_E114.2_N30.1_20260701_L1A.nav"),
      tileIndexTil: file("GF6_WFV_E114.2_N30.1_20260701_L1A.til")
    },
    GF6_WFV_L1A_TEMPLATE
  );

  assert.equal(result.valid, false);
  assert.ok(result.productIssues.some(issue => issue.includes("主产品 RPB")));
});

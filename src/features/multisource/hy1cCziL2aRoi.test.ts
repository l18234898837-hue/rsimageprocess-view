import test from "node:test";
import assert from "node:assert/strict";
import {
  hy1cFootprintRoiFromXml,
  hy1cRoiStateAfterMetadataChange
} from "./hy1cCziL2aRoi";

const SAMPLE_XML = `
  <ProductMeta>
    <TopLeftLongitude>112.238</TopLeftLongitude>
    <TopLeftLatitude>17.7703</TopLeftLatitude>
    <TopRightLongitude>121.373</TopRightLongitude>
    <TopRightLatitude>15.7997</TopRightLatitude>
    <BottomRightLongitude>120.597</BottomRightLongitude>
    <BottomRightLatitude>12.7049</BottomRightLatitude>
    <BottomLeftLongitude>111.591</BottomLeftLongitude>
    <BottomLeftLatitude>14.6656</BottomLeftLatitude>
  </ProductMeta>
`;

test("HY-1C derives a suggested ROI from product XML corners", () => {
  assert.deepEqual(
    hy1cFootprintRoiFromXml(SAMPLE_XML),
    [111.591, 12.7049, 121.373, 17.7703]
  );
});

test("HY-1C metadata replacement keeps full-swath processing while filling its suggested ROI", () => {
  assert.deepEqual(hy1cRoiStateAfterMetadataChange(SAMPLE_XML), {
    roi: {
      enabled: false,
      minLon: 111.591,
      minLat: 12.7049,
      maxLon: 121.373,
      maxLat: 17.7703
    },
    suggestion: [111.591, 12.7049, 121.373, 17.7703]
  });
});

test("HY-1C clears an old suggested ROI when product XML is incomplete", () => {
  const incomplete = SAMPLE_XML.replace(
    "<BottomLeftLongitude>111.591</BottomLeftLongitude>",
    ""
  );

  assert.deepEqual(hy1cRoiStateAfterMetadataChange(incomplete), {
    roi: { enabled: false },
    suggestion: null
  });
});

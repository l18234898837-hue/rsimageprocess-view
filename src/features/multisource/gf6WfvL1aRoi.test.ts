import test from "node:test";
import assert from "node:assert/strict";
import {
  gf6FootprintRoiFromXml,
  gf6RoiStateAfterMetadataChange
} from "./gf6WfvL1aRoi";

const SAMPLE_XML = `
  <ProductMetaData>
    <CenterLatitude>8.950766</CenterLatitude>
    <CenterLongitude>107.554150</CenterLongitude>
    <TopLeftLatitude>10.753472</TopLeftLatitude>
    <TopLeftLongitude>104.025837</TopLeftLongitude>
    <TopRightLatitude>9.135231</TopRightLatitude>
    <TopRightLongitude>111.724085</TopRightLongitude>
    <BottomRightLatitude>6.670334</BottomRightLatitude>
    <BottomRightLongitude>111.178862</BottomRightLongitude>
    <BottomLeftLatitude>8.286587</BottomLeftLatitude>
    <BottomLeftLongitude>103.524703</BottomLeftLongitude>
  </ProductMetaData>
`;

test("GF-6 derives the ROI draft from the selected product XML footprint", () => {
  assert.deepEqual(
    gf6FootprintRoiFromXml(SAMPLE_XML),
    [103.524703, 6.670334, 111.724085, 10.753472]
  );
});

test("GF-6 metadata replacement clears an old ROI before suggesting the new footprint", () => {
  assert.deepEqual(gf6RoiStateAfterMetadataChange(SAMPLE_XML), {
    enabled: false,
    formRoi: null,
    draft: [103.524703, 6.670334, 111.724085, 10.753472]
  });
});

test("GF-6 does not enable ROI when product XML has incomplete or invalid corners", () => {
  const incomplete = SAMPLE_XML.replace(
    "<BottomLeftLongitude>103.524703</BottomLeftLongitude>",
    ""
  );
  const invalid = SAMPLE_XML.replace(
    "<TopRightLatitude>9.135231</TopRightLatitude>",
    "<TopRightLatitude>95</TopRightLatitude>"
  );

  assert.equal(gf6FootprintRoiFromXml(incomplete), null);
  assert.equal(gf6FootprintRoiFromXml(invalid), null);
});

test("GF-6 accepts abbreviated longitude and latitude corner tags", () => {
  const abbreviated = SAMPLE_XML.replaceAll("Longitude", "Lon").replaceAll(
    "Latitude",
    "Lat"
  );
  assert.deepEqual(
    gf6FootprintRoiFromXml(abbreviated),
    [103.524703, 6.670334, 111.724085, 10.753472]
  );
});

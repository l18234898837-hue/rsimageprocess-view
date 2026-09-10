export type Gf6WfvL1aRoi = [number, number, number, number];

const CORNERS = ["TopLeft", "TopRight", "BottomRight", "BottomLeft"] as const;

function xmlNumber(
  xmlText: string,
  tagNames: readonly string[]
): number | null {
  for (const tagName of tagNames) {
    const escapedTagName = tagName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = new RegExp(
      `<(?:[\\w.-]+:)?${escapedTagName}\\b[^>]*>\\s*([^<]+?)\\s*</(?:[\\w.-]+:)?${escapedTagName}>`,
      "i"
    ).exec(xmlText);
    if (!match) continue;
    const value = Number(match[1]);
    if (Number.isFinite(value)) return value;
  }
  return null;
}

export function gf6FootprintRoiFromXml(xmlText: string): Gf6WfvL1aRoi | null {
  const longitudes = CORNERS.map(corner =>
    xmlNumber(xmlText, [`${corner}Longitude`, `${corner}Lon`])
  );
  const latitudes = CORNERS.map(corner =>
    xmlNumber(xmlText, [`${corner}Latitude`, `${corner}Lat`])
  );
  if (
    longitudes.some(value => value === null || value < -180 || value > 180) ||
    latitudes.some(value => value === null || value < -90 || value > 90)
  ) {
    return null;
  }

  const west = Math.min(...(longitudes as number[]));
  const east = Math.max(...(longitudes as number[]));
  const south = Math.min(...(latitudes as number[]));
  const north = Math.max(...(latitudes as number[]));
  return west < east && south < north ? [west, south, east, north] : null;
}

export function gf6RoiStateAfterMetadataChange(xmlText: string): {
  enabled: false;
  formRoi: null;
  draft: Gf6WfvL1aRoi | null;
} {
  return {
    enabled: false,
    formRoi: null,
    draft: gf6FootprintRoiFromXml(xmlText)
  };
}

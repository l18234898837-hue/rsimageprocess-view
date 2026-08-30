export type Gf6WfvL1aRoi = [number, number, number, number];

const CORNERS = ["TopLeft", "TopRight", "BottomRight", "BottomLeft"] as const;

function xmlNumber(xmlText: string, tagName: string): number | null {
  const escapedTagName = tagName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(
    `<(?:[\\w.-]+:)?${escapedTagName}\\b[^>]*>\\s*([^<]+?)\\s*</(?:[\\w.-]+:)?${escapedTagName}>`,
    "i"
  ).exec(xmlText);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

export function gf6FootprintRoiFromXml(xmlText: string): Gf6WfvL1aRoi | null {
  const longitudes = CORNERS.map(corner =>
    xmlNumber(xmlText, `${corner}Longitude`)
  );
  const latitudes = CORNERS.map(corner =>
    xmlNumber(xmlText, `${corner}Latitude`)
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

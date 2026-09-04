export type Hy1cCziL2aRoi = [number, number, number, number];

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

export function hy1cFootprintRoiFromXml(xmlText: string): Hy1cCziL2aRoi | null {
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

export function hy1cRoiStateAfterMetadataChange(xmlText: string): {
  roi: {
    enabled: false;
    minLon?: number;
    minLat?: number;
    maxLon?: number;
    maxLat?: number;
  };
  suggestion: Hy1cCziL2aRoi | null;
} {
  const suggestion = hy1cFootprintRoiFromXml(xmlText);
  if (!suggestion) {
    return { roi: { enabled: false }, suggestion: null };
  }
  const [minLon, minLat, maxLon, maxLat] = suggestion;
  return {
    roi: { enabled: false, minLon, minLat, maxLon, maxLat },
    suggestion
  };
}

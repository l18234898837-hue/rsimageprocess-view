const IMAGE_PARAMETER_GROUPS = [
  "preprocess",
  "feature-extraction",
  "rgb-fusion",
  "anomaly-detection"
] as const;

const PRODUCT_PARAMETER_GROUPS: Readonly<Record<string, readonly string[]>> = {
  "gf6-wfv-l1a-v1": IMAGE_PARAMETER_GROUPS,
  "fy4b-agri-v1": IMAGE_PARAMETER_GROUPS,
  "hy1c-czi-l2a-v1": IMAGE_PARAMETER_GROUPS,
  "fy3h-mersi-l1-1000m-geo1k-v1": IMAGE_PARAMETER_GROUPS,
  "hy2d-altimeter-v1": [
    "along-track-decode",
    "along-track-feature-extraction",
    "anomaly-detection",
    "track-gridding",
    "map-preview"
  ]
};

const PREPROCESSING_STEPS = new Set([
  "tile-mosaic",
  "rpc-geolocation",
  "projection-standardization",
  "geo-grid-construction",
  "radiometric-calibration",
  "quality-mask",
  "band-metadata-decode",
  "scale-factor-processing",
  "l2-quality-control",
  "data-decode",
  "quality-control",
  "swath-standardization"
]);

/** Returns only user-selected parameter groups supported by the active product. */
export function getVisibleParameterGroups(
  productId: string,
  selectedTargets: readonly string[]
): string[] {
  const supported = new Set(PRODUCT_PARAMETER_GROUPS[productId] ?? []);
  const groups: string[] = [];
  for (const step of [...new Set(selectedTargets)]) {
    const group = PREPROCESSING_STEPS.has(step) ? "preprocess" : step;
    if (!supported.has(group)) continue;
    if (!groups.includes(group)) groups.push(group);
  }
  return groups;
}

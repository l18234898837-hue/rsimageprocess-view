import type {
  ProductFileSlot,
  ProductTemplate,
  SlotId
} from "./productTemplates";

export interface ProductArchiveEntry {
  readonly name: string;
}

export interface ProductArchiveMatch {
  readonly slot: ProductFileSlot;
  readonly entry: ProductArchiveEntry;
}

export interface ProductArchiveConflict {
  readonly slot: ProductFileSlot;
  readonly entries: readonly ProductArchiveEntry[];
}

export interface ProductArchiveMatchResult {
  readonly matches: readonly ProductArchiveMatch[];
  readonly conflicts: readonly ProductArchiveConflict[];
  readonly missingRequired: readonly SlotId[];
  readonly unsupported: readonly string[];
}

function basename(name: string) {
  return name.replace(/\\/g, "/").split("/").pop() ?? name;
}

function extensionMatches(name: string, extensions: readonly string[]) {
  const normalized = basename(name).toLowerCase();
  return extensions.some(extension =>
    normalized.endsWith(extension.toLowerCase())
  );
}

function markerMatches(name: string, slot: ProductFileSlot) {
  const normalized = basename(name).toLowerCase();
  const role = slot.role;
  if (role === "L1_0500M") return /0500m|500m/.test(normalized);
  if (role === "L1_1000M") return /1000m|1km/.test(normalized);
  if (role === "L1_2000M") return /2000m|2km/.test(normalized);
  if (role === "L1_4000M" || role === "GEO_4000M") {
    return (
      /4000m|4km/.test(normalized) &&
      (role === "GEO_4000M" ? /geo/.test(normalized) : !/geo/.test(normalized))
    );
  }
  if (role === "OBSERVATION")
    return /1000m|observation|observ/.test(normalized);
  if (role === "GEO1K") return /geo1k|geo_?1k|geo/.test(normalized);
  if (role === "MAIN_TIFF_TILE") return /tif{1,2}$/.test(normalized);
  if (role === "METADATA_XML") {
    return /xml$/.test(normalized) && !/\.rpb\.aux\.xml$/.test(normalized);
  }
  if (role === "RPC_RPB") {
    // GF-6 packages may contain one RPB per TIFF tile. Only the
    // package-level RPB belongs in the main RPC slot.
    return /rpb$/.test(normalized) && !isTileRpb(normalized);
  }
  if (role === "NAV") return /nav/.test(normalized);
  if (role === "TILE_INDEX_TIL") return /til/.test(normalized);
  return true;
}

function isTileRpb(name: string) {
  return /(?:[-_ ](?:tile|t|part|block)?[-_ ]*0?[1-3])\.rpb$/i.test(name);
}

function tileOrdinal(name: string) {
  const normalized = basename(name).toLowerCase();
  const match = normalized.match(
    /(?:tile|t|part|block)[-_ ]*0?([1-3])(?:\D|$)/
  );
  if (match) return Number(match[1]) - 1;
  const suffix = normalized.match(/[-_ ]0?([1-3])\.tiff?$/);
  return suffix ? Number(suffix[1]) - 1 : undefined;
}

function candidatesForSlot(
  entries: readonly ProductArchiveEntry[],
  slot: ProductFileSlot
) {
  return entries.filter(
    entry =>
      extensionMatches(entry.name, slot.extensions) &&
      markerMatches(entry.name, slot)
  );
}

export function matchProductArchiveEntries(
  entries: readonly ProductArchiveEntry[],
  template: ProductTemplate
): ProductArchiveMatchResult {
  const matches: ProductArchiveMatch[] = [];
  const conflicts: ProductArchiveConflict[] = [];
  const used = new Set<ProductArchiveEntry>();
  const sortedEntries = [...entries].sort((left, right) =>
    left.name.localeCompare(right.name)
  );

  for (const slot of template.slots) {
    let candidates = candidatesForSlot(sortedEntries, slot);
    if (slot.role === "MAIN_TIFF_TILE" && slot.ordinal !== undefined) {
      candidates = candidates.filter(
        entry => tileOrdinal(entry.name) === slot.ordinal
      );
    }
    candidates = candidates.filter(entry => !used.has(entry));
    if (candidates.length === 1) {
      matches.push({ slot, entry: candidates[0] });
      used.add(candidates[0]);
    } else if (candidates.length > 1) {
      conflicts.push({ slot, entries: candidates });
    }
  }

  const unmatchedTiffs = sortedEntries.filter(
    entry =>
      !used.has(entry) &&
      extensionMatches(entry.name, [".tif", ".tiff"]) &&
      template.slots.some(slot => slot.role === "MAIN_TIFF_TILE")
  );
  const unassignedTiffSlots = template.slots.filter(
    slot =>
      slot.role === "MAIN_TIFF_TILE" &&
      !matches.some(match => match.slot.id === slot.id)
  );
  if (
    unmatchedTiffs.length === unassignedTiffSlots.length &&
    unmatchedTiffs.length > 0
  ) {
    unmatchedTiffs.forEach((entry, index) => {
      const slot = unassignedTiffSlots[index];
      if (!slot) return;
      matches.push({ slot, entry });
      used.add(entry);
    });
  }

  return {
    matches,
    conflicts,
    missingRequired: template.slots
      .filter(slot => slot.required)
      .filter(slot => !matches.some(match => match.slot.id === slot.id))
      .filter(slot => !conflicts.some(conflict => conflict.slot.id === slot.id))
      .map(slot => slot.id),
    unsupported: sortedEntries
      .filter(
        entry =>
          !used.has(entry) &&
          !conflicts.some(conflict => conflict.entries.includes(entry))
      )
      .map(entry => entry.name)
  };
}

/** A file role required by a product template. */
export type ProductFileRole = "BROWSE_IMAGE" | "GEOREFERENCE" | "METADATA";

export interface ProductFileSlot {
  readonly id: string;
  readonly label: string;
  readonly role: ProductFileRole;
  readonly extensions: readonly string[];
  readonly required: boolean;
}

export interface ProductTemplate {
  readonly id: string;
  readonly label: string;
  readonly productCode: string;
  readonly profileVersion: string;
  readonly slots: readonly ProductFileSlot[];
  readonly parameterSnapshot: Readonly<{
    schemaVersion: "1";
    operation: "DEFAULT_PROCESS";
  }>;
}

export type ProductFiles = Readonly<Record<string, File | undefined>>;

export interface InvalidProductFile {
  readonly slot: ProductFileSlot;
  readonly fileName: string;
  readonly expectedExtensions: readonly string[];
}

export interface ProductFileValidationResult {
  readonly valid: boolean;
  readonly missingSlots: readonly ProductFileSlot[];
  readonly invalidExtensions: readonly InvalidProductFile[];
  readonly mismatchedBasenames: boolean;
  readonly basenames: readonly string[];
}

export const DEFAULT_PROCESS_SNAPSHOT = Object.freeze({
  schemaVersion: "1" as const,
  operation: "DEFAULT_PROCESS" as const
});

export const GF6_WFV_BROWSE_TEMPLATE: ProductTemplate = Object.freeze({
  id: "gf6-wfv-browse-v1",
  label: "GF-6 WFV 浏览产品",
  productCode: "GF-6-WFV-BROWSE",
  profileVersion: "v1",
  slots: Object.freeze([
    Object.freeze({
      id: "browseImage",
      label: "浏览影像",
      role: "BROWSE_IMAGE" as const,
      extensions: Object.freeze([".jpg", ".jpeg"]),
      required: true
    }),
    Object.freeze({
      id: "georeference",
      label: "地理参考文件",
      role: "GEOREFERENCE" as const,
      extensions: Object.freeze([".jgw"]),
      required: true
    }),
    Object.freeze({
      id: "metadata",
      label: "产品元数据",
      role: "METADATA" as const,
      extensions: Object.freeze([".json"]),
      required: true
    })
  ]),
  parameterSnapshot: DEFAULT_PROCESS_SNAPSHOT
});

/** Returns a file's base name without its final extension. */
export function basenameWithoutExtension(fileName: string): string {
  const normalizedName = fileName.replace(/\\/g, "/").split("/").pop() ?? "";
  return normalizedName.replace(/\.[^.]+$/, "");
}

function fileExtension(fileName: string): string {
  const normalizedName = fileName.replace(/\\/g, "/").split("/").pop() ?? "";
  const extensionIndex = normalizedName.lastIndexOf(".");
  return extensionIndex < 0
    ? ""
    : normalizedName.slice(extensionIndex).toLowerCase();
}

/**
 * Validates the files selected for a product template before any upload starts.
 * The map is keyed by the slot id declared by the template.
 */
export function validateProductFiles(
  files: ProductFiles,
  template: ProductTemplate = GF6_WFV_BROWSE_TEMPLATE
): ProductFileValidationResult {
  const missingSlots = template.slots.filter(
    slot => slot.required && !files[slot.id]
  );
  const invalidExtensions: InvalidProductFile[] = [];
  const basenames: string[] = [];

  for (const slot of template.slots) {
    const file = files[slot.id];
    if (!file) continue;

    const extension = fileExtension(file.name);
    if (
      !slot.extensions.some(expected => expected.toLowerCase() === extension)
    ) {
      invalidExtensions.push({
        slot,
        fileName: file.name,
        expectedExtensions: slot.extensions
      });
    }
    basenames.push(basenameWithoutExtension(file.name));
  }

  const mismatchedBasenames =
    basenames.length > 1 && basenames.some(name => name !== basenames[0]);

  return {
    valid:
      missingSlots.length === 0 &&
      invalidExtensions.length === 0 &&
      !mismatchedBasenames,
    missingSlots,
    invalidExtensions,
    mismatchedBasenames,
    basenames
  };
}

import type { ProcessingIdentifier } from "@/api/multiSourceSatellite";

export interface SelectableTaskHistoryRow {
  taskId: ProcessingIdentifier;
  eligible?: boolean;
}

export interface TaskHistorySelection {
  readonly selectedIds: string[];
  readonly selectedCount: number;
  toggle(row: SelectableTaskHistoryRow): boolean;
  togglePage(rows: SelectableTaskHistoryRow[]): void;
  clear(): void;
  isSelected(taskId: ProcessingIdentifier): boolean;
}

function normalizedTaskId(taskId: ProcessingIdentifier): string | undefined {
  if (typeof taskId === "number" && !Number.isSafeInteger(taskId)) {
    return undefined;
  }
  return String(taskId);
}

function isEligible(row: SelectableTaskHistoryRow): boolean {
  return row.eligible !== false;
}

export function createTaskHistorySelection(): TaskHistorySelection {
  const selected = new Set<string>();

  return {
    get selectedIds() {
      return Array.from(selected);
    },
    get selectedCount() {
      return selected.size;
    },
    toggle(row) {
      if (!isEligible(row)) return false;
      const taskId = normalizedTaskId(row.taskId);
      if (taskId === undefined) return false;
      if (selected.has(taskId)) {
        selected.delete(taskId);
        return false;
      }
      selected.add(taskId);
      return true;
    },
    togglePage(rows) {
      const eligibleRows = rows.filter(
        row => isEligible(row) && normalizedTaskId(row.taskId) !== undefined
      );
      const shouldSelect = eligibleRows.some(
        row => !selected.has(normalizedTaskId(row.taskId)!)
      );
      for (const row of eligibleRows) {
        const taskId = normalizedTaskId(row.taskId)!;
        if (shouldSelect) selected.add(taskId);
        else selected.delete(taskId);
      }
    },
    clear() {
      selected.clear();
    },
    isSelected(taskId) {
      const normalized = normalizedTaskId(taskId);
      return normalized !== undefined && selected.has(normalized);
    }
  };
}

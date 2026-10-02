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

function normalizedTaskId(taskId: ProcessingIdentifier): string {
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
      if (selected.has(taskId)) {
        selected.delete(taskId);
        return false;
      }
      selected.add(taskId);
      return true;
    },
    togglePage(rows) {
      const eligibleRows = rows.filter(isEligible);
      const shouldSelect = eligibleRows.some(
        row => !selected.has(normalizedTaskId(row.taskId))
      );
      for (const row of eligibleRows) {
        const taskId = normalizedTaskId(row.taskId);
        if (shouldSelect) selected.add(taskId);
        else selected.delete(taskId);
      }
    },
    clear() {
      selected.clear();
    },
    isSelected(taskId) {
      return selected.has(normalizedTaskId(taskId));
    }
  };
}

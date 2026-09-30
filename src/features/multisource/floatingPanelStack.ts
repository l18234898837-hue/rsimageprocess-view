import { reactive } from "vue";

export type FloatingPanelId =
  | "task-progress"
  | "artifact-preview"
  | "result-interpretation";

const panelZIndices = reactive<Record<FloatingPanelId, number>>({
  "task-progress": 2200,
  "artifact-preview": 2201,
  "result-interpretation": 2202
});

let highestZIndex = 2202;

export function useFloatingPanelStack() {
  function panelZIndex(panelId: FloatingPanelId) {
    return panelZIndices[panelId];
  }

  function bringToFront(panelId: FloatingPanelId) {
    highestZIndex += 1;
    panelZIndices[panelId] = highestZIndex;
    return highestZIndex;
  }

  return { panelZIndex, bringToFront };
}

import { reactive } from "vue";

export type FloatingPanelId =
  | "task-progress"
  | "task-history"
  | "artifact-preview"
  | "result-interpretation"
  | "message-box";

const panelZIndices = reactive<Record<FloatingPanelId, number>>({
  "task-progress": 2200,
  "task-history": 2201,
  "artifact-preview": 2202,
  "result-interpretation": 2203,
  "message-box": 2204
});

let highestZIndex = 2204;

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

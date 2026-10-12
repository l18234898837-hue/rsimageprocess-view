import { reactive, shallowRef } from "vue";
import type { BandHelpRect } from "./bandHelpPanelGeometry";

export const activeBandHelpOwner = shallowRef<symbol | null>(null);
export const bandHelpPanelLayout = reactive({
  rect: null as BandHelpRect | null,
  splitRatio: 0.32
});

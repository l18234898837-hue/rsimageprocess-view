// 图层管理器
import { defineStore } from "pinia";
import { store } from "@/store";
// import type { Layer } from "@/components/LayerList/layers";
import type { Layer } from "@/components/LayerList/layers";
import map from "@/libs/tdtmap";

export const useLayerStore = defineStore({
  id: "pure-layer",
  state: () => ({
    layerList: [] as Array<Layer>, // 所有的图层
    legendData: {} as any,
    layerIds: [] as Array<any>,
    loadEntitys: [] as Array<any>, // 加载的实体
    layerId: "" as any,
    /** 左侧遥感计算勾选行，用于生成专题图缩略图 */
    remoteThematicRows: [] as Array<{
      id: any;
      name: string;
      thumbUrl?: string;
      productTime?: string;
    }>,
    /** mapLegend.vue 中与界面一致的图例 PNG（data URL） */
    legendImageDataUrl: "" as string
  }),
  actions: {
    setLegendImageDataUrl(url: string) {
      this.legendImageDataUrl = url || "";
    },
    clearAllRemoteThematicRows() {
      this.remoteThematicRows = [];
    },
    setRemoteThematicRows(
      rows: Array<{
        id: any;
        name: string;
        thumbUrl?: string;
        productTime?: string;
      }>
    ) {
      this.remoteThematicRows = rows?.length ? [...rows] : [];
    },
    registerLayer(layer: Layer) {
      const exists = this.layerList.some(item => item.id === layer.id);
      if (!exists) {
        this.layerList.unshift(layer);
      }
    },
    // 获取图层
    async addLayer(layer: Layer) {
      await map.addLayer(layer);
      this.layerList.unshift(layer);
    },
    cleaLoadEntitys() {
      this.loadEntitys.forEach(entity => {
        map.viewer.entities.removeById(entity.id);
      });
      this.loadEntitys = [];
    },
    closeAllLayers() {
      for (let i = 0; i < this.layerList.length; i++) {
        this.layerList[i].show = false;
        map.hideOrShow(this.layerList[i].id, false);
      }
    },
    removeAllLayers() {
      this.layerList.forEach(layer => {
        this.removeLayer(layer);
      });
    },
    showOrHide(layer: Layer) {
      layer.show = !layer.show;
      map.hideOrShow(layer.id, layer.show);
    },
    async removeLayer(layer: Layer) {
      debugger;
      await map.removeLayer(layer.id);
      const index: number = this.layerList.indexOf(layer);
      this.layerList.splice(index, 1);
    },
    dragHandle() {
      //对图层进行重排序
      map.sortLayers(this.layerList);
    },
    clearAllLayers() {
      this.layerList = [];
    }
  }
});

export function useLayerStoreHook() {
  return useLayerStore(store);
}

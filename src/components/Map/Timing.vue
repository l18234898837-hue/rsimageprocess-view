<template>
  <div>
    <LayerTitle v-show="showLayer" :title="showLayer?.name" />
    <div v-if="showTiming" class="map-play">
      <div class="icon">
        <div class="item" @click="itemClick('back')">
          <i class="iconfont icon-xialajiantouxiao" />
        </div>
        <div class="item" @click="itemClick('play')">
          <i v-if="!playing" class="iconfont icon-bofang" />
          <i v-if="playing" class="iconfont icon-zanting" />
        </div>
        <div class="item" @click="itemClick('prev')">
          <i class="iconfont icon-xialajiantouxiao" />
        </div>
      </div>
      <div class="num">{{ showIdx }}/{{ showLayerList.length }}</div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { computed, onMounted, ref, watch } from "vue";
import bus from "@/utils/bus";
import { useLayerStoreHook } from "@/store/modules/layer";
import map from "@/libs/tdtmap";
import LayerTitle from "@/components/Map/LayerTitle.vue";

const layerStore = useLayerStoreHook();
const playing = ref(false);
const showTiming = ref(false);
const showIdx = ref(0);
const showLayerList = computed(() => {
  return layerStore.layerList.filter(layer => layer.show);
});

const showLayer = computed(() => {
  const showList = layerStore.layerList.filter(layer => layer.show);
  if (showList.length > 0) {
    if (showTiming.value) {
      return showList[showIdx.value - 1];
    } else {
      return showList[0];
    }
  }
  return undefined;
});
onMounted(() => {
  bus.on("startTiming", () => {
    showTiming.value = true;
    //默认显示第一个图层
    showIdx.value = 1;
  });
  bus.on("stopTiming", () => {
    map.removeAllLayer();
    map.reAddAllLayer(layerStore.layerList);
    showTiming.value = false;
    showIdx.value = 0;
    if (interval) {
      clearInterval(interval);
      interval = null;
      playing.value = false;
    }
  });
});
const addTimingLayer = () => {
  //首先移除所有的图层
  map.removeAllLayer();
  if (showLayer.value) {
    map.addTimingLayer(showLayer.value.id);
    map.flyTo(showLayer.value.id);
  }
};

watch(
  () => showIdx,
  () => {
    if (showIdx.value >= 1) {
      addTimingLayer();
    }
  },
  { immediate: true, deep: true }
);

let interval = null;
const itemClick = cmd => {
  switch (cmd) {
    case "back":
      if (showIdx.value === 1) {
        showIdx.value = showLayerList.value.length;
      } else {
        showIdx.value -= 1;
      }
      break;
    case "prev":
      if (showIdx.value === showLayerList.value.length) {
        showIdx.value = 1;
      } else {
        showIdx.value += 1;
      }
      break;
    case "play":
      if (playing.value) {
        if (interval) {
          clearInterval(interval);
          interval = null;
        }
      } else {
        interval = setInterval(() => {
          itemClick("prev");
        }, 3000);
      }
      playing.value = !playing.value;
      break;
  }
};
</script>
<style lang="scss" scoped>
.item,
.map-play .icon,
.map-play .num {
  z-index: 1000;
  height: 40px;
  line-height: 40px;
  color: white;
  background: rgb(43 140 250 / 65%);
  border-radius: 4px;
}

.map-play {
  position: absolute;
  bottom: 25px;
  left: calc(50% - 85px);
  display: flex;

  .icon {
    display: flex;
    margin-right: 10px;

    .item {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      text-align: center;
      cursor: pointer;

      .iconfont {
        font-size: 18px;
        color: white;
      }

      &:hover {
        background: rgb(0 0 0 / 30%);
      }

      &:nth-of-type(1) {
        .iconfont {
          transform: rotate(90deg);
        }
      }

      &:nth-of-type(3) {
        .iconfont {
          transform: rotate(-90deg);
        }
      }
    }
  }

  .num {
    width: 40px;
    text-align: center;
  }
}
</style>

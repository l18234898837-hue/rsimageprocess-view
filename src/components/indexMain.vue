<template>
  <div
    class="relative h-[100%] flex-1 flex items-center justify-center overflow-hidden"
  >
    <div
      :class="[
        'panel-main relative flex justify-between',
        'overflow-hidden box-border p-[30px]'
      ]"
    >
      <div class="h-full pointer-events-auto">
        <LeftPanel />
      </div>
      <div class="h-full pointer-events-auto">
        <RightPanel />
      </div>
    </div>

    <div class="main-map box-border">
      <div class="map-con">
        <Map />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Map from "@/components/Map/map.vue";
import LeftPanel from "@/components/LeftPanel/LeftPanel.vue";
import RightPanel from "@/components/RightPanel/RightPanel.vue";
import { useNav } from "@/layout/hooks/useNav";
const { userToken } = useNav();
</script>

<style lang="less" scoped>
.main-map {
  // position: relative;
  // overflow: auto;
  // flex: 1;
  // box-sizing: border-box;
  // padding: 25px;
  // .map-con {
  //   position: relative;
  //   display: flex;
  //   flex-direction: row;
  //   height: 100%;
  //   width: 100%;
  //   // background-color: aqua;
  // }
  position: absolute;
  overflow-y: hidden;
  height: 100%;
  width: 100%;
  border-radius: 10px;
  .map-con {
    display: flex;
    flex-wrap: wrap;
    height: 100%;
  }
  // .panel-main {
  //   // pointer-events: none;
  // }
}
.panel-main {
  // position: absolute;
  // background-color: rgb(231, 228, 228);
  overflow: hidden;
  height: 100%;
  width: 100%;
  border-radius: 10px;
  // z-index: 999;
  pointer-events: none;
  display: flex;
  justify-content: space-between;
}
</style>

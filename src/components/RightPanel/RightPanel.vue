<template>
  <div class="right-panel">
    <Equipment v-if="isEquipment" ref="equipmentRef" />
    <ViewData />
    <ModelParams />
    <RecordResults v-if="isRecordResults" ref="recordResultsRef" />
    <localTable />
    <RightTable />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import Equipment from "./EquipmentDetail.vue";
import ViewData from "./ViewData.vue";
import RecordResults from "./RecordResults.vue";
import ModelParams from "./ModelParams.vue";
import localTable from "./localTable/index.vue";
import RightTable from "./rightTable.vue";
const equipmentRef = ref();
const recordResultsRef = ref();

const isEquipment = ref(true);
const isRecordResults = ref(true);
</script>

<style lang="scss" scoped>
::-webkit-scrollbar {
  display: none;
}

.right-panel {
  position: relative;
  // left: calc(100vw - 490px);
  z-index: 999;
  display: flex;
  flex-direction: column;
  // flex: 1;
  width: 20vw;
  // max-height: 750px;
  // max-height: 800px;
  // margin: 30px;
  overflow-y: auto;
  // border: 2px solid #008ada;
  color: #fff;
  // background: rgb(255 255 255 / 80%);
  border-radius: 5px;
}
</style>

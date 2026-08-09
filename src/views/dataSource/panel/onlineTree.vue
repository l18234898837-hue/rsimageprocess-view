<script setup lang="ts">
import { ref } from "vue";

import { getSentinelList, getStUsgsInfo } from "@/api/dataSource/panel/online";

const dialogTableVisible = ref(false);
const treeData = ref([]);
const dialogTitle = ref();

const emit = defineEmits(["handleTreeChange", "handleTreeClose"]);

const showTreeDialog = val => {
  dialogTableVisible.value = val;
};

const setData = async (data, showVal) => {
  showTreeDialog(showVal);
  console.log(data);
  if (data == "Sentinel") {
    const res = await getSentinelList();
    dialogTitle.value = res.data[0].name;
    treeData.value = res.data.slice(1);
    treeData.value.forEach(item => {
      item.checked = false;
    });
  } else {
    const res = await getStUsgsInfo();
    dialogTitle.value = res.data[0].name;
    treeData.value = res.data.slice(1);
    treeData.value.forEach(item => {
      item.checked = false;
    });
  }
};

const handleChange = val => {
  console.log(val);
  treeData.value.forEach(item => {
    if (val.id != item.id) {
      item.checked = false;
    }
  });
  if (val.checked) {
    emit("handleTreeChange", val);
  }
};

const handleClose = () => {
  showTreeDialog(false);
  emit("handleTreeClose");
};

defineExpose({ setData });
</script>

<template>
  <div>
    <el-dialog
      v-model="dialogTableVisible"
      :title="dialogTitle"
      width="500"
      :before-close="handleClose"
    >
      <div class="max-h-[500px] overflow-auto">
        <div v-for="value in treeData" :key="value.id" :style="{}">
          <el-checkbox
            v-show="true"
            v-model="value.checked"
            style="color: black"
            :label="value.name"
            size="large"
            @change="handleChange(value)"
          />
        </div>
      </div>
      <template #footer
        ><div class="dialog-footer">
          <el-button @click="handleClose">取消</el-button>
          <el-button type="primary" @click="dialogTableVisible = false">
            确定
          </el-button>
        </div></template
      >
    </el-dialog>
  </div>
</template>

<!-- <style lang="scss" scoped></style> -->

<template>
  <el-form
    ref="searchFormRef"
    :inline="true"
    :model="form"
    class="bg-bg_color w-[99/100]"
  >
    <el-form-item label="运行日期" prop="runDate">
      <el-date-picker
        v-model="form.runDate"
        clearable
        class="!w-[100px]"
        type="datetime"
        placeholder="请选择日期"
        value-format="YYYY-MM-DD h:m:s"
        size="small"
      />
    </el-form-item>
    <el-form-item label="运行状态" label-width="50" prop="status">
      <el-select
        v-model="form.status"
        clearable
        class="!w-[100px]"
        placeholder="请选择任务状态"
        size="small"
      >
        <el-option label="未启用" value="0" />
        <el-option label="进行中" value="1" />
      </el-select>
    </el-form-item>
    <el-form-item>
      <el-button size="small" round @click="resetForm(searchFormRef)">
        清空
      </el-button>
      <el-button
        type="primary"
        :loading="loading"
        size="small"
        round
        @click="onSearch"
      >
        搜索
      </el-button>
    </el-form-item>
  </el-form>
  <pure-table
    align-whole="center"
    showOverflowTooltip
    table-layout="auto"
    :loading="loading"
    :size="'small'"
    :data="dataList"
    :columns="columns"
    :pagination="pagination"
    :paginationSmall="true"
    :cell-style="{
      // backgroundColor: 'rgba(4, 44, 103, 0.9)',
      // borderTop: '2px solid rgba(4, 44, 103, 0.9)',
      // borderBottom: '2px solid rgba(4, 44, 103, 0.9)',
      // color: '#fff'
    }"
    :header-cell-style="{
      // backgroundColor: 'rgba(4, 44, 103, 0.9)',
      // borderBottom: '2px solid rgba(4, 44, 103, 0.9)',
      // color: '#fff'
    }"
    @size-change="handleSizeChange"
    @current-change="handleCurrentChange"
  >
    <template #operation="{ row }">
      <el-button
        link
        size="small"
        type="primary"
        :loading="startLoading"
        @click="handleStartBtn(row)"
        >{{ row.status ? "停止" : "启动" }}</el-button
      >
      <el-button
        link
        size="small"
        type="primary"
        @click="bus.emit('toLogTable')"
        >日志</el-button
      >
      <el-button link size="small" type="primary" @click="handleInfoBtn(row)"
        >详情</el-button
      >
      <el-button link size="small" type="primary" @click="handleUpdateBtn(row)"
        >编辑</el-button
      >
      <el-button link size="small" type="primary" @click="delTimer(row.id)"
        >删除</el-button
      >
    </template>
    <template #empty>
      <div />
    </template>
  </pure-table>
</template>
<script setup lang="ts">
import { onMounted, reactive, ref, nextTick } from "vue";
import { PaginationProps } from "@pureadmin/table";
import { message } from "@/utils/message";
import { isNumber } from "@pureadmin/utils";
import bus from "@/utils/bus";

import { getTimerInfoPage, delTimerInfo, updateTimerInfo } from "@/api/stTimer";
import { useUserStoreHook } from "@/store/modules/user";

const userStore: any = useUserStoreHook();
const emit = defineEmits(["handleAddDowloadPlan"]);

const searchFormRef = ref();
const dataList = ref([]);
const loading = ref(true);
const startLoading = ref(false);
const form = reactive({
  userId: userStore.info.userId,
  frequency: undefined,
  runDate: undefined,
  status: undefined,
  type: 1,
  taskType: 2,
  pageNum: undefined,
  pageSize: undefined
});
const pagination = reactive<PaginationProps>({
  total: 0,
  pageSize: 10,
  currentPage: 1,
  background: true,
  small: true
});
const columns: TableColumnList = [
  {
    label: "任务名称",
    prop: "name",
    width: 100
  },
  {
    label: "运行日期",
    prop: "runDate",
    width: 150
  },
  {
    label: "运行时间",
    prop: "runTime",
    width: 100
  },
  {
    label: "运行状态",
    prop: "runStatus",
    width: 100,
    formatter: ({ status }): any => {
      if (status == 0) {
        return "未启用";
      } else if (status == 1) {
        return "进行中";
      }
    }
  },
  {
    label: "操作",
    slot: "operation"
  }
];

const resetForm = formEl => {
  if (!formEl) return;
  formEl.resetFields();
  onSearch();
};

const getDataList = async (type?: number) => {
  loading.value = true;
  type ? (form.type = type) : null;
  form.pageSize = pagination.pageSize;
  form.pageNum = pagination.currentPage;
  const res = await getTimerInfoPage(form);
  dataList.value = res.data.rows;
  pagination.total = res.data.total;
  loading.value = false;
};

bus.on("getDowloadDataList", () => {
  onSearch();
});

const handleUpdateBtn = row => {
  if (row.status) {
    message("当前任务进行中", { type: "warning" });
    return;
  }
  emit("handleAddDowloadPlan", false);
  // setTimeout(() => {
  bus.emit("downloadFormSetData", row);
  // }, 300);
};
const handleInfoBtn = row => {
  emit("handleAddDowloadPlan", false);
  // setTimeout(() => {
  bus.emit("downloadFormSetData", { row, info: true });
  // }, 300);
};

const handleStartBtn = async row => {
  startLoading.value = true;
  await updateTimerInfo({ ...row, status: !row.status ? 1 : 0 }).catch(
    () => (startLoading.value = false)
  );
  onSearch();
  startLoading.value = false;
};

const delTimer = async id => {
  await delTimerInfo(id);
  message("操作成功！", { type: "success" });
  onSearch();
};

const onSearch = () => {
  pagination.currentPage = 1;
  getDataList();
};

const handleSizeChange = (val: number) => {
  if (isNumber(val)) {
    pagination.pageSize = val;
    getDataList();
  }
};

const handleCurrentChange = (val: number) => {
  if (isNumber(val)) {
    pagination.currentPage = val;
    getDataList();
  }
};

onMounted(() => {
  onSearch();
});

defineExpose({
  getDataList
});
</script>
<style lang="scss" scoped>
// :deep(.el-pagination span) {
//   // color: white;
// }

// :deep(.el-pagination.is-background .btn-prev) {
//   // background-color: #38609d;
// }

// :deep(.el-pagination.is-background .btn-next) {
//   // background-color: #38609d;
// }

// :deep(.el-select__wrapper) {
//   // color: white;
//   // background-color: rgb(45 87 142);
//   // box-shadow: none;

//   &:hover {
//     // box-shadow: none;
//   }
// }

// :deep(.el-select__placeholder) {
//   // color: white;
// }

// :deep(.el-table__empty-block) {
//   // background-color: rgb(45 87 142);
//   // border: none;
// }

// :deep(.el-table__inner-wrapper)::before {
//   // display: none;
// }
</style>

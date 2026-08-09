<template>
  <el-form
    ref="searchFormRef"
    :inline="true"
    :model="form"
    class="bg-bg_color w-[99/100]"
  >
    <el-form-item label="算法类型" prop="taskType">
      <el-select
        v-model="form.taskType"
        clearable
        class="!w-[100px]"
        placeholder="请选择类型"
        size="small"
      >
        <el-option label="数据下载" value="1" />
        <el-option label="算法计算" value="2" />
      </el-select>
    </el-form-item>
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
    <el-form-item label="运行状态" prop="taskStatus">
      <el-select
        v-model="form.taskStatus"
        clearable
        class="!w-[100px]"
        placeholder="请选择状态"
        size="small"
      >
        <el-option label="成功" value="1" />
        <el-option label="失败" value="2" />
        <el-option label="运行中" value="3" />
        <el-option label="超时" value="4" />
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
  />
</template>
<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import { PaginationProps } from "@pureadmin/table";
import { message } from "@/utils/message";
import { isNumber } from "@pureadmin/utils";

import { getTimerLogPage, addTimerInfo } from "@/api/stTimer";
import { useUserStoreHook } from "@/store/modules/user";

const userStore: any = useUserStoreHook();

const searchFormRef = ref();
const dataList = ref([]);
const loading = ref(true);
const form = reactive({
  userId: userStore.info.userId,
  taskType: undefined,
  runDate: undefined,
  taskStatus: undefined,
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
    label: "序号",
    width: 50,
    formatter: (row, column, cellValue, index): any => {
      return index + 1;
    }
  },
  {
    label: "任务类型",
    prop: "taskType",
    width: 100,
    formatter: ({ taskType }): any => {
      if (taskType == 2) {
        return "算法计算";
      } else if (taskType == 1) {
        return "数据下载";
      } else {
        return "其他";
      }
    }
  },
  {
    label: "任务名称",
    prop: "taskName",
    width: 100
  },
  {
    label: "运行时间",
    prop: "runTime",
    width: 150
  },
  {
    label: "运行时长",
    prop: "runDuration",
    width: 100,
    formatter: ({ runDuration }): any => {
      return (runDuration / 60).toFixed(0) + " min";
    }
  },
  {
    label: "运行状态",
    prop: "runStatus",
    width: 100,
    formatter: ({ runStatus }): any => {
      if (runStatus == 1) {
        return "成功";
      } else if (runStatus == 2) {
        return "失败";
      } else if (runStatus == 3) {
        return "运行中";
      } else if (runStatus == 4) {
        return "超时";
      }
    }
  },
  {
    label: "错误信息",
    prop: "errorInfo",
    // width: 100,
    formatter: (row): any => {
      if (!row.errorInfo) {
        return "-";
      }
      return row.errorInfo;
    }
  }
];

const resetForm = formEl => {
  if (!formEl) return;
  formEl.resetFields();
  onSearch();
};

const getDataList = async () => {
  form.pageSize = pagination.pageSize;
  form.pageNum = pagination.currentPage;
  const res = await getTimerLogPage(form);
  dataList.value = res.data.rows;
  pagination.total = res.data.total;
  loading.value = false;
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

//   // &:hover {
//   //   box-shadow: none;
//   // }
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

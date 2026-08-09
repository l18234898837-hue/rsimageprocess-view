<template>
  <pure-table
    align-whole="center"
    show-overflow-tooltip
    :columns="columns"
    :data="dataList"
    size="small"
    :border="false"
    row-key="id"
    height="15vw"
    :cell-style="{
      border: '4px solid #fff',
      borderLeft: 'none',
      borderRight: 'none',
      borderBottom: 'none'
    }"
    :row-style="{
      background:
        'linear-gradient(90deg, #c7e6ff 0%, rgb(199 230 255 / 0%) 100%)'
    }"
    :header-cell-style="{
      backgroundColor: 'rgba(214, 236, 254)'
    }"
    :paginationSmall="true"
    :pagination="pagination"
    @page-size-change="handleSizeChange"
    @page-current-change="handleCurrentChange"
  >
    <template #applyStatus="{ row }">
      <span v-if="row.applyStatus == '1'" class="text-blue-500">审核中</span>
      <span v-else-if="row.applyStatus == '2'" class="text-green-500"
        >已通过</span
      >
      <span v-else-if="row.applyStatus == '3'" class="text-red-500"
        >已驳回</span
      >
      <span v-else>未知</span>
    </template>
  </pure-table>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from "vue";
import { useUserStoreHook } from "@/store/modules/user";
import { PaginationProps } from "@pureadmin/table";
import { getStCalculationResultApplyLogPage } from "@/api/user";

const userStore: any = useUserStoreHook();

const dataList = ref([]);
const loading = ref(false);
const pagination = reactive<PaginationProps>({
  currentPage: 1,
  pageSize: 10,
  total: 0,
  background: true
});
const columns = [
  {
    label: "数据名称",
    prop: "dataName",
    align: "left"
  },
  {
    label: "数据格式",
    prop: "dataType"
    // width: "50px"
  },
  {
    label: "卫星",
    prop: "satelliteSensor"
  },
  {
    label: "数据级别",
    prop: "dataLevel",
    align: "center"
  },
  {
    label: "区域",
    prop: "region",
    align: "center"
  },
  {
    label: "申请时间",
    prop: "createTime",
    align: "center"
  },
  {
    label: "申请状态",
    prop: "applyStatus",
    align: "center",
    slot: "applyStatus"
  }
];
const getCalculationResultApplyLogPage = async () => {
  await getStCalculationResultApplyLogPage({
    pageNum: pagination.currentPage,
    pageSize: pagination.pageSize,
    userId: userStore.info.userId
  }).then((res: any) => {
    dataList.value = res.data.rows;
    pagination.total = res.data.total;
  });
};

const handleSizeChange = async (val: number) => {
  pagination.pageSize = val;
  await getCalculationResultApplyLogPage();
};

const handleCurrentChange = async (val: number) => {
  pagination.currentPage = val;
  await getCalculationResultApplyLogPage();
};

onMounted(() => {
  getCalculationResultApplyLogPage();
});
</script>

<style lang="scss" scoped>
:deep(.el-table) {
  // padding: 10px 0;
  background: rgb(4 44 103 / 0%);
  // margin-bottom: 20px;
}

:deep(.el-table__inner-wrapper::before) {
  height: 0;
}
</style>

<template>
  <pure-table
    ref="tableRef"
    align-whole="center"
    showOverflowTooltip
    table-layout="auto"
    :border="border"
    :loading="loading"
    :height="height"
    :size="size"
    :data="data"
    :columns="columns"
    :pagination="pagination"
    :paginationSmall="paginationSmall"
    :row-key="rowKey"
    :highlight-current-row="highlightCurrentRow"
    :cell-style="cellStyle"
    :header-cell-style="headerCellStyle"
    @size-change="emit('size-change', $event)"
    @current-change="emit('current-change', $event)"
    @selection-change="emit('selection-change', $event)"
  >
    <template v-for="(_, name) in $slots" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}" />
    </template>
  </pure-table>
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { PaginationProps } from "@pureadmin/table";

withDefaults(
  defineProps<{
    columns: TableColumnList;
    data?: any[];
    loading?: boolean;
    height?: string | number;
    size?: "" | "large" | "default" | "small";
    border?: boolean;
    pagination?: PaginationProps;
    paginationSmall?: boolean;
    rowKey?: string | ((row: any) => string);
    highlightCurrentRow?: boolean;
    cellStyle?: Record<string, any> | ((...args: any[]) => any);
    headerCellStyle?: Record<string, any> | ((...args: any[]) => any);
  }>(),
  {
    data: () => [],
    loading: false,
    size: "small",
    border: false,
    paginationSmall: true,
    highlightCurrentRow: false,
    cellStyle: () => ({}),
    headerCellStyle: () => ({})
  }
);

const emit = defineEmits<{
  "size-change": [val: number];
  "current-change": [val: number];
  "selection-change": [selection: any[]];
}>();

const tableRef = ref();

/** 获取底层 el-table 实例 */
const getTableRef = () => tableRef.value?.getTableRef?.() ?? tableRef.value;

defineExpose({
  getTableRef,
  clearSelection: (...args: any[]) => getTableRef()?.clearSelection?.(...args),
  toggleRowSelection: (...args: any[]) =>
    getTableRef()?.toggleRowSelection?.(...args)
});
</script>

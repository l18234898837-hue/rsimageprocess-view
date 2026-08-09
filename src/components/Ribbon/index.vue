<template>
  <el-dialog
    v-model="showDialog"
    title=""
    width="1000px"
    :before-close="handleClose"
  >
    <pure-table
      ref="ribbonTableRef"
      border
      align-whole="center"
      showOverflowTooltip
      height="400px"
      :loading="loading"
      :size="size"
      :data="dataList"
      :columns="columns"
      :pagination="pagination"
      :paginationSmall="size === 'small'"
      :row-style="{
        background:
          'linear-gradient(90deg, #c7e6ff 0%, rgb(199 230 255 / 0%) 100%)'
      }"
      :header-cell-style="{
        backgroundColor: 'rgba(214, 236, 254)'
      }"
      row-key="dictId"
      @page-size-change="handleSizeChange"
      @page-current-change="handleCurrentChange"
      @selection-change="handleSelectionChange"
      @select="handleRowSelect"
      @select-all="handleSelectAll"
    >
      <template #colorRamp="{ row }">
        <div class="color-ramp-container">
          <!-- 渐变色条 -->
          <div
            class="gradient-bar"
            :style="{ background: getGradientBackground(row.colorRamp) }"
          />
        </div>
      </template>
      <template #operation="{ row }">
        <el-button @click="handleEdit(row)">编辑</el-button>
      </template>
    </pure-table>

    <!-- 确认选择色带按钮 靠右-->
    <div class="mb-2">
      <el-button type="primary" @click="handleConfirm">确认选择</el-button>
    </div>
  </el-dialog>
  <Form ref="formRef" @reload="getList" />
</template>

<script setup lang="ts">
import { nextTick, onMounted, reactive, ref } from "vue";
import { useDict } from "@/utils/useDict";
import { PaginationProps } from "@pureadmin/table";
import bus from "@/utils/bus";
import Form from "./form.vue";
import { pageSysColorRamp } from "@/api/ribbon";

defineOptions({
  name: "Ribbon"
});

let showDialog = ref(false);
const size = ref<"default" | "small" | "large">("default");
const handleClose = (done: () => void) => {
  done();
};

// const dataIndexRef = ref();
const dataList = ref([]);
const loading = ref(true);
const ribbonTableRef = ref<{ getTableRef: () => any } | null>(null);
/** 单选：当前选中的色带行，最多一条 */
const selectedRow = ref<Record<string, unknown> | null>(null);

const getElTable = () => ribbonTableRef.value?.getTableRef?.();

const pagination = reactive<PaginationProps>({
  total: 0,
  pageSize: 10,
  currentPage: 1,
  background: true
});

const form = reactive({
  name: "",
  pageNum: pagination.currentPage,
  pageSize: pagination.pageSize
});
const columns: TableColumnList = [
  {
    type: "selection",
    align: "center",
    width: 48
  },
  {
    label: "序号",
    type: "index",
    minWidth: 80
  },
  {
    label: "色带名称",
    prop: "name",
    minWidth: 180
  },
  {
    label: "最大值",
    prop: "maxValue",
    minWidth: 80
  },
  {
    label: "最小值",
    prop: "minValue",
    minWidth: 130
  },
  {
    label: "色带范围",
    prop: "colorRamp",
    slot: "colorRamp",
    minWidth: 100
  },
  {
    label: "操作",
    prop: "operation",
    slot: "operation",
    minWidth: 100
  }
];

const handleSizeChange = (val: number) => {
  // console.log(`${val} items per page`);
  pagination.pageSize = val;
  form.pageSize = pagination.pageSize;
  getList();
};

const handleCurrentChange = (val: number) => {
  // console.log(`current page: ${val}`);
  pagination.currentPage = val;
  form.pageNum = pagination.currentPage;
  getList();
};

const rowKeyEq = (a: any, b: any) =>
  a === b || (a?.dictId != null && b?.dictId != null && a.dictId === b.dictId);

const handleSelectionChange = (rows: any[]) => {
  if (rows.length <= 1) {
    selectedRow.value = rows[0] ?? null;
  }
};
let formRef = ref();
const handleEdit = (row: any) => {
  formRef.value.formDialog = true;
  formRef.value.setData(row);
};
const handleRowSelect = (selection: any[], row: any) => {
  const table = getElTable();
  if (!table) return;
  const keep = selection.some(r => rowKeyEq(r, row));
  nextTick(() => {
    table.clearSelection();
    if (keep) {
      table.toggleRowSelection(row, true);
      selectedRow.value = row;
    } else {
      selectedRow.value = null;
    }
  });
};

const handleSelectAll = () => {
  const table = getElTable();
  nextTick(() => {
    table?.clearSelection();
    selectedRow.value = null;
  });
};

const getList = async () => {
  loading.value = true;
  const { rows, total } = await pageSysColorRamp(form);
  dataList.value = rows;
  pagination.total = total;
  loading.value = false;
  nextTick(() => {
    getElTable()?.clearSelection();
    selectedRow.value = null;
  });
};

const parseColorRamp = colorRampStr => {
  try {
    // 方法1：如果是字符串，解析JSON
    if (typeof colorRampStr === "string") {
      const colors = JSON.parse(colorRampStr);
      return colors.map(color => {
        // 转换为rgb颜色
        if (color.length === 3) {
          return `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
        } else if (color.length === 2) {
          // 灰度值 [128, 0] 可能是 [灰度, 透明度?]
          return `rgb(${color[0]}, ${color[0]}, ${color[0]})`;
        }
        return "#ccc";
      });
    }
    return [];
  } catch (error) {
    console.error("解析色带失败", error);
    return [];
  }
};

const getGradientBackground = colorRampStr => {
  const colors = parseColorRamp(colorRampStr);
  if (colors.length === 0) return "linear-gradient(90deg, #ccc, #ccc)";

  // 计算每个颜色的位置
  const stops = colors
    .map((color, index, arr) => {
      const position = (index / (arr.length - 1)) * 100;
      return `${color} ${position}%`;
    })
    .join(", ");

  return `linear-gradient(90deg, ${stops})`;
};
onMounted(() => {
  getList();
});

const emit = defineEmits(["confirmColorRamp"]);
const handleConfirm = () => {
  // console.log(selectedRow.value);
  // 向外导出当前的色带id
  emit("confirmColorRamp", selectedRow.value.id);
  // 传入色带
  bus.emit("updateLegend", selectedRow.value);
  // 清空选择
  handleSelectAll();

  showDialog.value = false;
};
defineExpose({ showDialog, selectedRow });
</script>
<style scoped>
/* 单选：隐藏表头全选框，避免误触多选 */
:deep(.el-table__header-wrapper .el-table-column--selection .el-checkbox) {
  visibility: hidden;
  pointer-events: none;
}
:deep(.el-dialog) {
  height: 400px !important;
}

.color-ramp-container {
  position: relative;
  padding: 10px 0;
}

.gradient-bar {
  height: 10px;
  border-radius: 6px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
</style>
<style>
:deep(.el-dialog) {
  height: 100px !important;
}
</style>

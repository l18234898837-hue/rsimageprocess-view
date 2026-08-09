<template>
  <!-- 点击收起面板 -->
  <div class="flex items-center w-full mb-5 mt-3">
    <div
      :class="[
        'border-[2px] border-[rgba(210,210,212,0.8)]',
        'rounded h-[20px] mr-[5px]'
      ]"
    />
    <div :class="['text-[13px] mr-[10px] text-center']">分析计算</div>
  </div>
  <el-form
    ref="formRef"
    :model="form"
    label-width="auto"
    style="max-width: 600px"
    :rules="rules"
    :validate-on-rule-change="false"
  >
    <el-form-item label="分析类型" prop="analysisType">
      <el-tree-select
        v-model="form.analysisType"
        class="run-file-tree-select"
        :data="algorithmLibraryTree"
        :show-checkbox="false"
        :multiple="false"
        check-strictly
        node-key="value"
        clearable
        filterable
        placeholder="请选择分析类型"
        :props="{
          children: 'children',
          label: 'label',
          value: 'value',
          disabled: 'disabled'
        }"
        @change="onAlgorithmLibraryChange"
      />
    </el-form-item>
    <el-form-item v-if="variableParamList.length" label="">
      <div class="variable-param-list">
        <div
          v-for="item in variableParamList"
          :key="item.key"
          class="variable-param-row"
        >
          <el-checkbox v-model="item.checked" />
          <span class="variable-param-key">{{ item.key }}</span>
          <el-input
            v-model="item.value"
            clearable
            class="variable-param-input"
          />
          <el-dropdown
            trigger="click"
            placement="bottom-end"
            popper-class="param-source-popper"
          >
            <el-button class="variable-param-btn">...</el-button>
            <template #dropdown>
              <div class="param-source-menu">
                <el-dropdown
                  trigger="hover"
                  placement="right-start"
                  @command="cmd => onParamPathCommand(item, 'input', cmd)"
                >
                  <div class="param-source-item">输入文件</div>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="folder"
                        >文件夹</el-dropdown-item
                      >
                      <el-dropdown-item command="file">文件</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
                <el-dropdown
                  trigger="hover"
                  placement="right-start"
                  @command="cmd => onParamPathCommand(item, 'output', cmd)"
                >
                  <div class="param-source-item">输出文件</div>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="folder"
                        >文件夹</el-dropdown-item
                      >
                      <el-dropdown-item command="file">文件</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </template>
          </el-dropdown>
        </div>
      </div>
    </el-form-item>
  </el-form>
  <div class="mt-10 flex justify-end">
    <el-button type="primary" @click="onRun">开始计算</el-button>
  </div>

  <div class="border-t border-gray-300 my-4" />
  <div class="flex items-center w-full mb-5 mt-3">
    <div
      :class="[
        'border-[2px] border-[rgba(210,210,212,0.8)]',
        'rounded h-[20px] mr-[5px]'
      ]"
    />
    <div :class="['text-[13px] mr-[10px] text-center']">查看结果</div>
  </div>
  <el-form
    ref="formRef1"
    :model="form1"
    label-width="auto"
    style="max-width: 600px"
    :rules="rules1"
    :validate-on-rule-change="false"
  >
    <el-form-item label="分析类型" prop="analysisType">
      <el-tree-select
        v-model="form1.analysisType"
        class="run-file-tree-select"
        :data="algorithmLibraryTree"
        :show-checkbox="false"
        :multiple="false"
        check-strictly
        node-key="value"
        clearable
        filterable
        placeholder="请选择分析类型"
        :props="{
          children: 'children',
          label: 'label',
          value: 'value',
          disabled: 'disabled'
        }"
        @change="onAnalysisTypeChange2"
      />
    </el-form-item>
  </el-form>
  <div class="mt-10 flex justify-end">
    <el-button type="primary" @click="handleAlgorithmRunRecord">
      获取计算记录
    </el-button>
    <el-button type="primary" @click="onViewResult">获取结果</el-button>
  </div>

  <el-dialog
    v-model="paramFileTableVisible"
    title="选择文件"
    width="640px"
    append-to-body
    destroy-on-close
  >
    <CommonTable
      ref="paramFileTableRef"
      border
      height="360"
      row-key="absolutePath"
      highlight-current-row
      :data="paramFileRows"
      :columns="paramFileColumns"
      @selection-change="onParamFileSelectionChange"
    />
    <template #footer>
      <el-button @click="paramFileTableVisible = false">取消</el-button>
      <el-button type="primary" @click="onConfirmParamFile">确定</el-button>
    </template>
  </el-dialog>
  <el-dialog
    v-model="alReVisible"
    title="计算记录"
    width="1000px"
    append-to-body
    destroy-on-close
  >
    <CommonTable
      :loading="alLoading"
      height="360px"
      :data="runRecordRows"
      :columns="columns"
      :pagination="pagination"
      @size-change="handleSizeChange"
      @current-change="handleCurrentChange"
    >
      <template #operation="{ row }">
        <el-button link type="primary" size="small" @click="handleViewLog(row)">
          查看日志
        </el-button>
      </template>
    </CommonTable>
  </el-dialog>
  <el-dialog
    v-model="logVisible"
    title="算法日志"
    width="800px"
    append-to-body
    destroy-on-close
  >
    <pre class="algorithm-log-content">{{ logContent }}</pre>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, nextTick } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import { message } from "@/utils/message";
import { isNumber } from "@pureadmin/utils";
import type { PaginationProps } from "@pureadmin/table";
import bus from "@/utils/bus";
import CommonTable from "./table.vue";
import {
  getAlgorithmLibraryTree,
  getAlgorithmFileInput,
  getAlgorithmFileOutput,
  runAlgorithm,
  getAlgorithmRunRecord,
  getScanFolder
} from "@/api/starAnalysis";

type VariableParamItem = {
  key: string;
  checked: boolean;
  value: string;
};
type ParamSourceType = "input" | "output";

const formRef = ref<FormInstance>();
const formRef1 = ref<FormInstance>();
const form = ref({ analysisType: "" });
const form1 = ref({ analysisType: "" });

const rules = computed<FormRules>(() => ({
  analysisType: [{ required: true, message: "请选择分析类型", trigger: [] }]
}));
const rules1 = computed<FormRules>(() => ({
  analysisType: [{ required: true, message: "请选择分析类型", trigger: [] }]
}));

const algorithmLibraryTree = ref([]);
const selectedAlgorithmFile = ref(null);
const selectedAlgorithmFile1 = ref(null);
const resultType = ref("");
const variableParamList = ref<VariableParamItem[]>([]);

const currentVariableParam = ref<VariableParamItem>(null);
const paramFileTableVisible = ref(false);
const paramFileRows = ref([]);
const paramFileSelectedPath = ref("");
const paramFileTableRef = ref();

const runRecordRows = ref([]);
const alLoading = ref(false);
const alReVisible = ref(false);
const logVisible = ref(false);
const logContent = ref("");
const pagination = reactive<PaginationProps>({
  total: 0,
  pageSize: 10,
  currentPage: 1,
  background: true,
  small: true
});

const columns: TableColumnList = [
  { label: "开始时间", prop: "startTime" },
  { label: "结束时间", prop: "endTime" },
  { label: "运行状态", prop: "runStatus" },
  {
    label: "运行总时间",
    prop: "runDuration",
    formatter: (row: any) => row.runDuration / 1000 + "秒"
  },
  { label: "操作", slot: "operation" }
];

/** type 为 0 的文件夹禁选 */
const isParamFileSelectable = row => row.type !== 0;

const paramFileColumns: TableColumnList = [
  {
    type: "selection",
    width: 48,
    align: "center",
    selectable: isParamFileSelectable
  },
  { prop: "fileName", label: "名称", align: "left" }
];

/** 构建算法库树 */
const buildAlgorithmLibraryTree = (list: any) => {
  if (!Array.isArray(list)) return [];
  return list.map((item: any) => ({
    label: item.sdAlgorithmLibrary?.libraryName,
    value: item.sdAlgorithmLibrary?.id,
    disabled: true,
    children: (item.sdAlgorithmFiles || []).map((file: any) => ({
      label: file.algorithmName,
      value: file.id,
      sdAlgorithmFile: file
    }))
  }));
};

/** 按 value 查找节点 */
const findTreeNode = (nodes: any[], value: string): any => {
  for (const node of nodes) {
    if (node.value === value) return node;
    const found = node.children && findTreeNode(node.children, value);
    if (found) return found;
  }
};

/** 解析可变参数 */
const buildVariableParamList = (
  variableParams?: string
): VariableParamItem[] => {
  if (!variableParams) return [];
  return variableParams
    .split(",")
    .map(item => item.trim())
    .filter(Boolean)
    .map(key => ({ key, checked: false, value: "" }));
};

/** 写入参数值 */
const setParamValue = (item: VariableParamItem, text: string) => {
  item.value = String(text ?? "").trim();
};

/** 展平文件节点为表格行 */
const flattenAlgoFileRows = nodes => {
  if (!Array.isArray(nodes)) return [];
  const rows = [];
  nodes.forEach(node => {
    rows.push(node);
    if (Array.isArray(node?.children)) {
      rows.push(...flattenAlgoFileRows(node.children));
    }
  });
  return rows;
};

/** 从接口 data 取表格行 */
const buildAlgoFileRows = data => {
  if (Array.isArray(data)) return flattenAlgoFileRows(data);
  const root = data;
  if (Array.isArray(root?.children)) return flattenAlgoFileRows(root.children);
  return [];
};

/** 写入文件夹路径 */
const applyFolderPath = (item: VariableParamItem, source: ParamSourceType) => {
  const file = selectedAlgorithmFile.value;
  if (!file) return;
  const folder = source === "input" ? file.inputFolder : file.outputFolder;
  setParamValue(item, folder || "");
};

/** 打开文件选择表格 */
const openAlgoFileTable = (source: ParamSourceType) => {
  const file = selectedAlgorithmFile.value;
  if (!file) return;
  const request =
    source === "input" ? getAlgorithmFileInput : getAlgorithmFileOutput;
  // getScanFolder().then(res => {
  request(file.id).then(res => {
    paramFileRows.value = buildAlgoFileRows(res?.data);
    paramFileSelectedPath.value = "";
    paramFileTableVisible.value = true;
  });
};

/** 二级：文件夹 / 文件 */
const onParamPathCommand = (
  item: VariableParamItem,
  source: ParamSourceType,
  command: string
) => {
  currentVariableParam.value = item;
  if (command === "folder") {
    applyFolderPath(item, source);
    return;
  }
  if (command === "file") {
    openAlgoFileTable(source);
  }
};

/** 文件表格单选 */
const onParamFileSelectionChange = selection => {
  const table = paramFileTableRef.value;
  if (selection.length > 1 && table) {
    const latest = selection[selection.length - 1];
    paramFileSelectedPath.value = String(latest?.absolutePath ?? "");
    nextTick(() => {
      table.clearSelection();
      table.toggleRowSelection(latest, true);
    });
    return;
  }
  paramFileSelectedPath.value = String(selection[0]?.absolutePath ?? "");
};

/** 确认选择文件 */
const onConfirmParamFile = () => {
  const item = currentVariableParam.value;
  if (!item || !paramFileSelectedPath.value) return;
  setParamValue(item, paramFileSelectedPath.value);
  paramFileTableVisible.value = false;
};

/** 选中算法文件 */
const onAlgorithmLibraryChange = (value: string) => {
  selectedAlgorithmFile.value = findTreeNode(
    algorithmLibraryTree.value,
    value
  )?.sdAlgorithmFile;
  variableParamList.value = buildVariableParamList(
    selectedAlgorithmFile.value?.variableParams
  );
};

/** 查看结果类型改变 */
const onAnalysisTypeChange2 = (value: string) => {
  selectedAlgorithmFile1.value = findTreeNode(
    algorithmLibraryTree.value,
    value
  )?.sdAlgorithmFile;
  resultType.value = value;
};

/** 开始计算 */
const onRun = () => {
  formRef.value?.validate(valid => {
    if (!valid) return;
    if (!selectedAlgorithmFile.value) {
      message("请选择分析类型", { type: "warning" });
      return;
    }
    const checkedParams = variableParamList.value.filter(item => item.checked);
    const params = checkedParams.length
      ? checkedParams.map(item => `${item.key} ${item.value}`).join(" ")
      : "";
    runAlgorithm({
      params: params,
      sdAlgorithmFileVo: selectedAlgorithmFile.value
    }).then(() => {
      message("计算成功", { type: "success" });
    });
  });
};

/** 发射结果 */
const emitAnalysisResult = (title: string, data: any) => {
  bus.emit("legendRightWidth", true);
  bus.emit("StarAnalysisResult", { show: true, title, data });
};

/** 查看结果 */
const onViewResult = () => {
  formRef1.value?.validate(valid => {
    if (!valid) return;
    // getScanFolder()
    getAlgorithmFileOutput(resultType.value).then(res => {
      emitAnalysisResult(selectedAlgorithmFile1.value.algorithmName, res?.data);
    });
  });
};

/** 拉取计算记录列表 */
const getAlgorithmRunRecordList = () => {
  alLoading.value = true;
  getAlgorithmRunRecord(resultType.value, {
    pageNum: pagination.currentPage,
    pageSize: pagination.pageSize
  }).then(res => {
    let { rows, total } = res.data;
    runRecordRows.value = rows;
    pagination.total = total;
    alReVisible.value = true;
    alLoading.value = false;
  });
};

const handleSizeChange = (val: number) => {
  if (isNumber(val)) {
    pagination.pageSize = val;
    getAlgorithmRunRecordList();
  }
};

const handleCurrentChange = (val: number) => {
  if (isNumber(val)) {
    pagination.currentPage = val;
    getAlgorithmRunRecordList();
  }
};

/** 获取计算记录 */
const handleAlgorithmRunRecord = () => {
  formRef1.value?.validate(valid => {
    if (!valid) return;
    pagination.currentPage = 1;
    getAlgorithmRunRecordList();
  });
};

/** 查看算法日志 */
const handleViewLog = (row: any) => {
  logContent.value = row?.log || "暂无日志";
  logVisible.value = true;
};

const loadAlgorithmLibraryTree = () => {
  getAlgorithmLibraryTree().then(res => {
    algorithmLibraryTree.value = buildAlgorithmLibraryTree(res?.data);
  });
};

onMounted(() => {
  loadAlgorithmLibraryTree();
  bus.on("clearForm", () => {
    selectedAlgorithmFile.value = null;
    selectedAlgorithmFile1.value = null;
    variableParamList.value = [];
    resultType.value = "";
    form.value = { analysisType: "" };
    form1.value = { analysisType: "" };
    nextTick(() => {
      formRef.value?.clearValidate();
      formRef1.value?.clearValidate();
    });
  });
});
</script>

<style lang="less" scoped>
::-webkit-scrollbar {
  display: none;
}
:deep(.el-checkbox__inner) {
  background-color: rgba(255, 255, 255);
}
.variable-param-list {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.variable-param-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}
.variable-param-key {
  min-width: 28px;
  flex-shrink: 0;
  font-size: 13px;
  color: #545353;
}
.variable-param-input {
  flex: 1;
  min-width: 0;
}
.variable-param-btn {
  flex-shrink: 0;
  padding: 0 10px;
  min-width: 36px;
}
.run-file-tree-select {
  width: 100%;
  min-width: 260px;
}
.algorithm-log-content {
  max-height: 60vh;
  margin: 0;
  padding: 12px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
  font-size: 13px;
  line-height: 1.6;
  background: #f5f7fa;
  border-radius: 4px;
}
</style>

<style lang="less">
.param-source-popper.el-popper {
  padding: 0;
  border: none;
  background: transparent;
  box-shadow: none;
}
.param-source-menu {
  min-width: 110px;
  padding: 4px 0;
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color-light);
  border-radius: 4px;
  box-shadow: var(--el-box-shadow-light);
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.param-source-item {
  padding: 7px 16px;
  font-size: 13px;
  line-height: 22px;
  color: var(--el-text-color-regular);
  cursor: pointer;
  white-space: nowrap;
  outline: none;
  &:hover {
    background-color: var(--el-dropdown-menuItem-hover-fill);
    color: var(--el-dropdown-menuItem-hover-color);
  }
}
.param-source-menu > .el-dropdown {
  display: block;
  width: 100%;
  border-bottom: 1px solid var(--el-border-color-lighter);
}
.param-source-menu > .param-source-item {
  border-bottom: 1px solid var(--el-border-color-lighter);
  &:last-child {
    border-bottom: none;
  }
}
</style>

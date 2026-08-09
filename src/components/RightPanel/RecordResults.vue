<template>
  <div v-if="isShow" class="record_results">
    <el-tabs
      v-model="activeName"
      type="card"
      class="w-full"
      @tab-click="handleClick"
    >
      <el-tab-pane label="计算结果" name="first">
        <div class="w-full">
          <pure-table
            :columns="columns"
            :data="dataList"
            :show-header="false"
            size="small"
            :border="false"
            :height="200"
            row-key="index"
            fit
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
          >
            <template #expand="{ row }">
              <pure-table
                align-whole="center"
                :show-header="true"
                show-overflow-tooltip
                :columns="ChildColumns"
                :data="row.children"
                size="small"
                :border="false"
                row-key="id"
                fit
                :cell-style="{
                  backgroundColor: 'rgba(4, 44, 103, 0.9)',
                  borderTop: '2px solid rgba(4, 44, 103)',
                  borderBottom: '2px solid rgba(4, 44, 103)',
                  color: '#fff'
                  // textAlign: 'center'
                }"
                :header-cell-style="{
                  backgroundColor: 'rgba(4, 44, 103)',
                  borderBottom: '2px solid rgba(4, 44, 103)',
                  color: '#fff'
                  // padding: '10px 0px',
                  // textAlign: 'left'
                  // paddingRight: '60px'
                }"
                @selection-change="handleSelectionChange"
                @select="handleSelectCheck"
              >
                <template #operation="{ row }">
                  <el-button title="点击下载" type="primary" size="small" link>
                    {{ row.dept }}
                  </el-button>
                </template>
              </pure-table>
            </template>
          </pure-table>
        </div>
        <div class="w-full flex justify-end box-border p-[20px] pt-0">
          <el-button type="primary" plain @click="submitUser">
            保存结果
          </el-button>
          <el-button type="primary" plain @click="dialogVisible = true">
            上传结果
          </el-button>
          <el-button type="primary" @click="downloadResults"> 下载 </el-button>
        </div>
      </el-tab-pane>
      <el-tab-pane label="设置" name="second">
        <div>
          <el-form ref="formRef" :label-width="80" :rules="rules" :model="form">
            <el-form-item label="颜色" prop="">
              <el-select
                v-model="form.color"
                placeholder="选择颜色"
                class="w-full"
                multiple
                :multiple-limit="1"
                @change="colorSelectHandle"
              >
                <el-option
                  v-for="color of colors"
                  :key="color.id"
                  :label="color.name"
                  :value="color.id"
                />
                <template #tag>
                  <el-tag
                    v-for="(color, index) in colorRamp"
                    :key="index"
                    :color="`rgba(${color[0]}, ${color[1]}, ${color[2]}, 1)`"
                  />
                </template>
              </el-select>
            </el-form-item>
            <el-form-item label="自定义颜色" prop="">
              <!-- <el-color-picker v-model="form.color" color-format="rgb" /> -->
            </el-form-item>
            <el-form-item label="前后对比" prop="">
              <el-button type="primary" style="width: 100%" @click="contrast">
                对比
              </el-button>
            </el-form-item>
          </el-form>
        </div>
      </el-tab-pane>
    </el-tabs>

    <el-dialog
      v-model="dialogVisible"
      title="结果上传"
      width="700"
      :before-close="handleClose"
    >
      <div class="flex w-full justify-between text-white">
        <div>数据文件</div>
        <div>共 {{ resDataIds.length }} 数据个文件</div>
      </div>
      <div>
        <div>
          <pure-table
            align-whole="center"
            showOverflowTooltip
            :columns="resDataColumns"
            :data="resDataIds"
            size="small"
            :border="false"
            row-key="id"
            height="300"
            fit
            :cell-style="{
              backgroundColor: 'rgba(4, 44, 103, 0.9)',
              borderTop: '2px solid rgba(4, 44, 103)',
              borderBottom: '2px solid rgba(4, 44, 103)',
              color: '#fff'
              // textAlign: 'center'
            }"
            :header-cell-style="{
              backgroundColor: 'rgba(4, 44, 103)',
              borderBottom: '2px solid rgba(4, 44, 103)',
              color: '#fff'
              // padding: '10px 0px',
              // textAlign: 'left'
              // paddingRight: '60px'
            }"
          />
        </div>
        <div class="mt-[20px] text-white">上传理由</div>
        <div class="w-full">
          <el-input
            v-model="reasonText"
            style="width: 100%"
            :rows="4"
            type="textarea"
            placeholder="请输入申请理由"
          />
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="submitPblic"> 提交 </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, toRefs } from "vue";
// import type { TabsPaneContext } from "element-plus";
// import { Back } from "@element-plus/icons-vue";
// import { useRouter } from "vue-router";
import bus from "@/utils/bus";
import {
  algorithmRecordSubUser,
  algorithmRecordSubPublic,
  getColorRamp
} from "@/api/modelParams/index";
import { getThumbJpg } from "@/api/dataSource/panel/loal";
import { message } from "@/utils/message";
import map from "@/libs/tdtmap";

// const router = useRouter();
const isShow = ref(false);
const dialogVisible = ref(false);
const activeName = ref("first");
const colors = ref();
const colorRamp = ref([]);

const checkList = ref([]);

const formRef = ref();

const data = reactive({
  form: {} as any,
  rules: {} as any
});

const { form, rules } = toRefs(data);

const dataList = ref([]);
const resDataIds = ref([]);
const reasonText = ref("");
const resDataColumns: TableColumnList = [
  {
    label: "资源名称",
    prop: "name",
    width: 100
  },
  {
    label: "资源分类",
    prop: "type",
    width: 100,
    // align: "center",
    formatter: ({ type }) => {
      return type == "1" ? "栅格数据" : type == "2" ? "矢量数据" : "";
    }
  },
  {
    label: "关键词",
    prop: "keywords",
    align: "center"
    // width: 80
  }
];
const columns: TableColumnList = [
  // {
  //   type: "selection",
  //   align: "left",
  //   width: "20px",
  //   selectable: (row, index): any => {
  //     return true;
  //   }
  // },
  {
    type: "expand",
    align: "left",
    slot: "expand",
    width: "20px"
  },
  {
    label: "名称",
    prop: "index",
    // width: "50px",
    align: "center"
  }
];
const ChildColumns: TableColumnList = [
  // {
  //   type: "selection",
  //   align: "left",
  //   width: "20px",
  //   selectable: (row, index): any => {
  //     return true;
  //   }
  // },
  {
    label: "资源名称",
    prop: "name",
    width: 100,
    align: "left"
  },
  {
    label: "资源分类",
    prop: "type",
    width: 80,
    align: "left",
    formatter: ({ type }) => {
      return type == "1" ? "栅格数据" : type == "2" ? "矢量数据" : "";
    }
  },
  {
    label: "关键词",
    prop: "keywords",
    width: 80,
    align: "left"
  }
];

bus.on("RecordResults", data => {
  const { show, row } = data as {
    show: boolean;
    row?: object;
  };
  isShow.value = show;
  if (row) {
    dataList.value = [];
    //对象转数组
    Object.keys(row).forEach(key => {
      const children = [];
      Object.keys(row[key]).forEach(k => {
        children.push(...row[key][k]);
      });
      dataList.value.push({ index: key, children });
    });
    dataList.value.map(item => {
      item.children.forEach((it: any) => {
        // it.children.forEach((i: any) => {
        resDataIds.value.push(it);
        // });
      });
    });
  }
});

const contrast = () => {
  map.removeLocalImageLayers();
  map.viewer.entities.values.forEach((entity: any) => {
    entity.show = false;
  });
  bus.emit("startRolling", form.value.color[0]);
};

const getColorRampData = async () => {
  const res = await getColorRamp({ name: "" });
  colors.value = res.rows;
};

const colorSelectHandle = val => {
  const selectedColor = colors.value.find(color => color.id === val[0]);
  if (selectedColor) {
    colorRamp.value = JSON.parse(selectedColor.colorRamp);
  } else {
    colorRamp.value = [];
  }
};

const handleClick = () => {
  // console.log(tab, event);
};

const handleClose = () => {
  dialogVisible.value = false;
};

const downloadResults = () => {
  //将dataList列表数据转为json格式下载
  const jsonStr = JSON.stringify(dataList.value);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "results.json";
  a.click();
  URL.revokeObjectURL(url);
};

const checkedDataList = ref([]);
const handleSelectionChange = val => {
  val.forEach(item => {
    if (!checkedDataList.value.some((i: any) => i.id === item.id)) {
      checkedDataList.value.push(item);
    }
  });
  // console.log(checkedDataList.value);
};

const handleSelectCheck = (val, row) => {
  console.log(row);
  console.log(val);
};

const submitUser = async () => {
  await algorithmRecordSubUser({
    dataIds: resDataIds.value.map(item => item.id)
  });
  message("结果保存成功，后续可在成果检索中检索到已保存的个人数据！", {
    type: "success"
  });
};

const submitPblic = async () => {
  await algorithmRecordSubPublic({
    dataIds: resDataIds.value.map(item => item.id),
    reason: reasonText.value,
    region: "defualt"
  });
  dialogVisible.value = false;
  message("结果上传成功，请等待管理员审核", {
    type: "success"
  });
  reasonText.value = "";
};

const handleSearch = () => {};

onMounted(() => {
  getColorRampData();
});
</script>

<style lang="less" scoped>
::-webkit-scrollbar {
  display: none;
}

#pane-second {
  box-sizing: border-box;
  padding: 0 20px;
}

.record_results {
  width: 100%;
  border-radius: 5px;
  background: rgba(255, 255, 255);
}

:deep(.el-dialog) {
  background-color: #1b62ad;
  border-radius: 10px;
  .el-dialog__title {
    color: #ffffff;
  }
  .el-table {
    padding: 0;
    border-radius: 5px;
  }
}

:deep(.el-form-item__label) {
  color: #000000;
  text-wrap: nowrap;
}

:deep(.el-tabs--card > .el-tabs__header .el-tabs__item) {
  font-family:
    Source Han Sans SC,
    Source Han Sans SC;
  font-weight: 400;
  color: #ffffff;
  letter-spacing: 3px;
  text-align: center;
  font-style: normal;
  text-transform: none;
  width: 50%;
  border: none;
}
:deep(.el-tabs--card > .el-tabs__header .el-tabs__nav) {
  width: 100%;
  border: none;
  background: linear-gradient(
    180deg,
    rgba(20, 146, 249),
    rgba(145, 200, 239),
    rgba(255, 255, 255, 0.5)
  );
}
:deep(.el-tabs--card > .el-tabs__header .el-tabs__item.is-active) {
  border: none;
  background: linear-gradient(
    180deg,
    rgba(155, 216, 253, 0.8),
    // rgba(205, 231, 250, 0.5),
    rgba(255, 255, 255, 0.8)
  );
  font-family:
    Source Han Sans SC,
    Source Han Sans SC;
  font-weight: 400;
  color: #2c5da7;
  letter-spacing: 3px;
  text-align: center;
  font-style: normal;
  text-transform: none;
  border-radius: 5px 5px 0 0;
}
:deep(.el-table) {
  background: rgba(4, 44, 103, 0);
  padding: 0 20px;
  margin-bottom: 20px;
}
:deep(.el-table__body) {
  width: 100% !important;
}
:deep(.el-table__header) {
  width: 100% !important;
}

@media screen and (max-width: 1670px) {
  :deep(.el-table__body) {
    width: auto !important;
  }
  :deep(.el-table__header) {
    width: auto !important;
  }
}

:deep(.el-table__inner-wrapper):before {
  display: none;
}
:deep(.el-tabs--card > .el-tabs__header) {
  position: fixed;
  z-index: 999;
  width: calc(20vw - 0px);
  background: rgba(255, 255, 255, 0);
  border-radius: 5px 5px 0 0;
}
:deep(.el-tabs__content) {
  padding-top: 60px;
}
:deep(.el-table tr) {
  color: #fff;
  background-color: rgba(4, 44, 103, 0.9);
}

:deep(.el-table--enable-row-transition .el-table__body td.el-table__cell) {
  background-color: rgba(4, 44, 103, 0.9);
  border: none;
}
</style>

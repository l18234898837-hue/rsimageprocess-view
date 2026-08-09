<template>
  <div
    class="text-[#545353] text-[20px] font-bold mb-[10px] flex items-center justify-between"
  >
    {{ !isInfo && !isUpdate ? "新增任务" : isInfo ? "任务详情" : "修改任务" }}
    <el-button
      type="primary"
      size="small"
      round
      :loading="loading"
      @click="emit('handleAddDowloadPlan', true)"
      >返回
    </el-button>
  </div>
  <el-form
    ref="formRef"
    label-width="5vw"
    label-position="right"
    :rules="rules"
    :model="form"
    :disabled="isInfo"
    style="display: flex; flex-wrap: wrap; align-items: center"
  >
    <el-form-item label="任务名称" prop="name" style="width: 100%">
      <el-input v-model="form.name" size="small" placeholder="请输入" />
    </el-form-item>
    <el-form-item label="运行日期" prop="runDate">
      <el-date-picker
        v-if="form.type == 2"
        v-model="form.runDate"
        clearable
        class="!w-[200px]"
        type="daterange"
        placeholder="请选择日期"
        value-format="YYYYMMDD"
        size="small"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
      />
      <el-date-picker
        v-else
        v-model="form.runDate"
        type="date"
        placeholder="请选择时间"
        format="YYYY-MM-DD"
        value-format="YYYYMMDD"
        size="small"
        class="!w-[8vw]"
      />
    </el-form-item>
    <el-form-item v-if="form.type == 2" label="运行频率" prop="frequency">
      <el-select
        v-model="form.frequency"
        clearable
        class="!w-[9vw]"
        placeholder="请选择频率"
        size="small"
      >
        <el-option label="每天" :value="1" />
        <el-option label="每周" :value="2" />
        <el-option label="每月" :value="3" />
      </el-select>
    </el-form-item>
    <el-form-item label="运行时间" prop="runTime">
      <el-time-picker
        v-model="form.runTime"
        size="small"
        placeholder="请选择时间"
        class="!w-[8vw]"
        value-format="HH:mm:ss"
      />
    </el-form-item>
    <el-form-item label="描述" style="width: 100%">
      <el-input
        v-model="form.tastDescription"
        size="small"
        placeholder="请输入内容"
      />
    </el-form-item>

    <el-form-item
      v-if="form.type == 2"
      label="下载数据选择"
      style="width: 100%"
    />

    <div
      v-if="form.type == 2"
      class="w-full box-border p-[10px] border border-dashed border-[#5886cb]"
    >
      <el-form-item label="卫星系列" prop="onlineType" style="width: 100%">
        <!-- <el-cascader
          v-model="form.dataSetOptions"
          :options="dataSetList"
          :props="props"
          size="small"
          clearable
          collapse-tags
          collapse-tags-tooltip
          style="width: 100%"
        /> -->
        <el-select
          v-model="form.onlineType"
          clearable
          style="width: 100%"
          placeholder="请选择"
          size="small"
        >
          <el-option label="Landsat" :value="1" />
          <el-option label="sentinel" :value="2" />
        </el-select>
      </el-form-item>
      <el-form-item label="数据区域" prop="runText">
        <el-radio-group v-model="form.region" style="width: 150px">
          <el-radio value="1">岛礁</el-radio>
          <el-radio value="2">经纬度</el-radio>
        </el-radio-group>
        <div v-show="form.region == 1" class="flex-1 ml-[10px]">
          <el-tree-select
            v-model="form.islands"
            :data="selectTree"
            :show-checkbox="false"
            :multiple="false"
            check-on-click-node
            :expand-on-click-node="true"
            size="small"
            node-key="id"
            clearable
            :props="{
              children: 'children',
              label: 'standardName',
              value: 'id'
            }"
            style="width: 100%"
            @current-change="onTreeNode"
          />
        </div>
        <div v-show="form.region == 2" class="w-[26vw] ml-[10px] flex">
          <el-row justify="center">
            <el-col :span="4">经度</el-col>
            <el-col :span="6">
              <el-input
                v-model="form.minLon"
                size="small"
                placeholder="请输入"
              />
            </el-col>
            <el-col class="line text-center" :span="2">-</el-col>
            <el-col :span="6">
              <el-input
                v-model="form.maxLon"
                size="small"
                placeholder="请输入"
              />
            </el-col>
          </el-row>
          <el-row>
            <el-col :span="4">纬度</el-col>
            <el-col :span="6">
              <el-input
                v-model="form.minLat"
                size="small"
                placeholder="请输入"
              />
            </el-col>
            <el-col class="line text-center" :span="2">-</el-col>
            <el-col :span="6">
              <el-input
                v-model="form.maxLat"
                size="small"
                placeholder="请输入"
              />
            </el-col>
          </el-row>
        </div>
      </el-form-item>
    </div>

    <div
      style="display: flex; justify-content: end; width: 100%; margin-top: 20px"
    >
      <el-form-item>
        <el-button size="small" type="info" round @click="reset"
          >重置</el-button
        >
        <el-button
          type="primary"
          size="small"
          :loading="loading"
          round
          @click="onSubmit(formRef)"
          >提交
        </el-button></el-form-item
      >
    </div>
  </el-form>
</template>

<script setup lang="ts">
import { ref, reactive, toRefs, onMounted } from "vue";
import { wktToGeoJSON } from "@terraformer/wkt";
import { getStMenuInfoTree } from "@/api/dataSource/stThematic";
import { getStIslandInfoTree } from "@/api/dataSource/legend";
import { addTimerInfo, updateTimerInfo } from "@/api/stTimer";
import { useUserStoreHook } from "@/store/modules/user";
import { message } from "@/utils/message";
import bus from "@/utils/bus";

const userStore: any = useUserStoreHook();

const emit = defineEmits(["handleAddDowloadPlan"]);
const formRef = ref();
const data = reactive({
  form: {
    userId: userStore.info.userId,
    region: "1",
    taskType: 1,
    type: 2,
    status: 0,
    runText: {
      datasetNames: [
        "landsat_etm_c2_l1",
        "landsat_tm_c2_l1",
        "landsat_ot_c2_l1"
      ],
      sentinel2Types: ["A", "B", "C"],
      geoJsonStr: "",
      wtk: ""
    }
  } as any,
  rules: {
    name: [{ required: true, message: "名称不能为空", trigger: "blur" }],
    frequency: [{ required: true, message: "请选择频率", trigger: "blur" }],
    runDate: [{ required: true, message: "请选择日期", trigger: "blur" }],
    runTime: [{ required: true, message: "请选择时间", trigger: "blur" }],
    // runText: [{ required: true, message: "请选择", trigger: "blur" }],
    onlineType: [{ required: true, message: "请选择", trigger: "blur" }]
  }
});

const { form, rules } = toRefs(data);

const isUpdate = ref(false);
const isInfo = ref(false);
const loading = ref(false);
const dataSetList = ref([]);
// const dataSetOptions = ref([]);
const selectTree = ref([]);
// const props = {
//   multiple: true,
//   label: "menuName",
//   value: "catalogId",
//   lazy: true,
//   lazyLoad(node, resolve) {
//     if (node.level === "0") {
//       resolve(dataSetList.value);
//     } else {
//       resolve([{ ...node.data, leaf: true }]);
//     }
//   }
// };

const onTreeNode = val => {
  if (val.longitude && val.latitude) {
    form.value.runText.wtk = `POINT(${val.longitude} ${val.latitude})`;
    form.value.runText.geoJsonStr = JSON.stringify(
      wktToGeoJSON(`POINT(${val.longitude} ${val.latitude})`)
    );
  }
};

const getMenuTreeData = async () => {
  getStIslandInfoTree().then(res => {
    selectTree.value = res.data[0].children;
  });
  const { data } = await getStMenuInfoTree();
  data.map((item: any) => {
    if (item.menuName == "遥感计算") {
      item.children.map(item2 => {
        if (item2.menuName == "遥感计算") {
          dataSetList.value = item2.children;
          dataSetList.value.forEach(item3 => {
            item3.children.forEach(item4 => {
              item4.leaf = true;
            });
          });
        }
      });
    }
  });
};

const onSubmit = async (formEl: any) => {
  if (!formEl) return;
  await formEl.validate(async (valid, fields: any) => {
    if (valid) {
      if (!isUpdate.value) {
        form.value.runText.onlineType = form.value.onlineType;
        form.value.runText.islands = form.value.islands;
        form.value.runText = JSON.stringify(form.value.runText);
        await addTimerInfo({
          ...form.value,
          runDate: form.value.runDate?.join("-")
        });
        message("添加成功！", { type: "success" });
        reset();
        emit("handleAddDowloadPlan", true);
      } else {
        form.value.runText.onlineType = form.value.onlineType;
        form.value.runText.islands = form.value.islands;
        form.value.runText = JSON.stringify(form.value.runText);
        await updateTimerInfo({
          ...form.value,
          runDate:
            form.value.type == 2
              ? form.value.runDate?.join("-")
              : form.value.runDate
        });
        message("修改成功", {
          type: "success"
        });
        reset();
        emit("handleAddDowloadPlan", true);
      }
    } else {
      return fields;
    }
  });
};

/** 表单重置 */
const reset = () => {
  form.value = {
    userId: userStore.info.userId,
    region: "1",
    taskType: 1,
    type: form.value.type === 2 ? 2 : undefined,
    status: 0,
    runText: {
      datasetNames: [
        "landsat_etm_c2_l1",
        "landsat_tm_c2_l1",
        "landsat_ot_c2_l1"
      ],
      sentinel2Types: ["A", "B", "C"],
      geoJsonStr: "",
      wtk: ""
    }
  };
  if (formRef.value?.resetFields) {
    formRef.value.clearValidate();
  }
};

const setData = async row => {
  // console.log(row);
  reset();
  if (!row) {
    isUpdate.value = false;
    isInfo.value = false;
  } else if (row && row.info) {
    isInfo.value = true;
    isUpdate.value = false;
    row.row.runText =
      typeof row.row.runText == "string"
        ? JSON.parse(row.row.runText)
        : row.row.runText;
    form.value = row.row;
    form.value.runDate =
      row.row.type == 2 ? row.row.runDate?.split("-") : row.row.runDate;
    form.value.onlineType = row.row.runText.onlineType;
    form.value.islands = row.row.runText.islands;
    form.value.region = "1";
  } else {
    isUpdate.value = true;
    isInfo.value = false;
    row.runText =
      typeof row.runText == "string" ? JSON.parse(row.runText) : row.runText;
    form.value = row;
    form.value.runDate = row.type == 2 ? row.runDate?.split("-") : row.runDate;
    form.value.onlineType = row.runText.onlineType;
    form.value.islands = row.runText.islands;
    form.value.region = "1";
  }
};
bus.on("downloadFormSetData", row => {
  setData(row);
});

onMounted(() => {
  getMenuTreeData();
});

defineExpose({ setData });
</script>

<!-- <style lang="scss" scoped></style> -->

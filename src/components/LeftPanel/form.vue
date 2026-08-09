<template>
  <el-form ref="leftFormRef" label-width="" :rules="rules" :model="form">
    <el-form-item
      v-if="tab == 'second'"
      label-width="3.5vw"
      label="数据集"
      prop="value_2"
      style="width: 122%"
    >
      <!-- <el-cascader
        v-model="dataSetOptions"
        :options="dataSetList"
        :props="props"
        clearable
        collapse-tags
        collapse-tags-tooltip
        style="width: 100%"
      /> -->
      <div
        :class="[
          'bg-[rgba(255,255,255)] w-full h-[220px] border-[1px] border-[#ccc]',
          'relative mt-[40px] right-[66px]',
          'rounded-sm overflow-y-auto px-[10px]'
        ]"
      >
        <el-tree
          ref="dataSetRef2"
          :data="dataSetList"
          show-checkbox
          default-expand-all
          node-key="id"
          :expand-on-click-node="true"
          :props="{
            label: 'name',
            isLeaf: 'leaf',
            children: 'children',
            class: customNodeClass,
            disabled: 'disabled'
          }"
          @node-click="treeNodeClick2"
        >
          <template #default="{ data }">
            <el-tooltip
              v-if="data.remark"
              :teleported="false"
              :content="data.remark"
              placement="right"
              effect="light"
            >
              <span class="inline-block align-middle">{{ data.name }}</span>
            </el-tooltip>
            <!-- <el-icon v-if="data.loading"><Loading /></el-icon> -->
            <el-button v-if="data.loading" type="info" loading text />
            <div v-if="data.loading">{{ data.name }}</div>
          </template>
        </el-tree>
      </div>
    </el-form-item>
    <el-form-item label="空间位置" style="width: 102%">
      <local-sel ref="localSelRef" style="width: 100%" />
    </el-form-item>
    <el-form-item v-if="tab == 'first'" label="数据选择" style="width: 122%">
      <div
        :class="[
          'bg-[rgba(255,255,255)] w-full h-[400px] border-[1px] border-[#ccc]',
          'relative mt-[40px] right-[66px]',
          'rounded-sm overflow-y-auto px-[10px]'
        ]"
      >
        <el-tree
          ref="treeRef"
          :data="menuTree"
          show-checkbox
          default-expand-all
          node-key="id"
          :expand-on-click-node="true"
          :props="{
            label: 'name',
            isLeaf: 'leaf',
            children: 'children',
            class: customNodeClass,
            disabled: 'disabled'
          }"
          @node-click="treeNodeClick"
        >
          <template #default="{ data }">
            <el-tooltip
              v-if="data.remark"
              :teleported="false"
              :content="data.remark"
              placement="right"
              effect="light"
            >
              <span class="inline-block align-middle">{{ data.name }}</span>
            </el-tooltip>
            <!-- <el-icon v-if="data.loading"><Loading /></el-icon> -->
            <el-button v-if="data.loading" type="info" loading text />
            <div v-if="data.loading">{{ data.name }}</div>
          </template>
        </el-tree>
      </div>
    </el-form-item>

    <el-form-item label="时间范围" style="width: 118%">
      <el-date-picker
        v-model="form.startTime"
        type="date"
        placeholder="开始时间"
        style="width: 40%"
      />
      <div class="w-[3.5%] h-2" />
      <el-date-picker
        v-model="form.endTime"
        type="date"
        placeholder="结束时间"
        style="width: 40%"
      />
    </el-form-item>
    <!-- <el-form-item label="云量">
      <el-input-number v-model="form.cloud" style="width: 100%" :min="0" />
    </el-form-item> -->
    <el-form-item>
      <el-button
        type="primary"
        :loading="loading"
        @click="onSubmit(leftFormRef)"
        >检索</el-button
      >
      <el-button @click="reset()">重置</el-button>
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import { ref, reactive, toRefs, onMounted } from "vue";
import LocalSel from "@/components/LocalSel/index.vue";
import {
  getStMenuInfoTree,
  getAlgorithmCatalogTree
} from "@/api/dataSource/stThematic";
import bus from "@/utils/bus";
import { getConditionPage } from "@/api/dataSource/panel/loal";
import map from "@/libs/tdtmap";
import { message } from "@/utils/message";
import { useUserStoreHook } from "@/store/modules/user";
import * as Cesium from "cesium";
import dayjs from "dayjs";
import { cloneDeep } from "lodash-es";
const userStore: any = useUserStoreHook();

const leftFormRef = ref();
const loading = ref(false);

const { tab } = defineProps({
  tab: {
    type: String,
    default: ""
  }
});

const emit = defineEmits(["handleSearch"]);

const data = reactive({
  form: {} as any,
  rules: {
    // value: [{ required: true, message: "不能为空", trigger: "blur" }],
    // value_2: [{ required: true, message: "不能为空", trigger: "blur" }]
  } as any
});

const { form, rules } = toRefs(data);

const treeRef = ref();
const dataSetRef2 = ref();

const customNodeClass = ({ isPenultimate }) =>
  isPenultimate ? "is-penultimate" : "";

const treeNodeClick = async node => {
  // console.log(node);
  if (node.leaf) return;
  if (node.children && node.children?.length) return;
  node.loading = true;
  const res = await getAlgorithmCatalogTree({
    rootId: node.catalogId
  });
  res.data.forEach(item => {
    item.leaf = true;
    item.isPenultimate = true;
  });
  res.data.sort((a, b) => {
    if (a.name < b.name) return -1;
    if (a.name > b.name) return 1;
    return 0;
  });
  if (!node.children || !node.children?.length) {
    treeRef.value?.updateKeyChildren(node.id, res.data);
    treeRef.value?.updateKeyChildren(node.id, res.data);
    node.disabled = false;
    treeRef.value?.getNode(node.parentId)
      ? (treeRef.value.getNode(node.parentId).data.disabled = false)
      : true;
  }
  node.loading = false;
};
const treeNodeClick2 = async node => {
  // console.log(node);
  if (node.leaf) return;
  if (node.children && node.children?.length) return;
  node.loading = true;
  const res = await getAlgorithmCatalogTree({
    rootId: node.catalogId
  }).catch(() => {
    node.loading = false;
  });
  if (!res) return;
  res.data.forEach(item => {
    item.level = node.name;
    item.leaf = true;
    item.isPenultimate = true;
  });
  res.data.sort((a, b) => {
    if (a.name < b.name) return -1;
    if (a.name > b.name) return 1;
    return 0;
  });

  if (!node.children || !node.children?.length) {
    dataSetRef2.value?.updateKeyChildren(
      node.id,
      res.data
      // res.data.filter(item => !item.name.includes("B"))
    );
    node.disabled = false;
    dataSetRef2.value?.getNode(node.parentId)
      ? (dataSetRef2.value.getNode(node.parentId).data.disabled = false)
      : true;
  }
  node.loading = false;
};

const checkedDataIds = () => {
  let localData = treeRef.value?.getCheckedNodes();
  localData = localData?.filter(item => item.leaf);
  const ids = localData?.map(item => item.id);
  // console.log(ids);
  return ids;
};
const checkedDataIds2 = () => {
  let localData = dataSetRef2.value?.getCheckedNodes();
  localData = localData?.filter(item => item.leaf);
  const ids = localData?.map(item => item.id);
  // console.log(ids);
  return ids;
};

const menuTree = ref([]);
const checkedLv3Array = ref([]);
const getMenuTreeData = async () => {
  const { data } = await getStMenuInfoTree();
  console.log("data", data);
  let dataSet = [];
  data.map((item: any) => {
    if (item.menuName == "遥感计算") {
      item.children.map(item2 => {
        if (item2.menuName == "成果记录与下载") {
          menuTree.value = item2.children;
        }
        // if (item2.menuName == "遥感计算") {
        //   dataSetList.value = item2.children;
        //   dataSetList.value.forEach(item3 => {
        //     item3.children.forEach(item4 => {
        //       item4.leaf = true;
        //     });
        //   });
        // }
      });
    }

    if (item.menuName == "数据资源") {
      dataSet = item.children.find(item => item.menuName == "遥感产品");
      console.log("typeData", dataSet);
    }
  });
  menuTree.value.forEach(item => {
    item.level = 1;
    item.id = item.menuId;
    item.name = item.menuName;
    item.checkedArray = [];
    item.checkAll = true;
    item.isIndeterminate = true;
    item.children?.forEach(child => {
      child.level = 2;
      child.loading = false;
      child.id = child.menuId;
      child.name = child.menuName;
      child.disabled = true;
      // child.leaf = true;
      child.checkedArray = [];
      // child.children = [];
      child.checkAll = false;
      child.isIndeterminate = false;
    });
    item.disabled = !item.children
      ? true
      : item.children?.some(item => item.disabled) || false;
  });
  // console.log(data);
  // console.log(menuTree.value);
  menuTree.value.forEach(item => {
    if (!item.children) {
      treeNodeClick(item);
    } else if (item.children) {
      item.children.forEach(child => {
        treeNodeClick(child);
      });
    }
  });
  //遥感计算
  // return;
  dataSet.children?.forEach(item => {
    // console.log(item, "item");
    item.id = item.menuId || item.id;
    item.name = item.menuName || item.name;
    item.checkedArray = [];
    item.checkAll = true;
    item.isIndeterminate = true;
    item.isOnline = item.name == "L1" ? true : false;
    item.children?.forEach(child => {
      child.id = child.menuId || child.id;
      child.name = child.menuName || child.name;
      child.disabled = false;
      child.checkedArray = [];
      child.checkAll = false;
      child.isIndeterminate = true;
    });
    item.disabled = !item.children
      ? true
      : item.children?.some(item => item.disabled) || false;
  });
  dataSetList.value = dataSet.children || [];
  console.log("dataSetList.value", dataSetList.value);
  dataSetList.value.forEach(item => {
    if (item.catalogId) {
      treeNodeClick2(item);
    } else if (item.children) {
      item.children.forEach(child => {
        treeNodeClick2(child);
      });
    }
  });
};

const onlineData = ref();

const localSelRef = ref();

let localAllDataList = [];
let localAllPageSize = 0;
const getAllLocalData = async () => {
  localAllDataList = [];
  localAllPageSize += 5;
  const localDataIds = checkedDataIds() || [];
  if (!localDataIds.length) return;

  try {
    const res = await getConditionPage(
      {
        bo: {
          beginTime: form.value.startTime,
          endTime: form.value.endTime,
          datasets: localDataIds,
          userId: userStore.info.userId,
          local: localSelRef.value.getSpatial(),
          type: 2
        },
        page: {
          pageSize: localAllPageSize,
          pageNum: 1
        }
      },
      "/all"
    );

    // 检查响应
    if (res.code === 200) {
      if (!res.rows || res.rows.length <= 0) {
        message("暂无数据", { type: "warning" });
        return;
      }
      localAllDataList = res.rows;
      bus.emit("getSearchAllLocalDataList", { data: localAllDataList });
    } else {
      message("获取数据失败", { type: "warning" });
      return;
    }
  } catch (error) {
    console.error("请求失败:", error);
    message("请求异常，请稍后重试", { type: "error" });
  }
};

let localPublicDataList = [];
let localPublicPageSize = 0;
const getPublicLocalData = async () => {
  localPublicDataList = [];
  localPublicPageSize += 5;
  const localDataIds = checkedDataIds() || [];
  if (!localDataIds.length) return;
  const res = await getConditionPage(
    {
      bo: {
        beginTime: form.value.startTime,
        endTime: form.value.endTime,
        datasets: localDataIds,
        local: localSelRef.value.getSpatial(),
        type: 2
      },
      page: {
        pageSize: localPublicPageSize,
        pageNum: 1
      }
    },
    ""
  );
  localPublicDataList = res.rows;
  bus.emit("getSearchPublicLocalDataList", { data: localPublicDataList });
};

let localUserDataList = [];
let localUserPageSize = 0;
const getUserLocalData = async () => {
  localUserDataList = [];
  localUserPageSize += 5;
  const localDataIds = checkedDataIds() || [];
  if (!localDataIds.length) return;
  const res = await getConditionPage(
    {
      bo: {
        beginTime: form.value.startTime,
        endTime: form.value.endTime,
        datasets: localDataIds,
        userId: userStore.info.userId,
        local: localSelRef.value.getSpatial(),
        type: 2
      },
      page: {
        pageSize: localUserPageSize,
        pageNum: 1
      }
    },
    "/user"
  );
  localUserDataList = res.rows;
  bus.emit("getSearchUserLocalDataList", { data: localUserDataList });
};

const localPageSize = ref(0);
const getLocalData = async () => {
  loading.value = true;
  localPageSize.value += 5;
  await getAllLocalData();
  getPublicLocalData();
  getUserLocalData();
  loading.value = false;
};

/**
 * 数据集
 */
const dataSetList = ref([]);
const dataSetOptions = ref([]);
const props = {
  multiple: true,
  label: "menuName",
  value: "catalogId",
  lazy: true,
  lazyLoad(node, resolve) {
    if (node.level === "0") {
      resolve(dataSetList.value);
    } else {
      resolve([{ ...node.data, leaf: true }]);
    }
  }
};

bus.on("searchAllLocalData", async () => {
  await getAllLocalData();
});

bus.on("searchPublicLocalData", async () => {
  await getPublicLocalData();
});

bus.on("searchUserLocalData", async () => {
  await getUserLocalData();
});

bus.on("formReset", () => {
  reset();
});

/** 表单重置 */
const reset = () => {
  form.value = {
    startTime: undefined,
    endTime: undefined,
    cloudCoverage: 100,
    local: undefined,
    api: undefined,
    collection: undefined,
    limit: 0,
    next: 0
  } as any;
  checkedLv3Array.value = [];
  dataSetOptions.value = [];
  onlineData.value = undefined;
  getDataListPageSize = 0;
  localAllPageSize = 0;
  localPublicPageSize = 0;
  localUserPageSize = 0;
  emit("handleSearch", []);
  // map.removeAllLayer();
  // map.clearGeoJSON();
  map.viewer.entities.removeAll();
  if (leftFormRef.value?.resetFields) {
    leftFormRef.value.resetFields();
  }
  menuTree.value?.forEach(item => {
    item.checkedArray = [];
    item.checkAll = false;
    treeRef.value?.setChecked(item, false, true);
  });
  dataSetList.value?.forEach(item => {
    item.checkedArray = [];
    item.checkAll = false;
    dataSetRef2.value?.setChecked(item, false, true);
  });
  bus.emit("resetLocalType");
  bus.emit("showSearchPanel", false);
  bus.emit("getTimeSequenceDataList", []);
  bus.emit("showTimeSequence", { text: "reset" });
  map.removeLocalImageLayers();
  bus.emit("getSearchAllLocalDataList", { data: [] });
  bus.emit("getSearchPublicLocalDataList", { data: [] });
  bus.emit("getSearchUserLocalDataList", { data: [] });
  bus.emit("legendRightWidth", false);
};

let getDataListPageSize = 0;
const getDataList = async () => {
  const dataSetIds = checkedDataIds2();
  try {
    const res = await getConditionPage(
      {
        bo: {
          beginTime: form.value.startTime,
          endTime: form.value.endTime,
          datasets: dataSetIds,
          userId: userStore.info.userId,
          local: localSelRef.value.getSpatial()
        },
        page: {
          pageSize: (getDataListPageSize += 5),
          pageNum: 1
        }
      },
      "/all" // URL 参数应该放在这里
    );

    // 检查响应
    if (res.code === 200) {
      if (!res.rows || res.rows.length <= 0) {
        message("暂无数据", { type: "warning" });
        return;
      }
      emit("handleSearch", res.rows);
    } else {
      message("获取数据失败", { type: "warning" });
      return;
    }
  } catch (error) {
    console.error("请求失败:", error);
    message("请求异常，请稍后重试", { type: "error" });
  }
};
const onSubmit = async formEl => {
  if (dayjs(form.value.startTime).isAfter(dayjs(form.value.endTime))) {
    message("开始时间不能晚于结束时间", { type: "warning" });
    return;
  }
  loading.value = true;
  if (!formEl) return;
  // console.log(tab);
  await formEl.validate(async (valid, fields) => {
    if (valid) {
      if (
        map.getViewer().entities.getById("drawEntity") &&
        map.getViewer().entities.getById("drawEntity").rectangle
      ) {
        map.getViewer().entities.getById("drawEntity").rectangle.material =
          Cesium.Color.BLUE.withAlpha(0) as any;
      } else if (
        map.getViewer().entities.getById("drawEntity") &&
        map.getViewer().entities.getById("drawEntity").ellipse
      ) {
        const ellipse = map.getViewer().entities.getById("drawEntity").ellipse;
        // ellipse.height = 0 as any;
        ellipse.material = Cesium.Color.BLUE.withAlpha(0) as any;
      } else if (
        map.getViewer().entities.getById("drawEntity") &&
        map.getViewer().entities.getById("drawEntity").polygon
      ) {
        const polygon = map.getViewer().entities.getById("drawEntity").polygon;
        polygon.material = Cesium.Color.BLUE.withAlpha(0) as any;
      }
      if (tab === "first") {
        await getLocalData();
        // if (checkedDataIds().length) {
        bus.emit("showSearchPanel", true);
        bus.emit("legendRightWidth", true);
        // }
      } else if (checkedDataIds2()) {
        await getDataList();
        bus.emit("legendRightWidth", false);
        // bus.emit("showSearchPanel", false);
      }
      loading.value = false;
    } else {
      loading.value = false;
      return fields;
    }
  });
};

onMounted(async () => {
  await getMenuTreeData();
});

defineExpose({
  getDataList,
  reset
});
</script>

<style lang="scss" scoped>
::-webkit-scrollbar {
  display: none;
}

.data_select:hover {
  &::-webkit-scrollbar {
    display: block;
    width: 5px;
    border-radius: 8px;
  }
}

:deep(.el-form-item__label) {
  // color: #000000;
  text-wrap: nowrap;
}

:deep(.el-checkbox) {
  color: #0e306b;
}

// :deep(.el-cascader__tags) {
//   display: flex;
//   flex-wrap: nowrap;
//   overflow: hidden;
// }

// :deep(.el-select__wrapper) {
//   background: rgb(255 255 255 / 0%);
//   box-shadow: 0 0 0 1px #0080ff inset;
// }
</style>

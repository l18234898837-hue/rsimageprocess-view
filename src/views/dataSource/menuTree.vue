<template>
  <div
    class="menu transition-all duration-200"
    :style="{ width: isCollapse ? '3.5vw' : '10vw' }"
  >
    <div
      :class="[
        'fixed top-[50%] text-[#0f6ab9] bg-[#bee1ff] rounded-sm p-[2px] transition-all duration-200 cursor-pointer',
        'h-[50px] flex items-center justify-center text-[16px] hover:shadow-[0_0_10px_rgba(0,0,0,0.2)]'
      ]"
      :style="{ left: isCollapse ? '2.8vw' : '9.5vw', zIndex: 1000 }"
      @click="onCollapseBtn"
    >
      <el-icon v-if="isCollapse"><DArrowRight /></el-icon>
      <el-icon v-else-if="!isCollapse"><DArrowLeft /></el-icon>
    </div>
    <el-menu
      :key="menuKey"
      :default-active="activeMenu"
      :default-openeds="defaultOpeneds"
      class="menu-tree"
      background-color="#bee1ff"
      text-color="#0f6ab9"
      :unique-opened="false"
      :collapse="isCollapse"
      :style="{ width: isCollapse ? '3vw' : '15.6vw' }"
      active-text-color="#fff"
      @open="handleOpen"
      @close="handleClose"
    >
      <div v-for="lv_1 of menuTree" :key="lv_1.menuId">
        <el-menu-item
          v-if="!lv_1.children || lv_1.menuName == '遥感产品'"
          :id="lv_1.menuId"
          :index="lv_1.menuId"
          @click="handleMenuItem(lv_1, lv_1.menuId)"
        >
          <el-icon v-show="lv_1.menuName == '遥感产品'"><Grid /></el-icon>
          <el-icon v-show="lv_1.menuName == '专题数据'"
            ><DocumentCopy
          /></el-icon>
          {{ isCollapse ? "" : lv_1.menuName }}</el-menu-item
        >
        <el-sub-menu
          v-else-if="lv_1.status || lv_1.menuName === '现场观测数据'"
          :index="String(lv_1.menuId)"
        >
          <template #title>
            <el-icon v-if="lv_1.menuName === '现场观测数据'"><Coin /></el-icon>
            <el-icon v-else><VideoCameraFilled /></el-icon>
            <span>{{ isCollapse ? "" : lv_1.menuName }}</span>
          </template>
          <div v-for="lv_2 of lv_1.children" :key="lv_2.menuId">
            <el-menu-item
              v-if="!lv_2.children"
              :id="lv_2.menuId"
              :index="lv_2.menuId"
              @click="handleMenuItem(lv_2, lv_2.menuId)"
              >{{ lv_2.menuName }}</el-menu-item
            >
            <el-sub-menu v-else :index="String(lv_2.menuId)">
              <template #title>
                <span>{{ lv_2.menuName }}</span>
              </template>
              <div v-for="lv_3 of lv_2.children" :key="lv_3.menuId">
                <el-menu-item
                  v-if="!lv_3.children"
                  :id="lv_3.menuId"
                  :index="lv_3.menuId"
                  @click="handleMenuItem(lv_3, lv_3.menuId)"
                  >{{ lv_3.menuName }}</el-menu-item
                >
                <el-sub-menu v-else :index="String(lv_3.menuId)">
                  <template #title>{{ lv_3.menuName }}</template>
                </el-sub-menu>
              </div>
            </el-sub-menu>
          </div>
        </el-sub-menu>
      </div>
    </el-menu>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, reactive, nextTick } from "vue";
import {
  getStThematicData,
  getAlgorithmCatalogList,
  getStMenuInfoTree,
  getAlgorithmCatalogPage,
  stInstrumentsInfo
} from "@/api/dataSource/stThematic";
import {} from // getStInstrumentInfoAll,
// getStVoyages
"@/api/dataSource/instrument";
import {
  DArrowLeft,
  Menu as IconMenu,
  Grid,
  DArrowRight,
  VideoCameraFilled,
  Coin,
  DocumentCopy
} from "@element-plus/icons-vue";
import bus from "@/utils/bus";
import { useRoute } from "vue-router";
import router from "@/router";

const route = useRoute();
const defaultOpeneds = ref<string[]>([]);
const menuKey = ref(0);
const dataList = ref([]);
const menuTree = ref([]);
const activeMenu = ref("");
const isCollapse = ref(false);

const emit = defineEmits(["getDataList"]);

const handleOpen = async (key: string, keyPath: string[]) => {
  console.log(key, keyPath);
  const isActive = document.getElementById(actionId.value);
  if (isActive) {
    isActive.style.backgroundImage = !isCollapse.value
      ? `url(${bgLongImg})`
      : `url(${bgImg})`;
  }
};

//递归查找菜单
const findMenu = async (key: any, menuTree: any) => {
  let menuData = null;
  for (let item of menuTree) {
    if (item.menuId == key) {
      menuData = item;
      break;
    } else if (item.children) {
      menuData = await findMenu(key, item.children);
      if (menuData) {
        break;
      }
    }
  }
  return menuData;
};

const findMenuPath = (targetId: any, nodes: any[], path: any[] = []): any[] => {
  for (const node of nodes) {
    const nextPath = [...path, node];
    if (String(node.menuId) === String(targetId)) return nextPath;
    if (node.children?.length) {
      const childPath = findMenuPath(targetId, node.children, nextPath);
      if (childPath.length) return childPath;
    }
  }
  return [];
};

const buildBreadcrumbItems = (targetId: any) =>
  findMenuPath(targetId, menuTree.value)
    .filter(item => item.menuName && item.menuName !== "数据资源")
    .map(item => ({
      label: item.menuName,
      menuId: String(item.menuId),
      clickable: !item.children?.length
    }));

/** 判定菜单是否在一级「专题数据」分支下 */
const isUnderThematicData = (node: { menuId: any }) => {
  const findPath = (
    nodes: any[],
    targetId: any,
    path: any[] = []
  ): any[] | null => {
    for (const n of nodes) {
      const next = [...path, n];
      if (String(n.menuId) === String(targetId)) return next;
      if (n.children?.length) {
        const r = findPath(n.children, targetId, next);
        if (r) return r;
      }
    }
    return null;
  };
  const p = findPath(menuTree.value, node.menuId);
  return !!(p && p[0]?.menuName === "专题数据");
};

const handleClose = (key: string, keyPath: string[]) => {
  console.log(key, keyPath);
};

const getMenuTree = async () => {
  const { data } = await getStMenuInfoTree();

  data.map((item: any) => {
    if (item.menuName == "数据资源") {
      menuTree.value = item.children;
    }
  });

  // 仅收集模板里实际渲染为 el-sub-menu 的 index，避免与 menu-item 同 index 冲突
  const collectOpenedIds = (nodes: any[]): string[] => {
    const ids: string[] = [];
    for (const lv_1 of nodes) {
      if (!lv_1.children || lv_1.menuName === "遥感产品") continue;
      if (lv_1.status || lv_1.menuName === "现场观测数据") {
        ids.push(String(lv_1.menuId));
        for (const lv_2 of lv_1.children || []) {
          if (lv_2.children?.length) {
            ids.push(String(lv_2.menuId));
            for (const lv_3 of lv_2.children || []) {
              if (lv_3.children?.length) {
                ids.push(String(lv_3.menuId));
              }
            }
          }
        }
      }
    }
    return ids;
  };

  defaultOpeneds.value = collectOpenedIds(menuTree.value);

  menuTree.value.forEach(item => {
    item.status = Number(item.status);
    if (item.children && item.menuName == "现场观测数据") {
      item.children.forEach(child => {
        child.status = Number(child.status);
        if (child.menuName == "观测仪器数据集") {
          (child.children || []).forEach(grandChild => {
            grandChild.isEqu = true;
          });
        }
        if (child.menuName == "观测结果数据集") {
          child.isVoyage = true;
        }
      });
    }
  });
};

const pagination = reactive({
  total: 0,
  currentPage: 1,
  pageSize: 9,
  pid: "",
  menuId: ""
});
import bgImg from "@/assets/common/Group_1321315329@2x.png";
import bgLongImg from "@/assets/common/Group_1321315329@2x_1.png";
const actionId = ref("233");
const handleMenuItem = async (data: any, index?: any, pid?: any) => {
  console.log("data222", data);
  const breadcrumbItems = buildBreadcrumbItems(index ?? data.menuId);
  // 先清除已设置的背景图片
  const isActive = document.getElementById(index);
  const agoActive = document.getElementById(actionId.value);
  if (agoActive) {
    agoActive.style.backgroundImage = "";
    agoActive.style.color = "#0f6ab9";
  }

  if (isActive) {
    isActive.style.backgroundImage = !isCollapse.value
      ? `url(${bgLongImg})`
      : `url(${bgImg})`;
    isActive.style.backgroundRepeat = "no-repeat";
    isActive.style.backgroundSize = "100% 100%";
  }
  actionId.value = index;

  await bus.emit("closePopover");
  bus.emit("panelTitle", data);
  bus.emit("showSearchPanel", false);
  bus.emit("clearSearchData");
  console.log(data);
  if (data.menuName == "观测结果数据集" || data.isVoyage) {
    activeMenu.value = String(index);
    bus.emit("isnEqu_voyage");
    bus.emit("showPanel", true);
  } else if (data.menuName == "观测仪器数据集") {
    bus.emit("isEqu_voyage");
    bus.emit("showPanel", false);
    bus.emit("handleSetData");
    activeMenu.value = String(index);
    bus.emit("isEqu_voyage");
    bus.emit("showPanel", false);
    const res = await stInstrumentsInfo();
    emit("getDataList", {
      data: res.data,
      menuId: index,
      type: "instrument",
      breadcrumbItems
    });
  } else if (
    data.menuName != "遥感产品" &&
    data.menuName != "现场观测数据" &&
    data.menuName != "观测结果数据集" &&
    !data.isEqu
  ) {
    bus.emit("isEqu_voyage");
    bus.emit("showPanel", false);
    bus.emit("handleSetData");
    activeMenu.value = String(index);
    await getAlgorithmCatalogList({ pid: data.catalogId }).then(async res => {
      pagination.menuId = index;
      const thematic = isUnderThematicData(data);
      emit("getDataList", {
        data: res.data,
        menuId: index,
        pid: data.catalogId,
        type: "catalog",
        isThematicData: thematic,
        breadcrumbItems
      });
      if (pid) {
        const res2 = await getAlgorithmCatalogPage({
          pid: pid,
          pageSize: pagination.pageSize,
          pageNum: 1
        });
        emit("getDataList", {
          data: res2.data,
          menuId: index,
          type: "catalog",
          isThematicData: thematic,
          pageNum: 1,
          breadcrumbItems
        });
      }
    });
  } else if (!data.isEqu) {
    activeMenu.value = String(index);
    bus.emit("isnEqu_voyage");
    bus.emit("showPanel", true);
    // const res = await getAlgorithmCatalogList({ pid: data.catalogId });
    console.log("getDataList", data);
  } else {
    // bus.emit("showPanel", false);
    // bus.emit("isEqu_voyage");
    // const res = await getStInstrumentInfoAll();
    // res.data.forEach((item: any) => {
    //   item.isEqu = true;
    // });
    // emit(
    //   "getDataList",
    //   { data: res.data, menuId: index, menuName: data.menuName },
    //   true
    // );
  }
};

/** 专题目录第三级列表分页 */
const loadCatalogPage = async (catalogPid?: string, pageNum = 1) => {
  const res = await getAlgorithmCatalogPage({
    pid: catalogPid,
    pageSize: pagination.pageSize,
    pageNum
  });
  const menuData = await findMenu(pagination.menuId, menuTree.value);
  emit("getDataList", {
    data: res.data,
    menuId: pagination.menuId,
    type: "catalog",
    isThematicData: menuData ? isUnderThematicData(menuData) : false,
    pageNum,
    breadcrumbItems: buildBreadcrumbItems(pagination.menuId)
  });
};

const activateMenu = async (menuId: any, pid?: any) => {
  const menuData = await findMenu(menuId, menuTree.value);
  if (!menuData || menuData.children?.length) return;
  await handleMenuItem(menuData, menuData.menuId, pid);
};

const onCollapseBtn = async () => {
  isCollapse.value = !isCollapse.value;
  bus.emit("isCollapse");
};

/** 与模板顺序一致，取第一个可点击菜单项 */
const getFirstActivatableMenu = (nodes: any[]): any | null => {
  for (const lv_1 of nodes) {
    if (!lv_1.children || lv_1.menuName === "遥感产品") {
      return lv_1;
    }
    if (lv_1.status || lv_1.menuName === "现场观测数据") {
      for (const lv_2 of lv_1.children || []) {
        if (!lv_2.children) {
          return lv_2;
        }
        for (const lv_3 of lv_2.children || []) {
          if (!lv_3.children) {
            return lv_3;
          }
        }
      }
    }
  }
  return null;
};

onMounted(async () => {
  await getMenuTree();
  const pid = route.query.pid;
  const qMenuId = route.query.menuId;

  if (qMenuId) {
    activeMenu.value = String(qMenuId);
    let menuData = await findMenu(activeMenu.value, menuTree.value);
    if (menuData?.menuName === "现场观测数据" && menuData.children?.length) {
      const voyageChild =
        menuData.children.find((c: any) => c.menuName === "观测结果数据集") ||
        menuData.children.find((c: any) => c.isVoyage);
      if (voyageChild) {
        menuData = voyageChild;
        activeMenu.value = String(voyageChild.menuId);
      }
    }
    menuKey.value++;
    await nextTick();
    if (menuData) handleMenuItem(menuData, menuData.menuId, pid);
  } else {
    const first = getFirstActivatableMenu(menuTree.value);
    if (first) {
      activeMenu.value = String(first.menuId);
      menuKey.value++;
      await nextTick();
      handleMenuItem(first, first.menuId);
    }
  }
});

defineExpose({
  dataList,
  isCollapse,
  loadCatalogPage,
  activateMenu
});
</script>

<style lang="less" scoped>
::-webkit-scrollbar {
  opacity: 0;
  width: 5px;
  background-color: rgba(255, 255, 255, 0);
}

::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0);
  // border-radius: 5px;
}
.menu {
  position: absolute;
  // width: 300px;
  overflow-y: auto;
  border: none;
  height: 100%;
  background-color: #bee1ff;

  .menu-tree {
    border: none;
    // height: 100%;
  }
  &:hover {
    &::-webkit-scrollbar {
      width: 5px;
      // background-color: rgb(255, 255, 255);
    }

    // &::-webkit-scrollbar-thumb {
    //   // background-color: #ffffff;
    //   // border-radius: 5px;
    // }
  }
}

:deep(.el-menu-item) {
  color: #0f6ab9;
  &:hover {
    background-color: #bee1ff;
    // background-image: url("@/assets/common/Group_1321315329@2x(1).png");
  }
}
:deep(.el-menu-item.is-active) {
  background-color: #bee1ff;
  // color: #ffffff;
  background-image: url("@/assets/common/Group_1321315329@2x.png");
  background-repeat: no-repeat;
  background-size: 100% 100%;
}
</style>

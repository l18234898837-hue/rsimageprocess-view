<!-- 重写图标选择组件 by xdp -->
<template>
  <div class="flex-s w-full">
    <el-input
      v-model="icon"
      type="text"
      placeholder="请选择图标"
      @input="updateIcon"
    >
      <template #suffix>
        <el-popover
          ref="iconPopover"
          placement="left"
          :width="400"
          trigger="hover"
        >
          <template #reference>
            <IconifyIconOffline
              width="16"
              icon="search"
              style="outline: none"
              class="cursor-pointer"
            />
          </template>
          <el-scrollbar>
            <ul class="flex flex-wrap">
              <li
                v-for="(item, index) of IconJson"
                :key="index"
                class="icon-item p-2 w-1/10 cursor-pointer flex justify-center items-center icon-hover"
                @click="onChangeIcon(item)"
              >
                <IconifyIconOffline :icon="item" width="20" />
              </li>
            </ul>
          </el-scrollbar>
        </el-popover>
      </template>
    </el-input>
    <IconifyIconOffline :icon="icon" width="20" class="ml-2" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, toRefs, onMounted } from "vue";
//用于图标下拉框选择
const IconJson = [
  "check",
  "menu",
  "homeFilled",
  "setUp",
  "edit",
  "setting",
  "lollipop",
  "link",
  "position",
  "histogram",
  "refreshRight",
  "arrowDown",
  "close",
  "closeBold",
  "bell",
  "guide",
  "iphone",
  "location",
  "tickets",
  "officeBuilding",
  "notebook",
  "videoPlay",
  "rank",
  "monitor",
  "search",
  "refresh",
  "edits",
  "delete",
  "more",
  "top",
  "arrowRightSLine",
  "arrowLeftSLine",
  "logoutCircleRLine",
  "nodeTree",
  "ubuntuFill",
  "questionLine",
  "checkboxCircleLine",
  "informationLine",
  "closeCircleLine",
  "arrowUpLine",
  "arrowDownLine",
  "bookmark2Line",
  "add",
  "listCheck",
  "more2Fill",
  "database",
  "dict",
  "card",
  "reset",
  "dept",
  "password",
  "ppt",
  "terminalWindowLine",
  "user",
  "lock",
  "userSettingsFill",
  "baseStationFill",
  "barricadeLine",
  "menuUnfoldFill",
  "line-chart-fill",
  "pie-chart-fill",
  "qrCodeLine"
];

const props = defineProps({
  modelValue: {
    require: false,
    type: String
  }
});

const state = reactive({
  icon: ""
});
const { icon } = toRefs(state);

const iconPopover = ref(null);
const onChangeIcon = item => {
  state.icon = item;
  updateIcon();
  iconPopover.value.hide();
};

const emit = defineEmits<{ (e: "update:modelValue", v: string) }>();
const updateIcon = () => {
  emit("update:modelValue", state.icon);
};

onMounted(() => {
  state.icon = props.modelValue;
});

watch(
  () => props.modelValue,
  newValue => {
    if (newValue) {
      state.icon = newValue;
    } else {
      state.icon = "";
    }
  }
);
</script>
<style scoped lang="scss">
.icon-hover {
  transition: all ease 0.2s;

  &:hover {
    transform: scale(0.85);
  }
}
</style>

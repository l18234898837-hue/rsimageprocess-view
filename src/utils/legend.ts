import bus from "./bus";
import { pageSysColorRamp } from "@/api/ribbon";
import { ref } from "vue";

let dataList = ref([]);
const getLegendList = () => {
  pageSysColorRamp({
    name: "",
    pageNum: 1,
    pageSize: 9999999
  }).then(({ rows }) => {
    dataList.value = rows.filter(item => item.name === "默认色带");
  });
};

getLegendList();

// 重置色带的工具函数
export const resetLegend = () => {
  bus.emit("updateLegend", dataList.value[0]);
};

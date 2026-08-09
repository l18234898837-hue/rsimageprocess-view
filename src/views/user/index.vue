<template>
  <div class="flex flex-col justify-center items-center box-border h-full">
    <div
      :class="[
        'border-[1px] border-[#87cbf0] rounded-[10px] p-[30px] pb-0  bg-[#ffffff]',
        'w-[75%] flex flex-col justify-center items-center'
      ]"
    >
      <div class="w-[95%] h-[40px] flex justify-between items-center">
        <el-breadcrumb :separator-icon="ArrowRight">
          <el-breadcrumb-item :to="{ path: '/' }">
            <span class="font-[YouSheBiaoTiHei] text-[#545353]">首页</span>
          </el-breadcrumb-item>
          <el-breadcrumb-item>
            <span class="font-[YouSheBiaoTiHei] text-[#545353]">
              {{ $route.meta.title }}
            </span>
          </el-breadcrumb-item> </el-breadcrumb
        ><el-button type="" size="small" plain @click="$router.back"
          >返回</el-button
        >
      </div>
      <div class="w-[95%] border-y-[3px] border-[#87cbf0]">
        <div class="flex flex-col items-center pt-[10px] mt-[30px]">
          <el-avatar
            :size="80"
            src="https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png"
          />
          <div class="min-w-[80px] pl-[20px] flex mt-[20px] text-[#545353]">
            <div class="px-2">
              <span class="font-[YouSheBiaoTiHei]">用户名:&nbsp;</span>
              <span>{{ userStore.info.nickName }}</span>
            </div>
            <div class="px-2">
              <span class="font-[YouSheBiaoTiHei]">用户ID:&nbsp;</span>
              <span>{{ userStore.info.userId }}</span>
            </div>
          </div>
        </div>
        <div class="font-[YouSheBiaoTiHei] p-2 text-[#545353]" />
      </div>
      <div class="w-[95%] my-[30px] flex-1">
        <el-tabs
          type="border-card"
          style="overflow: hidden; border-color: #87cbf0; border-radius: 10px"
          @tab-click="handleTabClick"
        >
          <el-tab-pane label="基本信息">
            <div class="box-border p-[30px] flex justify-center items-center">
              <div class="w-[300px]">
                <el-form
                  ref="userRef"
                  label-width="100px"
                  :rules="rules"
                  :model="form"
                  label-position="top"
                >
                  <el-form-item label="姓名" prop="nickName">
                    <el-input
                      v-model="form.nickName"
                      placeholder="请输入姓名"
                      :disabled="isFormDisabled"
                  /></el-form-item>
                  <el-form-item label="电子邮件" prop="email">
                    <el-input
                      v-model="form.email"
                      placeholder="请输入邮箱"
                      :disabled="isFormDisabled"
                  /></el-form-item>
                  <el-form-item
                    class="w-[300px]"
                    label-width="100px"
                    style="margin-top: 40px"
                  >
                    <el-button
                      v-if="isFormDisabled"
                      class="w-[300px]"
                      type="primary"
                      :loading="loading"
                      @click="isFormDisabled = false"
                      >修改</el-button
                    >
                    <el-button
                      v-show="!isFormDisabled"
                      class="w-[47.5%]"
                      type="primary"
                      :loading="loading"
                      @click="onSubmit(userRef)"
                      >确定</el-button
                    >
                    <el-button
                      v-show="!isFormDisabled"
                      class="w-[47.5%]"
                      @click="reset"
                      >取消</el-button
                    >
                  </el-form-item>
                </el-form>
              </div>
            </div>
          </el-tab-pane>
          <el-tab-pane label="下载记录" name="downloadLog">
            <downloadLogTable />
          </el-tab-pane>
          <el-tab-pane
            label="计算结果上传申请记录"
            name="calculationResultApplyLog"
          >
            <calculationResultApplyLogTable />
          </el-tab-pane>
        </el-tabs>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { toRefs, onMounted, ref, reactive, nextTick } from "vue";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import { ArrowRight, View } from "@element-plus/icons-vue";
import { useUserStoreHook } from "@/store/modules/user";
import { useRouter } from "vue-router";
import {
  updatePwd,
  updateProfile,
  getStDownloadLogPage,
  getStCalculationResultApplyLogPage
} from "@/api/user";
import { ElMessage } from "element-plus";
import downloadLogTable from "./table/downloadLogTable.vue";
import calculationResultApplyLogTable from "./table/calculationResultApplyLogTable.vue";

const userStore: any = useUserStoreHook();
const data = reactive({
  form: {
    userName: "",
    email: "",
    password: "",
    userId: userStore.info.userId,
    nickName: userStore.info.nickName,
    oldPassword: "",
    newPassword: ""
  } as any,
  rules: {
    nickName: [
      { required: true, message: "用户名称不能为空", trigger: "blur" },
      {
        min: 2,
        max: 20,
        message: "用户名称长度必须介于 2 和 20 之间",
        trigger: "blur"
      }
    ],
    password: [
      { required: true, message: "用户密码不能为空", trigger: "blur" },
      {
        min: 5,
        max: 20,
        message: "用户密码长度必须介于 5 和 20 之间",
        trigger: "blur"
      }
    ],
    oldPassword: [
      { required: true, message: "旧密码不能为空", trigger: "blur" },
      {
        min: 5,
        max: 20,
        message: "旧密码长度必须介于 5 和 20 之间",
        trigger: "blur"
      }
    ],
    newPassword: [
      { required: true, message: "新密码不能为空", trigger: "blur" },
      {
        min: 5,
        max: 20,
        message: "新密码长度必须介于 5 和 20 之间",
        trigger: "blur"
      }
    ],
    email: [
      { required: true, message: "邮箱地址不能为空", trigger: "blur" },
      {
        type: "email",
        message: "请输入正确的邮箱地址",
        trigger: ["blur", "change"]
      }
    ],
    phonenumber: [
      {
        pattern: /^1[3|4|5|6|7|8|9][0-9]\d{8}$/,
        message: "请输入正确的手机号码",
        trigger: "blur"
      }
    ]
  } as any
});
const isFormDisabled = ref(true);
const userRef = ref();
const loading = ref(false);

const { form, rules } = toRefs(data);

const onSubmit = (formEl: any) => {
  formEl.validate(async (valid: any) => {
    if (valid) {
      console.log("submit!");
      await updateProfile(form.value).then(async () => {
        // await updatePwd(form.value);
        await getUserInfo();
      });
      ElMessage({
        message: "修改成功",
        type: "success"
      });
    } else {
      console.log("error submit!!");
      return false;
    }
  });
};

const getUserInfo = async () => {
  // 获取用户信息
  await userStore.getUserInfo();
  form.value.nickName = userStore.info.nickName;
  form.value.email = userStore.info.email;
  form.value.password = "";
  form.value.oldPassword = "";
  form.value.newPassword = "";
  isFormDisabled.value = true;
};

/** 表单重置 */
const reset = () => {
  isFormDisabled.value = true;
  if (userRef.value?.resetFields) {
    // userRef.value.resetFields();
    getUserInfo();
  }
};

const handleTabClick = (tab, event) => {
  // console.log(tab.props.name);
};

onMounted(() => {
  // 初始化用户信息
  getUserInfo();
});
</script>

<style lang="less" scoped>
:deep(.el-form-item__label) {
  color: #545353;
  text-wrap: nowrap;
}
:deep(.el-tabs--border-card > .el-tabs__header .el-tabs__nav) {
  width: 100%;
  // background: linear-gradient(180deg, rgba(31, 106, 187, 0) 0%, #1b62ad 100%);
  border: none;
}
:deep(.el-tabs--border-card > .el-tabs__header .el-tabs__item.is-active) {
  border: none;
  // background: linear-gradient(180deg, rgba(31, 106, 187, 0) 0%, #3485db 100%);
  font-family:
    Source Han Sans SC,
    Source Han Sans SC;
  font-weight: 400;
  color: #545353;
  letter-spacing: 1px;
  text-align: center;
  font-style: normal;
  text-transform: none;
}
:deep(.el-tabs--border-card > .el-tabs__header .el-tabs__item) {
  font-family:
    Source Han Sans SC,
    Source Han Sans SC;
  font-weight: 400;
  color: #545353;
  letter-spacing: 1px;
  text-align: center;
  font-style: normal;
  text-transform: none;
  // width: 50%;
  border: none;
}
:deep(.el-tabs--border-card) {
  // background: #042c67;
  border: rgba(210, 210, 212, 0.8) 1px solid;
}
// :deep(.el-tabs--border-card > .el-tabs__header) {
//   // background-color: #042c67;
// }
// :deep(.el-tabs--border-card) {
//   .el-input__wrapper {
//     // background-color: rgba(85, 129, 182, 0.5);
//     box-shadow: inset 0 0 1px rgba(242, 242, 242, 0.8);
//     input {
//       color: #fff;
//     }
//   }
// }
</style>

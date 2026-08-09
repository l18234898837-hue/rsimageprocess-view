<template>
  <div :class="['login-bg', 'absolute right-0 h-full bg-slate-400']">
    <!-- <Motion>
      <div class="l-title">{{ title }}</div>
    </Motion> -->
    <Motion :delay="100">
      <div class="l-form">
        <div class="f-bg">
          <div class="f-title">欢迎登录</div>
          <el-form
            ref="ruleFormRef"
            label-position="top"
            :model="ruleForm"
            size="large"
          >
            <Motion :delay="100">
              <el-form-item
                :rules="[
                  {
                    required: true,
                    message: '请输入账号',
                    trigger: 'blur'
                  }
                ]"
                prop="username"
                label="账号"
              >
                <el-input
                  v-model="ruleForm.username"
                  clearable
                  placeholder="账号"
                  :prefix-icon="useRenderIcon(User)"
                  @keyup.enter="onLogin(ruleFormRef)"
                />
              </el-form-item>
            </Motion>

            <Motion :delay="150">
              <el-form-item
                prop="password"
                :rules="[
                  {
                    required: true,
                    message: '请输入密码',
                    trigger: 'blur'
                  }
                ]"
                label="密码"
              >
                <el-input
                  v-model="ruleForm.password"
                  clearable
                  show-password
                  placeholder="密码"
                  :prefix-icon="useRenderIcon(Lock)"
                  @keyup.enter="onLogin(ruleFormRef)"
                />
              </el-form-item>
            </Motion>

            <!-- <Motion :delay="200">
              <el-form-item prop="code" label="验证码">
                <el-input
                  v-model="ruleForm.code"
                  clearable
                  placeholder="验证码"
                  :prefix-icon="useRenderIcon(ShieldKeyholeLine)"
                  @keyup.enter="onLogin(ruleFormRef)"
                >
                  <template v-slot:append>
                    <img
                      :src="codeUrl"
                      class="cursor-pointer h-[38px]"
                      @click="getCode"
                    />
                  </template>
                </el-input>
              </el-form-item>
            </Motion> -->

            <Motion :delay="200">
              <div class="text-right mt-[-10px] mb-[10px]">
                <el-link type="primary" href="#/forget">忘记密码?</el-link>
              </div>
            </Motion>

            <Motion :delay="250">
              <el-button
                class="w-full"
                size="default"
                type="primary"
                :loading="loading"
                @click="onLogin(ruleFormRef)"
              >
                登录
              </el-button>
            </Motion>
          </el-form>
          <div class="text-center m-[20px]">
            <el-link type="primary" href="#/register">
              <span class="text-[16px]">注册账号</span>
            </el-link>
          </div>
        </div>
      </div>
    </Motion>
  </div>
</template>
<script setup lang="ts">
import Motion from "./utils/motion";
import { useRouter } from "vue-router";
import { message } from "@/utils/message";
import { useNav } from "@/layout/hooks/useNav";
import type { FormInstance } from "element-plus";
import { useUserStoreHook } from "@/store/modules/user";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import { ref, reactive, onMounted, onBeforeUnmount } from "vue";

import Lock from "@iconify-icons/ri/lock-fill";
import User from "@iconify-icons/ri/user-3-fill";
import ShieldKeyholeLine from "@iconify-icons/ri/shield-keyhole-line";

import { getCodeImg } from "@/api/user";
import { resData } from "@/store/types";
import { sm2Encryption } from "@/utils/sm2";

defineOptions({
  name: "Login"
});

const captchaEnabled = ref(true);
const codeUrl = ref("");
const router = useRouter();
const loading = ref(false);
const ruleFormRef = ref<FormInstance>();

const { title } = useNav();

const ruleForm = reactive({
  username: "",
  password: "",
  code: "",
  uuid: ""
});

const onLogin = async (formEl: FormInstance | undefined) => {
  if (loading.value) {
    return;
  }
  if (!formEl) return;
  await formEl.validate((valid, fields) => {
    if (valid) {
      loading.value = true;
      // ruleForm.password = sm2Encryption(ruleForm.password);
      useUserStoreHook()
        .loginByUsername(ruleForm)
        .then(res => {
          if (res.code === 200) {
            // 获取后端路由
            useUserStoreHook()
              .getUserInfo()
              .then(() => {
                // 大屏重写 by xdp
                router.push("/");
                message("登录成功", { type: "success" });
              });
          } else {
            // retrieveCode();
            message("登录失败", { type: "error" });
          }
        })
        .catch(() => {
          retrieveCode();
        })
        .finally(() => (loading.value = false));
    }
  });
};

const retrieveCode = () => {
  loading.value = false;
  // 重新获取验证码
  if (captchaEnabled.value) {
    ruleForm.code = "";
    getCode();
  }
};

const getCode = async () => {
  getCodeImg().then((res: resData) => {
    captchaEnabled.value =
      res.data.captchaEnabled === undefined ? true : res.data.captchaEnabled;
    if (captchaEnabled.value) {
      codeUrl.value = "data:image/gif;base64," + res.data.img;
      ruleForm.uuid = res.data.uuid;
    }
  });
};

/** 使用公共函数，避免`removeEventListener`失效 */
const onkeypress = ({ code }: KeyboardEvent) => {
  if (code === "Enter") {
    onLogin(ruleFormRef.value);
  }
};

onMounted(() => {
  // document.documentElement.classList.add("dark");
  // getCode();
  window.document.addEventListener("keypress", onkeypress);
});

onBeforeUnmount(() => {
  document.documentElement.classList.remove("dark");
  window.document.removeEventListener("keypress", onkeypress);
});
</script>
<style scoped lang="scss">
.login-bg {
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 30%;
  // padding: 30px;
  // background: url("@/assets/login/view-bg.png") no-repeat top center;
  // border: #57adfd 2px solid;
  // margin: 0 auto;
  // margin-top: 100px;
  // border-radius: 10px;
  background-color: rgb(255 255 255 / 70%);

  .l-title {
    // padding: 155px 0 50px;
    font-family: YouSheBiaoTiHei, sans-serif;
    font-size: 48px;
    font-weight: 400;
    text-align: center;
    letter-spacing: 1px;
    // background: linear-gradient(180deg, #fff 37%, #b4cff2 100%);
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .l-form {
    width: 100%;
    // height: 100%;
    // margin: 0 auto;
    // background: url("@/assets/login/Group_1321315327@2x.png") no-repeat;
    // background-size: 100% 100%;
    // margin-top: 100px;

    .f-bg {
      padding: 25px 55px 0;

      .f-title {
        margin-bottom: 20px;
        font-size: 24px;
        // font-weight: 600;
        // color: #fff;
        text-align: left;
        letter-spacing: 2px;
      }
    }
  }

  :deep(.el-input-group__append, .el-input-group__prepend) {
    padding: 0;
  }

  :deep(.el-form-item--large) {
    margin-bottom: 18px;
  }
}
</style>

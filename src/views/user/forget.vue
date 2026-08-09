<template>
  <div :class="['login-bg', 'absolute right-0 h-full']">
    <!-- <Motion>
      <div class="l-title">{{ title }}</div>
    </Motion> -->
    <Motion :delay="100">
      <div class="l-form">
        <div class="f-bg">
          <div class="f-title">忘记密码</div>
          <el-form
            ref="ruleFormRef"
            :model="ruleForm"
            size="large"
            label-position="top"
            label-width="80"
          >
            <Motion :delay="100">
              <el-form-item
                :rules="[
                  {
                    required: true,
                    message: '请输入正确的邮箱地址',
                    trigger: 'blur',
                    type: 'email'
                  }
                ]"
                prop="email"
                label="电子邮箱"
              >
                <el-input
                  v-model="ruleForm.email"
                  clearable
                  placeholder="请输入邮箱地址"
                  :prefix-icon="useRenderIcon(User)"
                  @keyup.enter="onLogin(ruleFormRef)"
                />
              </el-form-item>
            </Motion>

            <Motion :delay="200">
              <el-form-item
                label="验证码"
                prop="emailCode"
                :rules="[
                  {
                    required: true,
                    message: '请输入验证码',
                    trigger: 'blur'
                  }
                ]"
              >
                <el-input
                  v-model="ruleForm.emailCode"
                  clearable
                  placeholder="验证码"
                  :prefix-icon="useRenderIcon(ShieldKeyholeLine)"
                >
                  <template v-slot:append>
                    <el-button
                      type="primary"
                      style="padding: 0 30px"
                      @click="sendEmail"
                      >{{ codeLoading ? "发送中..." : "获取验证码" }}</el-button
                    >
                  </template>
                </el-input>
              </el-form-item>
            </Motion>

            <Motion :delay="150">
              <el-form-item
                prop="newPassword"
                :rules="[
                  {
                    required: true,
                    trigger: 'blur',
                    validator: (rule: any, value: any, callback: any) => {
                      if (
                        !/^(?![0-9]+$)(?![a-zA-Z]+$)[0-9A-Za-z]{6,16}$/.test(
                          value
                        )
                      ) {
                        callback(new Error('密码必须为6-16位字母加数字组合!'));
                      } else {
                        callback();
                      }
                    }
                  }
                ]"
                label="设置密码"
              >
                <el-input
                  v-model="ruleForm.newPassword"
                  clearable
                  show-password
                  placeholder="请输入密码"
                  :prefix-icon="useRenderIcon(Lock)"
                  @keyup.enter="onLogin(ruleFormRef)"
                />
              </el-form-item>
            </Motion>
            <Motion :delay="150">
              <el-form-item
                prop="again_password"
                :rules="[
                  {
                    required: true,
                    trigger: 'blur',
                    validator: (rule: any, value: any, callback: any) => {
                      if (value !== ruleForm.newPassword) {
                        callback(new Error('两次输入密码不一致!'));
                      } else {
                        callback();
                      }
                    }
                  }
                ]"
                label="确认密码"
              >
                <el-input
                  v-model="ruleForm.again_password"
                  clearable
                  show-password
                  placeholder="请再次输入密码"
                  :prefix-icon="useRenderIcon(Lock)"
                  @keyup.enter="onLogin(ruleFormRef)"
                />
              </el-form-item>
            </Motion>

            <Motion :delay="250">
              <el-button
                class="w-full mt-[25px]"
                size="default"
                type="primary"
                :loading="loading"
                @click="onLogin(ruleFormRef)"
              >
                提交
              </el-button>
            </Motion>
            <Motion :delay="250">
              <el-button
                class="w-full mt-[25px]"
                size="default"
                type="primary"
                link
                @click="router.push('/login')"
              >
                已有账号，返回登陆
              </el-button>
            </Motion>
          </el-form>
        </div>
      </div>
    </Motion>
  </div>
</template>
<script setup lang="ts">
import Motion from "@/views/login/utils/motion";
import { useRouter } from "vue-router";
import { message } from "@/utils/message";
import { useNav } from "@/layout/hooks/useNav";
import { ElMessage } from "element-plus";
import type { FormInstance } from "element-plus";
import { useUserStoreHook } from "@/store/modules/user";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import { ref, reactive, onMounted, onBeforeUnmount } from "vue";

import Lock from "@iconify-icons/ri/lock-fill";
import User from "@iconify-icons/ri/user-3-fill";
import ShieldKeyholeLine from "@iconify-icons/ri/shield-keyhole-line";

import {
  getCodeImg,
  sendResetPasswordEmail,
  verifyResetPasswordEmail
} from "@/api/user";
import { resData } from "@/store/types";
import { sm2Encryption } from "@/utils/sm2";

defineOptions({
  name: "Login"
});

const captchaEnabled = ref(true);
const codeUrl = ref("");
const router = useRouter();
const loading = ref(false);
const codeLoading = ref(false);
const ruleFormRef = ref<FormInstance>();

const { title } = useNav();

const ruleForm = reactive({
  email: "",
  emailCode: "",
  newPassword: "",
  again_password: ""
});

const sendEmail = async () => {
  if (!ruleForm.email) {
    ElMessage({
      message: "请输入邮箱地址",
      type: "warning"
    });
    return;
  }
  codeLoading.value = true;
  await sendResetPasswordEmail({
    email: ruleForm.email
  });
  codeLoading.value = false;
  ElMessage({
    message: "验证码已发送",
    type: "success"
  });
};

const onLogin = async (formEl: FormInstance | undefined) => {
  if (loading.value) {
    return;
  }
  if (!formEl) return;
  await formEl.validate((valid, fields) => {
    if (valid) {
      loading.value = true;
      verifyResetPasswordEmail({
        email: ruleForm.email,
        emailCode: ruleForm.emailCode,
        newPassword: ruleForm.newPassword
      }).then((res: any) => {
        if (res.code === 200) {
          message(`修改成功`, {
            type: "success",
            onClose: () => {
              router.push("/login");
            }
          });
        } else {
          message("修改失败，请联系管理员", { type: "error" });
        }
      });
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

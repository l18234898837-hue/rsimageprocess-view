<template>
  <div :class="['login-bg', 'absolute right-0 h-full']">
    <!-- <Motion>
      <div class="l-title">{{ title }}</div>
    </Motion> -->
    <Motion :delay="100">
      <div class="l-form">
        <div class="f-bg">
          <div class="f-title">账号注册</div>
          <el-form
            ref="ruleFormRef"
            :model="ruleForm"
            size="large"
            label-position="top"
          >
            <Motion :delay="100">
              <el-form-item
                :rules="[
                  {
                    required: true,
                    message: '请输入账号昵称',
                    trigger: 'blur'
                  }
                ]"
                label="用户昵称"
                prop="nickName"
              >
                <el-input
                  v-model="ruleForm.nickName"
                  clearable
                  placeholder="账号昵称"
                  :prefix-icon="useRenderIcon(User)"
                  @keyup.enter="onLogin(ruleFormRef)"
                />
              </el-form-item>
            </Motion>
            <Motion :delay="100">
              <el-form-item
                :rules="[
                  {
                    required: true,
                    message: '请输入用户名',
                    trigger: 'blur'
                  }
                ]"
                prop="username"
                label="用户名"
              >
                <el-input
                  v-model="ruleForm.username"
                  clearable
                  placeholder="请输入用户名"
                  :prefix-icon="useRenderIcon(User)"
                  @keyup.enter="onLogin(ruleFormRef)"
                />
              </el-form-item>
            </Motion>
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

            <Motion :delay="150">
              <el-form-item
                prop="password"
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
                  v-model="ruleForm.password"
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
                      if (value !== ruleForm.password) {
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
                class="w-full mt-[20px]"
                size="default"
                type="primary"
                :loading="loading"
                @click="onLogin(ruleFormRef)"
              >
                注册
              </el-button>
            </Motion>

            <Motion :delay="250">
              <el-button
                class="w-full mt-[20px]"
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

import { getCodeImg, postRegister } from "@/api/user";
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
  nickName: "",
  email: "",
  password: "",
  again_password: "",
  phonenumber: "",
  roleId: "4",
  userType: "sys_user",
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
      postRegister(ruleForm)
        .then(res => {
          if (res.code === 200) {
            message(`注册成功`, {
              type: "success",
              onClose: () => {
                router.push("/login");
              }
            });
          } else {
            // retrieveCode();
            message("注册失败，请联系管理员", { type: "error" });
            loading.value = false;
          }
        })
        .catch(() => {
          message("注册失败，请联系管理员", { type: "error" });
          loading.value = false;
        });
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

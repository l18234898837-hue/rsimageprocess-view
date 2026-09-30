# 前端全量类型检查治理设计

## 目标

使前端仓库的 `pnpm typecheck`（`tsc --noEmit && vue-tsc --noEmit --skipLibCheck`）通过，同时保持现有页面运行行为和 API 请求契约不变。

本次覆盖当前完整诊断中的 106 项错误，并为历史任务与产物功能恢复可靠的类型检查验收基线。

## 非目标

- 不通过 `any`、`@ts-ignore`、放宽 `tsconfig`、关闭 `vue-tsc` 或跳过构建来隐藏错误。
- 不变更后端接口语义、权限规则、产品处理算法或页面交互流程。
- 不重写无关组件；修复限于错误根因和必要的共享类型。

## 根因分组

1. **数值表单绑定（77 项）**：Element Plus 输入控件的模板值为字符串，但模型字段定义为 number；重复出现在多源参数抽屉和数据源面板。
2. **模板数据模型（18 项）**：字典项、在线数据、菜单响应和树形结构缺少或错误声明，导致模板被推断为 `unknown` 或不包含实际字段。
3. **共享处理模型（6 项）**：ROI 元组被实现为普通数组、`packageValidationIssue` 未在脚本公开、星图表单新增字段没有默认值。
4. **组件契约（5 项）**：表单规则的 trigger 类型、图例入参、异步 API 响应、遗漏的 Element Plus 导入和旧 API 导出名不匹配。

## 设计

### 共享模型优先

在 `src/features/multisource` 提取可复用的 `RoiBounds`、数值字段转换和参数表单辅助类型。ROI 保持固定四元组 `[west, south, east, north]`；可写 `computed` 的 getter 显式返回该元组，setter 只接受该元组。

参数抽屉的数值输入统一通过显式数字转换进入 number 模型，而不是改变模型为 string 或在提交时临时强转。这样 Worker 参数快照、校验规则和 UI 输入始终使用同一个数值契约。

### 局部接口精确化

为字典项、在线影像图层、菜单密码更新响应、图例调用参数和表单规则定义最小真实接口。模板中读取的字段必须在接口中存在；API 调用先 `await` 后读取 `code`、`msg` 和数据字段。禁止使用无边界索引签名替代已知模型。

### 修复顺序

1. 先保留已完成的 TypeScript 基线修复：权限、Axios 扩展配置、Mapbox 坐标、Cesium 属性与影像包装模型，以及 `Menu.vue` 的 TypeScript 脚本。
2. 修复共享 ROI 和多源数值绑定，消除四个参数抽屉和主处理面板的大多数重复错误。
3. 修复通用组件和数据源页面的局部接口错误。
4. 每组后运行相关单元测试和 `pnpm typecheck`；最终运行全量多源测试、类型检查及生产构建。

## 验收标准

- `pnpm typecheck` 退出码为 0。
- `pnpm test:multisource` 全部通过。
- `pnpm build` 退出码为 0。
- 数值字段仍以 number 提交到处理任务快照。
- ROI 仍严格为四个有限数字，顺序为 west/south/east/north。
- 不新增 `@ts-ignore`、`@ts-nocheck`、生产代码 `any` 或 TypeScript 配置降级。

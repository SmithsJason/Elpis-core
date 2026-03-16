# Webpack HMR 热更新 vs 浏览器全量渲染 —— 深度对比分析

> 基于 Elpis-core 项目实际代码的技术分析文档

---

## 目录

- [一、核心问题](#一核心问题)
- [二、两种机制的本质差异](#二两种机制的本质差异)
- [三、传输层对比](#三传输层对比)
- [四、三层协作机制：从模块替换到 DOM 更新](#四三层协作机制从模块替换到-dom-更新)
- [五、全量渲染 vs 局部渲染](#五全量渲染-vs-局部渲染)
- [六、什么是冷启动？](#六什么是冷启动)
- [七、冷启动 vs 热更新：时间线对比](#七冷启动-vs-热更新时间线对比)
- [八、总结对比表](#八总结对比表)

---

## 一、核心问题

> HMR 热更新更新的是模块，通过 diff 算法标记后再批量更新。那它和浏览器从网络线程拿到 HTTP 字符串再去渲染的差别是什么？

这个问题的本质是：**增量更新（HMR）** 和 **全量渲染（冷启动/刷新）** 两种机制，在数据传输、处理流程、渲染方式上的根本区别。

---

## 二、两种机制的本质差异

### 2.1 浏览器全量渲染（HTTP 响应 → 完整渲染）

当用户首次访问页面或刷新页面时：

```
用户访问 http://localhost:8080/view/dashboard
    ↓
① 浏览器发送 HTTP GET 请求
    ↓
② 服务端返回完整 HTML 字符串（Koa + Nunjucks 渲染 entry.dashboard.tpl）
    ↓
③ 浏览器主线程接管：
   ├── HTML Parser 逐字节解析 HTML → 构建 DOM 树
   ├── 遇到 <link> → 下载 CSS → 构建 CSSOM 树
   ├── 遇到 <script> → 下载 JS → 阻塞解析 → 执行 JS
   ├── DOM + CSSOM → 合成 Render Tree
   ├── Layout（布局计算）
   └── Paint（像素绘制）→ Composite（合成图层）→ 用户看到页面
    ↓
④ JS 执行：Vue createApp() → 组件树初始化 → Virtual DOM → 真实 DOM
    ↓
⑤ 用户看到完整页面
```

**特点**：从零开始，一切都要重新来。

### 2.2 HMR 热更新（WebSocket → 增量模块替换）

当开发者修改了某个文件时：

```
开发者修改了 schema-table.vue
    ↓
① webpack-dev-middleware 检测到文件变动 → 增量编译（只编译改了的模块）
    ↓
② HotModuleReplacementPlugin 生成热更新产物：
   ├── hot-update.json（更新清单：哪些模块 ID 变了）
   └── hot-update.js （更新代码：新模块的代码）
    ↓
③ webpack-hot-middleware 通过 SSE 通道推送通知到浏览器
    ↓
④ 浏览器端 HMR Runtime 收到通知 → 拉取 hot-update.js
    ↓
⑤ 在运行时替换旧模块 → Vue HMR API 更新组件 → Virtual DOM Diff → 最小 DOM 操作
    ↓
⑥ 页面局部更新完成，应用状态保持不变
```

**特点**：在已运行的应用上"打补丁"，只替换变化的部分。

---

## 三、传输层对比

### 3.1 全量渲染的传输

| 维度 | 说明 |
|------|------|
| **协议** | HTTP/HTTPS |
| **传输内容** | 完整 HTML + CSS + JS + 图片字体等所有资源 |
| **数据量** | MB 级（`vendors.js` + `entry.dashboard.js` + CSS + 图片） |
| **触发方式** | 用户主动访问/刷新 |
| **传输模式** | 请求-响应，一次性传输 |

### 3.2 HMR 的传输

| 维度 | 说明 |
|------|------|
| **协议** | SSE（Server-Sent Events），长连接 |
| **传输内容** | JSON 格式的模块补丁（仅变化的模块代码） |
| **数据量** | KB 级（通常只有几个模块的代码变化） |
| **触发方式** | 文件保存时自动推送 |
| **传输模式** | 持久连接，实时推送 |

### 3.3 Elpis-core 中的 HMR 通信实现

**服务端（`app/webpack/dev.js`）**：

```javascript
// webpack-dev-middleware：监控文件改动，触发增量编译
app.use(devMiddleware(compiler, {
    writeToDisk: (filePath) => filePath.endsWith('.tpl'),
    publicPath: webpackConfig.output.publicPath,
}));

// webpack-hot-middleware：建立 SSE 通道，推送更新通知
app.use(hotMiddleware(compiler, {
    path: `/${DEV_SERVER_CONFIG.HMR_PATH}`,  // /_webpack_hmr
    log: () => {}
}));
```

**客户端入口注入（`app/webpack/config/webpack.dev.js`）**：

```javascript
// 为每个非 vendor 入口注入 HMR 客户端
Object.keys(baseConfig.entry).forEach(v => {
    if (v !== 'vendor') {
        baseConfig.entry[v] = [
            baseConfig.entry[v],  // 原始入口文件
            // HMR 客户端：连接 SSE 通道，接收更新通知
            `webpack-hot-middleware/client?path=http://${DEV_SERVER_CONFIG.HOST}:${DEV_SERVER_CONFIG.PORT}/${DEV_SERVER_CONFIG.HMR_PATH}&timeout=${DEV_SERVER_CONFIG.TIMEOUT}&reload=true`
        ]
    }
});

// 启用 HMR 插件
plugins: [
    new webpack.HotModuleReplacementPlugin({ multiStep: false })
]
```

---

## 四、三层协作机制：从模块替换到 DOM 更新

HMR 并不是简单地"替换文件"就完事了。**动态替换同样涉及渲染**，但它走的是一条高效的"快捷通道"。整个过程由三层机制协作完成：

### 第 1 层：Webpack HMR Runtime（模块替换）

```
文件修改 → 增量编译 → SSE 推送 → 浏览器拉取新模块代码
→ HMR Runtime 在模块注册表中用新模块替换旧模块
```

这一层只负责 **JavaScript 模块级别的替换**，相当于更新了"数据源"。

### 第 2 层：Vue HMR API（组件级更新）

```
模块替换完成 → vue-loader 注入的 HMR 钩子被触发
→ 更新组件的 render 函数 / setup / style
→ 调用组件实例的 $forceUpdate() 触发重新渲染
```

关键点：**只触发被修改组件的重新渲染**，而不是整个组件树。

### 第 3 层：Vue Virtual DOM Diff（最小化 DOM 操作）

```
$forceUpdate() → 执行新的 render 函数 → 生成新 Virtual DOM
→ 新旧 Virtual DOM 进行 Diff 对比
→ 计算出最小变更集（Patch）
→ 仅对变化的 DOM 节点执行更新操作
→ 浏览器局部重绘/重排
```

### 以 `schema-table.vue` 为例

假设修改了 `schema-table.vue` 中表格的样式：

```vue
<!-- 修改前 -->
<el-table class="table"></el-table>

<!-- 修改后：增加了 border -->
<el-table class="table" border></el-table>
```

**HMR 处理流程**：

```
① Webpack 只重新编译 schema-table.vue 这一个模块（~10ms）
    ↓
② SSE 推送更新通知（~1KB JSON）
    ↓
③ HMR Runtime 替换 schema-table 模块
    ↓
④ Vue HMR API 更新该组件的 render 函数
    ↓
⑤ Virtual DOM Diff 发现只有 <el-table> 多了一个 border 属性
    ↓
⑥ DOM 操作：element.setAttribute('border', '')  ← 只操作了一个 DOM 节点
    ↓
⑦ 浏览器局部重绘 ← 不涉及其他任何组件
```

**如果是全量刷新**：

```
① 浏览器丢弃当前整个页面
    ↓
② 重新请求 HTML（1 次 HTTP 请求）
    ↓
③ 重新下载所有 JS/CSS（即使有缓存，也需要 304 验证）
    ↓
④ 重新执行 boot.js → createApp → ElementUI → Pinia → Router → mount
    ↓
⑤ 重建整个组件树的 Virtual DOM → 首次渲染 → 全量 DOM 构建
    ↓
⑥ 所有应用状态丢失（表单数据、滚动位置、展开/折叠状态等）
```

---

## 五、全量渲染 vs 局部渲染

### 5.1 渲染管线起点差异

两种机制最终都会"渲染"，但**渲染管线的起点完全不同**：

```
完整浏览器渲染管线（全量渲染走完全程）：

 ┌─────────────────────────────────────────────────────────────────────┐
 │ 网络请求 → HTML解析 → DOM构建 → CSSOM构建 → JS下载执行               │
 │    → Vue初始化 → 组件树构建 → Virtual DOM → 真实DOM                  │
 │    → Layout → Paint → Composite                                    │
 └─────────────────────────────────────────────────────────────────────┘
   ▲ 全量渲染从这里开始（第1步）


 ┌─────────────────────────────────────────────────────────────────────┐
 │ 网络请求 → HTML解析 → DOM构建 → CSSOM构建 → JS下载执行               │
 │    → Vue初始化 → 组件树构建 → [Virtual DOM Diff] → [最小DOM操作]      │
 │    → [局部 Layout] → [局部 Paint] → Composite                      │
 └─────────────────────────────────────────────────────────────────────┘
                                       ▲ HMR 从这里开始（跳过了前面80%的步骤）
```

### 5.2 HMR 跳过了什么？

| 步骤 | 全量渲染 | HMR 热更新 |
|------|---------|-----------|
| HTTP 请求 HTML | ✅ 执行 | ❌ 跳过 |
| HTML 解析 → DOM 树 | ✅ 全量构建 | ❌ 跳过（复用现有 DOM） |
| 下载 CSS → CSSOM | ✅ 执行 | ❌ 跳过 |
| 下载 JS bundles | ✅ 全部下载 | ⚡ 只下载变化模块（KB级） |
| JS 解析/编译 | ✅ 全量 | ⚡ 只解析变化模块 |
| Vue createApp() | ✅ 执行 | ❌ 跳过（复用现有实例） |
| ElementUI / Pinia 初始化 | ✅ 执行 | ❌ 跳过 |
| Router 初始化 | ✅ 执行 | ❌ 跳过 |
| Virtual DOM 构建 | ✅ 全量 | ⚡ 单组件 |
| Virtual DOM Diff | ❌ 无（首次渲染无旧树） | ✅ 新旧对比，找出最小变更 |
| DOM 操作 | ✅ 全量创建 | ⚡ 最小化 Patch |
| Layout（布局） | ✅ 全页面 | ⚡ 局部 |
| Paint（绘制） | ✅ 全页面 | ⚡ 局部重绘 |
| **应用状态** | ❌ **全部丢失** | ✅ **完整保留** |

---

## 六、什么是冷启动？

### 6.1 定义

**冷启动（Cold Start）**：指应用程序从**完全停止的状态**启动运行，没有任何预热缓存、预加载资源或已初始化的环境可以复用。一切从零开始。

与之对应的是 **热启动（Warm Start / Hot Start）**：应用已经在运行中，新操作可以复用已有的资源和环境。

### 6.2 Elpis-core 中的冷启动过程

当用户首次访问 `http://localhost:8080/view/dashboard` 时，完整的冷启动时间线如下：

```
时间线（冷启动）≈ 1.5 ~ 3 秒
─────────────────────────────────────────────────────────────────────

[0ms]     浏览器发送 HTTP 请求
              ↓
[50ms]    Koa 返回 HTML 壳页面（Nunjucks 渲染 entry.dashboard.tpl）
              ↓
[100ms]   浏览器解析 HTML，发现 <script> 标签
              ↓
[100~500ms] 下载 JS 资源：
            ├── vendors.js（Vue + Element Plus + Pinia + axios）≈ 800KB
            ├── common.js（公共业务组件）≈ 100KB
            └── entry.dashboard.js（Dashboard 页面代码）≈ 200KB
              ↓
[500~800ms] 浏览器 JS 引擎解析 + 编译所有 JavaScript 代码
              ↓
[800ms]   开始执行 entry.dashboard.js：
```

**`entry.dashboard.js`** —— 页面入口：

```javascript
import boot from '$pages/boot.js';
import dashboard from './dashboard.vue';

const routers = [];
routers.push({
    path: '/iframe',
    component: () => import('./complex-view/iframe-view/iframe-view.vue'),
});
routers.push({
    path: '/schema',
    component: () => import('./complex-view/schema-view/schema-view.vue'),
});
routers.push({
    path: '/todo',
    component: () => import('./todo/todo.vue'),
});
routers.push({
    path: '/sider',
    component: () => import('./complex-view/sider-view/sider-view.vue'),
    children: [/* 子路由... */]
});

boot(dashboard, { routers });
```

**`boot.js`** —— Vue 应用启动器：

```javascript
import { createApp } from "vue";
import ElementUi from 'element-plus';
import 'element-plus/theme-chalk/index.css';
import 'element-plus/theme-chalk/dark/css-vars.css';
import pinia from "$store";
import { createRouter, createWebHashHistory } from "vue-router";

export default (pageComponent, { routers = [], libs = [] } = {}) => {
    const app = createApp(pageComponent);       // ← [800ms] 创建 Vue 实例

    app.use(ElementUi);                         // ← [850ms] 注册 Element Plus（80+ 组件）
    app.use(pinia);                             // ← [900ms] 注册 Pinia 状态管理

    const router = createRouter({
        history: createWebHashHistory(),         // ← [920ms] 创建路由
        routes: routers,
    });
    app.use(router);

    router.isReady().then(() => {
        app.mount('#root');                      // ← [1000ms] 挂载到 DOM → 触发首次渲染
    });

    // [1000~1500ms] Vue 递归创建组件树 → Virtual DOM → 真实 DOM
    // [1500~2000ms] Layout + Paint + 数据请求 → 页面完整呈现
}
```

### 6.3 冷启动时间分解

```
┌────────────────────────────────────────────────────────────────────┐
│                     冷启动时间分解（≈2秒）                          │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  [网络传输]     ████████░░░░░░░░░░░░░░░░░░░░  500ms  (25%)       │
│  HTTP请求 + 资源下载                                                │
│                                                                    │
│  [JS 解析编译]  ░░░░░░░░████████░░░░░░░░░░░░  300ms  (15%)       │
│  V8引擎解析+编译JS代码                                              │
│                                                                    │
│  [框架初始化]   ░░░░░░░░░░░░░░░░████░░░░░░░░  200ms  (10%)       │
│  createApp + ElementUI + Pinia + Router                            │
│                                                                    │
│  [组件树渲染]   ░░░░░░░░░░░░░░░░░░░░██████░░  500ms  (25%)       │
│  VNode树构建 + 真实DOM创建                                          │
│                                                                    │
│  [布局+绘制]    ░░░░░░░░░░░░░░░░░░░░░░░░░░██  500ms  (25%)       │
│  Layout + Paint + Composite + 数据请求                              │
│                                                                    │
│  总计：约 2000ms                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### 6.4 冷启动的本质特征

| 特征 | 说明 |
|------|------|
| **无缓存可用** | JS 引擎没有编译缓存，需要从源码开始解析 |
| **无实例复用** | Vue App、Router、Store 都要从零创建 |
| **无 DOM 复用** | `<div id="root"></div>` 是空的，所有 DOM 节点都要新建 |
| **无状态** | 表单数据、滚动位置、展开状态等全部为空 |
| **全量资源加载** | 所有 JS/CSS/字体/图片都要下载（首次）或验证缓存 |

---

## 七、冷启动 vs 热更新：时间线对比

### 7.1 冷启动时间线（≈2000ms）

```
[0ms]        HTTP 请求发出
[50ms]       HTML 壳页面到达
[100ms]      开始下载 JS/CSS 资源
[500ms]      JS 资源下载完成
[800ms]      JS 解析编译完成，开始执行
[800ms]      createApp(dashboard)
[850ms]      app.use(ElementUI)        — 注册 80+ 组件
[900ms]      app.use(pinia)            — 注册状态管理
[920ms]      createRouter()            — 创建路由实例
[1000ms]     app.mount('#root')        — 首次渲染开始
[1000~1500ms] 组件树递归创建 → Virtual DOM → 真实 DOM
[1500~2000ms] Layout + Paint + API 数据请求
[2000ms]     ✅ 页面完整可交互
```

### 7.2 HMR 热更新时间线（≈150ms）

```
[0ms]        文件保存，Webpack 检测到变动
[10ms]       增量编译完成（只编译改了的模块）
[15ms]       SSE 推送更新通知（~1KB）
[20ms]       浏览器收到通知，拉取 hot-update.js
[30ms]       HMR Runtime 替换模块
[50ms]       Vue HMR API 更新组件 render 函数
[80ms]       Virtual DOM Diff（单组件）
[100ms]      DOM Patch（最小化操作）
[120ms]      局部重绘/重排
[150ms]      ✅ 页面更新完成，状态保持
```

### 7.3 性能差异

```
冷启动：  ████████████████████████████████████████  ~2000ms
HMR：     ██████                                    ~150ms

性能差异：约 10~15 倍
```

### 7.4 原因分析

HMR 之所以快 10 倍以上，是因为它**跳过了冷启动中最耗时的环节**：

| 环节 | 冷启动耗时 | HMR 耗时 | 原因 |
|------|-----------|----------|------|
| HTTP 请求 + 资源下载 | ~500ms | ~15ms | HMR 只传输变化模块（KB vs MB） |
| JS 全量解析编译 | ~300ms | ~10ms | 只解析变化的模块代码 |
| createApp + 插件注册 | ~200ms | 0ms | 复用现有 Vue 实例 |
| 全量组件树构建 | ~500ms | ~50ms | 只重建被修改的组件 |
| 全页面 Layout + Paint | ~500ms | ~50ms | 只局部重绘 |
| **总计** | **~2000ms** | **~150ms** | **快约 13 倍** |

---

## 八、总结对比表

| 维度 | 全量渲染（冷启动/刷新） | HMR 热更新 |
|------|------------------------|-----------|
| **触发方式** | 用户访问 URL / 手动刷新 | 开发者保存文件，自动触发 |
| **传输协议** | HTTP 请求-响应 | SSE 长连接实时推送 |
| **传输数据量** | MB 级（完整 HTML + JS + CSS + 资源） | KB 级（仅变化模块的 JSON 补丁） |
| **渲染范围** | 全页面，从零构建 | 仅变化组件的局部更新 |
| **DOM 处理** | 销毁旧 DOM → 全量创建新 DOM | Virtual DOM Diff → 最小化 Patch |
| **Vue 实例** | 重新创建（createApp） | 复用现有实例 |
| **应用状态** | ❌ 完全丢失 | ✅ 完整保留 |
| **耗时** | ~2000ms | ~150ms |
| **渲染管线起点** | 网络请求（第 1 步） | Virtual DOM Diff（跳过前 80%） |
| **使用场景** | 生产环境用户访问 | 开发环境实时预览 |

### 一句话总结

> **冷启动/全量渲染** 是"推倒重建"——从 HTTP 请求开始，走完浏览器渲染管线的每一步；
> **HMR 热更新** 是"精准手术"——通过 WebSocket 传输最小补丁，在三层协作机制（Webpack HMR → Vue HMR API → Virtual DOM Diff）下，只对变化的部分做最小化 DOM 操作，跳过了 80% 的渲染管线步骤。

---

## 附录：冷启动概念的扩展

"冷启动"是计算机领域的通用概念，不仅出现在前端：

| 领域 | 冷启动含义 | 热启动对比 |
|------|-----------|-----------|
| **前端页面** | 首次访问，从零加载所有资源 | 刷新时利用 HTTP 缓存/Service Worker |
| **Serverless 函数** | 首次调用，需要创建容器、加载运行时（~500ms） | 容器存活期间的后续调用（~5ms） |
| **移动 App** | 进程被系统杀死后重新启动 | App 在后台存活，切换回前台 |
| **数据库** | 重启后缓存池为空，查询走磁盘 | 缓存命中，查询走内存 |
| **JVM** | 类加载 + JIT 编译尚未完成 | JIT 编译完成后的稳定运行期 |

共同特征：**冷启动 = 无预热状态，全量初始化；热启动 = 复用已有环境，增量处理。**

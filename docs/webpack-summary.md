# Elpis-core 项目 Webpack 配置详解

## 一、整体架构

```
app/webpack/
├── dev.js                        # 开发服务器启动脚本（Express）
├── prod.js                       # 生产构建脚本
└── config/
    ├── webpack.base.js           # 基础配置（两个环境共享）
    ├── webpack.dev.js            # 开发环境配置（merge 基础配置）
    └── webpack.prod.js           # 生产环境配置（merge 基础配置）
```

npm scripts：
```json
"build:dev": "node --max_old_space_size=4096 ./app/webpack/dev.js"
"build:prod": "node ./app/webpack/prod.js"
```

---

## 二、Loader 详解

> Loader 执行顺序：从右到左（从下到上）。

### 2.1 vue-loader

**项目代码**（webpack.base.js）：
```js
{ test: /\.vue$/, use: 'vue-loader' }
```

**作用**：解析 Vue 单文件组件（`.vue` 文件），将 `<template>`、`<script>`、`<style>` 三个区块拆分为独立的虚拟模块请求，再分别交给对应的 loader 处理。

**实际场景**：以项目中的 `header-container.vue` 为例：
```vue
<template>
  <div class="header">...</div>
</template>
<script>
export default { ... }
</script>
<style scoped>
.header { background: #fff; }
</style>
```

vue-loader 会把这一个文件拆成三个请求：
```
header-container.vue?vue&type=template  →  交给 Vue 模板编译器，编译为 JS 渲染函数
header-container.vue?vue&type=script    →  交给 babel-loader，转译 ES6+ 语法
header-container.vue?vue&type=style     →  交给 css-loader + style-loader，处理样式
```

最终组装为一个完整的 JavaScript 模块。

---

### 2.2 babel-loader

**项目代码**（webpack.base.js）：
```js
{
  test: /\.js$/,
  include: path.resolve(process.cwd(), './app/pages'),  // 只编译业务代码
  use: 'babel-loader',
}
```

**作用**：将 ES6+ 语法转译为浏览器兼容的 ES5 代码。

**为什么要 include 限制**：`node_modules` 里的第三方包通常已经是编译好的，不需要再过一遍 babel。限制只编译 `app/pages` 可以大幅减少编译文件数量，加快构建速度。

**转译示例**：
```js
// 你写的代码（ES6+）
const greet = (name) => `Hello, ${name}`;
const { a, ...rest } = obj;

// babel-loader 转译后（ES5）
var greet = function greet(name) { return "Hello, " + name; };
var a = obj.a;
var rest = _objectWithoutProperties(obj, ["a"]);
```

**生产环境升级**：在 `webpack.prod.js` 中，babel-loader 被替换为 HappyPack 多线程版本：
```js
{ test: /\.js$/, use: 'happypack/loader?id=js' }
// HappyPack 内部仍然调用 babel-loader，但分配到多个子进程并行编译
```

---

### 2.3 css-loader

**项目代码**（webpack.base.js）：
```js
{ test: /\.css$/, use: ['style-loader', 'css-loader'] }
//                                        ↑ 先执行
```

**作用**：解析 CSS 文件中的依赖关系，处理 `@import` 和 `url()` 引用，将 CSS 转化为 JavaScript 模块。

**处理示例**：
```css
/* common.css */
@import './reset.css';           /* css-loader 会解析这个引用，把 reset.css 内容合并进来 */
.logo { background: url('./logo.png'); }  /* css-loader 会解析 url()，交给 url-loader/file-loader 处理图片 */
```

css-loader 处理后，CSS 变成一个 JS 模块：
```js
// css-loader 的输出（简化）
module.exports = [
  [module.id, ".logo { background: url(a1b2c3d4.png); }", ""]
];
// 注意：此时 CSS 只是 JS 字符串，还没有应用到页面上！
// 需要 style-loader 或 MiniCssExtractPlugin.loader 来消费它
```

> **关键理解**：css-loader 只负责"读懂 CSS"，不负责"让 CSS 生效"。

---

### 2.4 style-loader（开发环境）

**项目代码**（webpack.base.js）：
```js
{ test: /\.css$/, use: ['style-loader', 'css-loader'] }
//                       ↑ 后执行
```

**作用**：接收 css-loader 输出的 CSS 字符串，在**运行时**动态创建 `<style>` 标签插入到页面 `<head>` 中。

**运行时行为**（简化）：
```js
// style-loader 在浏览器中执行的逻辑
var style = document.createElement('style');
style.textContent = '.logo { background: url(a1b2c3d4.png); }';
document.head.appendChild(style);  // CSS 这时候才真正生效
```

**优点**：支持 HMR 热更新——修改 CSS 后无需刷新页面，style-loader 会自动替换对应的 `<style>` 标签内容。

**缺点**：CSS 内嵌在 JS 中，必须等 JS 加载并执行后样式才生效，会导致页面闪烁（FOUC）。所以**只在开发环境使用**。

---

### 2.5 MiniCssExtractPlugin.loader（生产环境）

**项目代码**（webpack.prod.js）：
```js
{ test: /\.css$/, use: [MiniCssExtractPlugin.loader, 'happypack/loader?id=css'] }
//                       ↑ 替换了开发环境的 style-loader
```

**作用**：替代 style-loader。不再用 JS 动态注入样式，而是将 CSS 提取到独立的 `.css` 文件中。

**开发 vs 生产的对比**：

```
开发环境（style-loader）：
┌──────────────────────────────────────┐
│  entry.home_xxx.bundle.js  (200KB)   │  ← JS + CSS 合在一起
│  ┌─ 业务 JS 代码                     │
│  ├─ CSS 字符串（内嵌）               │
│  └─ style-loader 注入代码            │
└──────────────────────────────────────┘
浏览器：下载 JS → 执行 JS → 动态插入 <style> → 样式生效（串行，有闪烁）

生产环境（MiniCssExtractPlugin.loader）：
┌─────────────────────────────────┐  ┌──────────────────────────────┐
│ entry.home_xxx.bundle.js (180KB)│  │ entry.home_yyy.bundle.css (20KB) │
│ ┌─ 业务 JS 代码                │  │ ┌─ .logo { background:... } │
│ └─ 无 CSS 代码                 │  │ └─ .header { color:... }   │
└─────────────────────────────────┘  └──────────────────────────────┘
浏览器：并行下载 JS 和 CSS → CSS 先解析完样式立即生效 → JS 执行（并行，无闪烁）
```

**三大优势**：
1. **并行加载**：浏览器同时下载 JS 和 CSS，首屏更快
2. **无闪烁**：CSS 通过 `<link>` 在 `<head>` 中加载，渲染前样式就位
3. **独立缓存**：改了 JS 不影响 CSS 的 contenthash，反之亦然，减少不必要的重新下载

---

### 2.6 less-loader

**项目代码**（webpack.base.js）：
```js
{ test: /\.less$/, use: ['style-loader', 'css-loader', 'less-loader'] }
//                        ③ 最后执行    ② 中间       ① 最先执行
```

**作用**：将 Less 预处理语法编译为标准 CSS。

**处理链路**：
```
.less 文件
  → less-loader：Less 语法编译为标准 CSS
    → css-loader：解析 @import、url() 等依赖
      → style-loader：注入 <style> 到 DOM
```

**转译示例**：
```less
// Less 源码
@primary-color: #1890ff;
.header {
  color: @primary-color;
  .title { font-size: 16px; }
}

// less-loader 编译后 → 标准 CSS
.header { color: #1890ff; }
.header .title { font-size: 16px; }
```

---

### 2.7 url-loader

**项目代码**（webpack.base.js）：
```js
{
  test: /\.(png|jpe?g|gif)$/,
  use: {
    loader: 'url-loader',
    options: {
      limit: 300,        // 小于 300 字节转 Base64
      esModule: false,   // 兼容 CommonJS 的 require() 语法
    },
  },
}
```

**作用**：处理图片资源。根据文件大小决定处理方式：

```
图片 < 300 字节：转为 Base64 字符串内联到 JS/CSS 中
  优点：减少一次 HTTP 请求
  示例：background: url(data:image/png;base64,iVBORw0KGgo...)

图片 ≥ 300 字节：fallback 到 file-loader，拷贝到输出目录
  优点：大图片不会撑大 JS 体积
  示例：background: url(a1b2c3d4.png)
```

**为什么设 300 字节这么小**：Base64 编码会增加约 33% 的体积。如果阈值设太大（比如 10KB），一张 8KB 的图片会变成 ~10.6KB 的 Base64 字符串内嵌到 JS 中，反而增加了 JS 体积。300 字节说明项目中几乎只有极小的图标才会内联。

**`esModule: false` 的作用**：url-loader 默认输出 ES Module 格式 `export default "xxx.png"`，但 Vue 模板中的 `<img :src="require('./logo.png')">` 用的是 CommonJS 的 `require()`，设为 `false` 后输出 `module.exports = "xxx.png"`，确保 `require()` 能直接拿到 URL 字符串。

---

### 2.8 file-loader

**项目代码**（webpack.base.js）：
```js
{ test: /\.(eot|svg|ttf|woff|woff2)(\?\S*)?$/, use: ['file-loader'] }
```

**作用**：处理字体文件。将文件拷贝到输出目录，并返回最终的 URL 路径。

**处理示例**：
```css
/* 源码 */
@font-face {
  font-family: 'iconfont';
  src: url('./iconfont.woff2');
}

/* file-loader 处理后 */
@font-face {
  font-family: 'iconfont';
  src: url(7f8e9a0b.woff2);  /* 文件被拷贝到输出目录并重命名 */
}
```

---

## 三、Plugin 详解

### 3.1 VueLoaderPlugin（通用）

**项目代码**（webpack.base.js）：
```js
const { VueLoaderPlugin } = require('vue-loader');
new VueLoaderPlugin()
```

**作用**：vue-loader 的必备伴侣。在 Webpack 启动时，将 `module.rules` 中定义的所有 loader 规则**克隆**一份，使其也能匹配到 `.vue` 文件内部的各语言块。

**为什么需要它**：
```
没有 VueLoaderPlugin 时：
  webpack.base.js 里配置了 { test: /\.js$/, use: 'babel-loader' }
  → 这条规则只能匹配 .js 文件
  → .vue 文件里的 <script> 部分不会被 babel-loader 处理！

有了 VueLoaderPlugin 后：
  插件克隆出一条新规则：{ test: /\.js$/, resourceQuery: /vue/, use: 'babel-loader' }
  → .vue 文件的 <script> 被 vue-loader 拆分为 xxx.vue?vue&type=script（带有 resourceQuery）
  → 克隆规则能匹配到它 → babel-loader 正常处理
```

**完整的 .vue 文件打包流程**：
```
1. Webpack 启动
   → VueLoaderPlugin 克隆所有 rules（babel-loader、css-loader 等）

2. 遇到 import App from './App.vue'
   → vue-loader 第一次处理：解析 SFC，拆分为 3 个虚拟请求
     ├── App.vue?vue&type=template  （模板）
     ├── App.vue?vue&type=script    （脚本）
     └── App.vue?vue&type=style     （样式）

3. Webpack 根据克隆后的规则分别处理：
   ├── ?type=template → Vue 模板编译器 → 编译为 render() 渲染函数
   ├── ?type=script   → babel-loader → 转译 ES6+ 语法
   └── ?type=style    → less-loader → css-loader → style-loader

4. vue-loader 第二次处理：将各部分的产物组装为最终 JS 模块
```

> **注意**：VueLoaderPlugin 不是模板编译器，它只负责"规则复制与分发"。

---

### 3.2 webpack.ProvidePlugin（通用）

**项目代码**（webpack.base.js）：
```js
new webpack.ProvidePlugin({
    Vue: 'vue',
    axios: 'axios',
    _: 'lodash'
})
```

**作用**：自动注入模块。当 Webpack 在打包时检测到代码中有**未声明的自由变量** `Vue`、`axios`、`_` 时，自动在该模块顶部插入 `import` 语句。

**实际效果**：
```js
// 你写的代码（不需要手动 import）
const app = Vue.createApp({});
const res = await axios.get('/api/data');
const arr = _.chunk([1,2,3,4], 2);

// Webpack 编译时自动在文件顶部插入：
import Vue from 'vue';
import axios from 'axios';
import _ from 'lodash';
// 然后再执行你的代码
```

**关键理解**：
- **不是**挂载到 `window` 上。每个模块独立注入，通过模块系统引用
- **按需注入**：如果某个文件没用到 `axios`，就不会在该文件中插入 `import axios`
- **编译时行为**：发生在打包阶段，不是运行时

---

### 3.3 webpack.DefinePlugin（通用）

**项目代码**（webpack.base.js）：
```js
new webpack.DefinePlugin({
    __VUE_OPTIONS_API__: JSON.stringify(true),
    __VUE_PROD_DEVTOOLS__: JSON.stringify(false),
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: JSON.stringify(false),
})
```

**作用**：在**编译时**进行文本替换，将代码中的标识符替换为字面值。

**替换示例**：
```js
// Vue 3 源码中有类似的条件判断：
if (__VUE_OPTIONS_API__) {
  // Options API 相关代码
}
if (__VUE_PROD_DEVTOOLS__) {
  // DevTools 相关代码
}

// DefinePlugin 替换后：
if (true) {
  // Options API 相关代码 → 保留
}
if (false) {
  // DevTools 相关代码 → 被 Tree Shaking + TerserPlugin 删除！
}
```

**这些 Vue 3 Feature Flags 的含义**：

| 常量 | 值 | 含义 |
|------|----|------|
| `__VUE_OPTIONS_API__` | `true` | 保留 Options API 支持（`data`、`methods`、`computed` 写法） |
| `__VUE_PROD_DEVTOOLS__` | `false` | 生产环境不打包 DevTools 支持代码（减小体积） |
| `__VUE_PROD_HYDRATION_MISMATCH_DETAILS__` | `false` | 生产环境不打包 SSR 水合不匹配的详细报错代码 |

不配置这些 Feature Flags，Vue 3 构建时会报警告。

---

### 3.4 HtmlWebpackPlugin（通用，动态多实例）

**项目代码**（webpack.base.js）：
```js
const entryList = path.resolve(process.cwd(), './app/pages/**/entry.*.js');
glob.sync(entryList).forEach(file => {
  const entryName = path.basename(file, '.js');
  htmlWebpackPluginList.push(
    new HtmlWebpackPlugin({
      filename: path.resolve(process.cwd(), './app/public/dist/', `${entryName}.tpl`),
      template: path.resolve(process.cwd(), './app/view/entry.tpl'),
      chunks: [`entry.${entryName}`],
    })
  );
});
```

**作用**：为每个页面入口自动生成 `.tpl` 模板文件，并将该入口的 JS/CSS 资源引用自动注入到模板中。

**处理前**（源模板 `app/view/entry.tpl`）：
```html
<!DOCTYPE html>
<html class="dark">
<head>
  <meta charset="utf-8">
  <link href="/static/normalize.css" rel="stylesheet">
</head>
<body style="margin:0">
  <div id="root"></div>
  <input id="env" value="{{ env }}" style="display: none;">
</body>
</html>
<!-- 注意：没有任何 JS/CSS 引用 -->
```

**处理后**（输出到 `app/public/dist/entry.home.tpl`）：
```html
<!DOCTYPE html>
<html class="dark">
<head>
  <meta charset="utf-8">
  <link href="/static/normalize.css" rel="stylesheet">
  <link href="/dist/prod/css/entry.home_e5f6g7h8.bundle.css" rel="stylesheet">  <!-- 自动注入 -->
</head>
<body style="margin:0">
  <div id="root"></div>
  <input id="env" value="{{ env }}" style="display: none;">
  <script src="/dist/prod/js/vendors_a1b2c3d4.bundle.js"></script>   <!-- 自动注入 -->
  <script src="/dist/prod/js/entry.home_x9y8z7w6.bundle.js"></script> <!-- 自动注入 -->
</body>
</html>
```

**配置参数**：
- `template`：源模板路径（公共模板，包含 Vue 挂载点 + Nunjucks 变量占位符）
- `filename`：输出路径（每个入口生成一个独立 .tpl）
- `chunks`：只注入当前入口的资源，避免页面 A 加载页面 B 的 JS

**与 Koa 模板渲染的联动**：
```
HtmlWebpackPlugin 生成 .tpl（注入了 JS/CSS 引用）
  → 写入 app/public/dist/ 目录
  → Koa 的 koa-nunjucks-2 配置模板路径为 app/public
  → Controller 调用 ctx.render('dist/entry.home') 
  → Nunjucks 从磁盘读取 .tpl，替换 {{ env }} 等变量
  → 返回完整 HTML 给浏览器
```

---

### 3.5 webpack.HotModuleReplacementPlugin（开发环境）

**项目代码**（webpack.dev.js）：
```js
new webpack.HotModuleReplacementPlugin({ multiStep: false })
```

**作用**：在 Webpack 编译端启用 HMR 能力。编译时为每个模块生成热更新清单（manifest JSON）和热更新代码块（update chunk），供浏览器端拉取。

**它在 HMR 全链路中的位置**：
```
文件修改
  → webpack-dev-middleware 检测变动，触发增量编译
  → HotModuleReplacementPlugin 生成热更新产物：        ← 它在这里
     ├── hot-update.json（更新清单：哪些模块变了）
     └── hot-update.js （更新代码：变了的模块的新代码）
  → webpack-hot-middleware 通过 SSE 推送更新通知到浏览器
  → 浏览器端 webpack-hot-middleware/client 收到通知
  → HMR Runtime 根据清单拉取更新代码块
  → 替换旧模块，页面不刷新
```

**配合使用的还有**（webpack.dev.js 中的 HMR 入口注入）：
```js
Object.keys(baseConfig.entry).forEach(v => {
  if (v !== 'vendor') {
    baseConfig.entry[v] = [
      baseConfig.entry[v],
      // 为每个入口追加 HMR 客户端脚本
      `webpack-hot-middleware/client?path=http://127.0.0.1:9002/_webpack_hmr&timeout=20000&reload=true`
    ]
  }
})
```

`reload=true`：当 HMR 更新失败时（比如模块不支持热替换），回退为整页刷新，确保页面始终是最新的。

---

### 3.6 CleanWebpackPlugin（生产环境）

**项目代码**（webpack.prod.js）：
```js
new CleanWebpackPlugin(['public/dist'], {
  root: path.resolve(process.cwd(), './app/'),
  verbose: true,   // 打印清理日志
  dry: false,      // false = 真实删除，true = 只预览不删除
})
```

**作用**：每次**生产构建前**清空 `app/public/dist` 目录。

**为什么需要**：因为 contenthash 机制会在文件内容变化时生成新文件名。如果不清理旧产物：
```
第一次构建：entry.home_a1b2c3d4.bundle.js
第二次构建：entry.home_x9y8z7w6.bundle.js（内容变了，hash 变了）

不清理 → 目录里同时存在两个文件 → 旧文件白白占用空间
清理后 → 只保留最新的构建产物
```

---

### 3.7 MiniCssExtractPlugin（生产环境）

**项目代码**（webpack.prod.js）：
```js
// 插件声明
new MiniCssExtractPlugin({
  chunkFilename: 'css/[name]_[contenthash:8].bundle.css',
})

// 对应的 loader 规则（替换开发环境的 style-loader）
{ test: /\.css$/, use: [MiniCssExtractPlugin.loader, 'happypack/loader?id=css'] }
```

**作用**：将 CSS 从 JS bundle 中提取到独立的 `.css` 文件。

**完整对比**：

| 维度 | 开发环境（style-loader） | 生产环境（MiniCssExtractPlugin） |
|------|--------------------------|----------------------------------|
| CSS 存在形式 | 内嵌在 JS 文件中 | 独立 `.css` 文件 |
| 加载方式 | JS 执行时动态插入 `<style>` | `<link>` 标签并行加载 |
| 首屏性能 | 串行（等 JS） | 并行（JS + CSS 同时下载） |
| 页面闪烁 | 有（FOUC） | 无 |
| 缓存粒度 | JS 和 CSS 共享一个 hash | JS 和 CSS 各自独立 contenthash |
| HMR 支持 | 支持 | 不支持（生产环境不需要） |

---

### 3.8 CssMinimizerPlugin（生产环境）

**项目代码**（webpack.prod.js）：
```js
new CssMinimizerPlugin()
```

**作用**：对 MiniCssExtractPlugin 提取出的独立 CSS 文件进行**压缩优化**。

**压缩示例**：
```css
/* 压缩前（3KB）*/
.header {
  margin: 0px 0px 0px 0px;
  color: #ff0000;
  /* 这是一段注释 */
}
.header .title {
  font-size: 16px;
}

/* 压缩后（几百字节）*/
.header{margin:0;color:red}.header .title{font-size:16px}
```

压缩操作包括：去除空格换行、去除注释、缩写属性值（`0px` → `0`、`#ff0000` → `red`）、合并重复选择器等。

---

### 3.9 TerserPlugin（生产环境）

**项目代码**（webpack.prod.js）：
```js
new TerserPlugin({
  cache: true,      // 缓存已压缩的模块，加速增量构建
  parallel: true,   // 多核 CPU 并行压缩
  terserOptions: {
    compress: {
      drop_console: true  // 移除所有 console.log
    }
  }
})
```

**作用**：对 JavaScript 进行**压缩、混淆、死代码删除**。

**压缩示例**：
```js
// 压缩前
function calculateTotal(price, quantity) {
  console.log('calculating...');
  const total = price * quantity;
  const unused = 'this is dead code';
  return total;
}

// TerserPlugin 压缩后
function calculateTotal(e,t){return e*t}
// console.log 被 drop_console 删除
// unused 变量被死代码消除
// 变量名被混淆（price→e, quantity→t）
```

**配置参数**：
- `cache: true`：已压缩且未变化的模块直接走缓存，不重复压缩
- `parallel: true`：利用多核 CPU 并行压缩，构建速度提升数倍
- `drop_console: true`：自动移除所有 `console.log`（避免生产环境泄露调试信息）

**与 Tree Shaking 的配合**：Webpack 的 `usedExports + sideEffects` 只是**标记**未使用的代码，真正**物理删除**这些代码是 TerserPlugin 在压缩阶段完成的。

---

### 3.10 HappyPack（生产环境）

**项目代码**（webpack.prod.js）：
```js
const happypackCommonConfig = {
  debug: false,
  threadPool: happypack.ThreadPool({
    size: Math.max(1, os.cpus().length),  // 线程池大小 = CPU 核心数
  }),
};

// JS 多线程编译
new happypack({
  ...happypackCommonConfig,
  id: 'js',
  use: [`babel-loader?${JSON.stringify({
    presets: ['@babel/preset-env'],
    plugins: ['@babel/plugin-transform-runtime'],
  })}`],
})

// CSS 多线程编译
new happypack({
  ...happypackCommonConfig,
  id: 'css',
  loaders: [{ path: 'css-loader', options: { importLoaders: 1 } }]
})
```

**作用**：将 loader 的编译任务分发到多个子进程并行执行，加快构建速度。

**工作原理**：
```
普通模式（单线程）：
  文件1 → babel-loader → 等待完成 → 文件2 → babel-loader → 等待完成 → 文件3 → ...
  总耗时 = 文件1时间 + 文件2时间 + 文件3时间 + ...

HappyPack 模式（4 核 CPU）：
  ┌─ 子进程1: 文件1 → babel-loader ─┐
  ├─ 子进程2: 文件2 → babel-loader ─┤
  ├─ 子进程3: 文件3 → babel-loader ─┤→ 合并结果
  └─ 子进程4: 文件4 → babel-loader ─┘
  总耗时 ≈ 最慢那个文件的时间（理想情况下快 4 倍）
```

**loader 替换关系**：
```js
// webpack.base.js（开发环境，单线程）
{ test: /\.js$/, use: 'babel-loader' }
{ test: /\.css$/, use: ['style-loader', 'css-loader'] }

// webpack.prod.js（生产环境，多线程，会覆盖 base 的同名规则）
{ test: /\.js$/, use: 'happypack/loader?id=js' }       // id=js 对应 HappyPack 实例中的 babel-loader
{ test: /\.css$/, use: [MiniCssExtractPlugin.loader, 'happypack/loader?id=css'] }  // id=css 对应 css-loader
```

**Babel 配置说明**：
- `@babel/preset-env`：智能预设，根据目标浏览器自动确定需要转译的语法特性
- `@babel/plugin-transform-runtime`：抽取 Babel 辅助函数为共享模块，避免每个文件重复生成 `_classCallCheck`、`_defineProperty` 等辅助代码

---

### 3.11 HtmlWebpackInjectAttributesPlugin（生产环境）

**项目代码**（webpack.prod.js）：
```js
new HtmlWebpackInjectAttributesPlugin({
  crossorigin: 'anonymous'
})
```

**作用**：为 HtmlWebpackPlugin 生成的 HTML 中所有 `<script>` 和 `<link>` 标签自动注入 `crossorigin="anonymous"` 属性。

**注入效果**：
```html
<!-- 注入前 -->
<script src="/dist/prod/js/vendors_a1b2c3d4.bundle.js"></script>
<link href="/dist/prod/css/entry.home_e5f6g7h8.bundle.css" rel="stylesheet">

<!-- 注入后 -->
<script src="/dist/prod/js/vendors_a1b2c3d4.bundle.js" crossorigin="anonymous"></script>
<link href="/dist/prod/css/entry.home_e5f6g7h8.bundle.css" rel="stylesheet" crossorigin="anonymous">
```

**为什么需要**：当资源部署到 CDN（跨域）时，`crossorigin="anonymous"` 告诉浏览器以匿名方式请求（不携带 Cookie），这样当脚本报错时，`window.onerror` 才能捕获到完整的错误信息（否则跨域脚本只会报 `Script error.`）。

---

## 四、中间件详解

### 4.1 webpack-dev-middleware（开发环境）

**项目代码**（dev.js）：
```js
app.use(devMiddleware(compiler, {
  writeToDisk: (filePath) => filePath.endsWith('.tpl'),
  publicPath: webpackConfig.output.publicPath,
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control_Allow-Methods': 'GET,POST,PUT,DELETE,PATCH,OPTIONS',
    'Accesss-Control_Allow-Headers': 'X_Request-With,content-type,Authorization'
  },
}));
```

**作用**：拦截 Webpack 编译过程，将构建产物存储在**内存文件系统**中，同时监听源文件变动自动触发增量重编译。

**为什么用内存而不写磁盘**：内存读写速度远快于磁盘 I/O，开发阶段频繁重编译时差异明显。

**writeToDisk 配置**：
```js
writeToDisk: (filePath) => filePath.endsWith('.tpl')
```
只将 `.tpl` 模板文件落地到磁盘。原因：Koa 的 `koa-nunjucks-2` 模板引擎内部使用 `fs.readFileSync` 读取文件，只能访问磁盘，无法读取 webpack-dev-middleware 的内存文件系统。其他 JS/CSS 资源保持在内存中，通过 Express 的 HTTP 响应直接返回给浏览器。

**CORS 配置**：因为 Koa 主应用和 webpack devServer 运行在不同端口（跨域），需要设置 `Access-Control-Allow-Origin: *` 允许浏览器跨域请求 JS/CSS 资源。

---

### 4.2 webpack-hot-middleware（开发环境）

**项目代码**（dev.js）：
```js
app.use(hotMiddleware(compiler, {
  path: `/${DEV_SERVER_CONFIG.HMR_PATH}`,  // 即 /_webpack_hmr
  log: () => {}
}));
```

**作用**：在 Express 服务端建立 SSE（Server-Sent Events）通道，当 Webpack 编译完成时，将更新通知推送到浏览器端。

**完整 HMR 流程**：
```
你修改了 header-container.vue

1. webpack-dev-middleware 检测到文件变动 → 触发增量编译
2. HotModuleReplacementPlugin 编译出热更新产物
3. webpack-hot-middleware 通过 SSE 推送消息：
   → event: built
   → data: { hash: "abc123", modules: {...} }
4. 浏览器端的 webpack-hot-middleware/client 收到消息
5. 通过 JSONP 拉取 hot-update.js（新模块代码）
6. HMR Runtime 用新代码替换旧模块
7. Vue 组件重新渲染 → 页面更新，状态保持，无刷新
```

---

## 五、Optimization 配置详解

### 5.1 splitChunks（代码分割）

**项目代码**（webpack.base.js）：
```js
splitChunks: {
  chunks: 'all',
  maxAsyncRequests: 10,
  maxInitialRequests: 10,
  cacheGroups: {
    vendors: {
      test: /[\\/]node_modules[\\/]/,
      name: 'vendors',
      priority: 20,
      enforce: true,
      reuseExistingChunk: true,
    },
    commons: {
      name: 'common',
      minChunks: 2,
      minSize: 1,
      priority: 10,
      reuseExistingChunk: true,
    },
  },
}
```

**三层分割策略**：

| 层级 | Chunk | 匹配规则 | 变更频率 | 缓存效果 |
|------|-------|----------|----------|----------|
| 第一层 | `vendors` | `node_modules` 下的第三方库 | 极低（仅依赖升级才变） | 长期缓存 |
| 第二层 | `common` | 被 ≥2 个入口引用的公共业务模块 | 较低 | 中期缓存 |
| 第三层 | `entry.{page}` | 各入口特有的业务代码 | 频繁 | 短期缓存 |

**参数解释**：
- `chunks: 'all'`：同步引入（`import xxx`）和异步引入（`import('xxx')`）的模块都参与分割
- `priority`：优先级。vendors(20) > commons(10)，确保 `node_modules` 的模块优先被分入 vendors 而非 commons
- `enforce: true`：忽略 minSize/minChunks 等默认阈值，只要匹配 test 就强制拆分
- `reuseExistingChunk: true`：如果模块已被另一个 chunk 包含，直接复用而不重复打包
- `minChunks: 2`：被至少 2 个入口引用才提取为公共模块
- `minSize: 1`：最小 1 字节就提取（几乎无门槛）

### 5.2 contenthash（精准缓存）

```js
filename: 'js/[name]_[contenthash:8].bundle.js'
```

基于**文件内容**计算的哈希。内容不变 → hash 不变 → 文件名不变 → 浏览器命中缓存。

| hash 类型 | 计算依据 | 精准度 |
|-----------|----------|--------|
| `hash` | 整个项目构建 | 低：任何文件变了，所有产物 hash 都变 |
| `chunkhash` | 单个 chunk | 中：同一 chunk 内任何文件变了，整个 chunk 的 hash 变 |
| `contenthash` | 单个文件内容 | 高：只有该文件本身内容变了才变 |

### 5.3 runtimeChunk

```js
runtimeChunk: true
```

将 Webpack 运行时代码（`__webpack_require__`、模块映射表等）提取到独立 chunk。防止业务模块 hash 变化时"传染"到 vendors 的 hash，保护 vendors 的长期缓存。

### 5.4 Tree Shaking

```js
usedExports: true,    // 标记未使用的 export
sideEffects: false,   // 声明所有模块无副作用，允许删除未引用模块
```

两者配合：`usedExports` 标记 → `sideEffects: false` 允许移除整模块 → TerserPlugin 物理删除死代码。

### 5.5 mergeDuplicateChunks

```js
mergeDuplicateChunks: true
```

多个 chunk 包含完全相同的模块时，自动合并去重。

---

## 六、速查表

### Loader 速查

| Loader | 环境 | 作用 |
|--------|------|------|
| `vue-loader` | 通用 | 解析 .vue SFC，拆分 template/script/style 三块 |
| `babel-loader` | 通用 | ES6+ 转译为 ES5 |
| `css-loader` | 通用 | 解析 CSS 依赖（@import、url()），转为 JS 模块 |
| `style-loader` | 开发 | 运行时动态插入 `<style>` 标签到 DOM |
| `MiniCssExtractPlugin.loader` | 生产 | 将 CSS 提取为独立 .css 文件（替代 style-loader） |
| `less-loader` | 通用 | Less → 标准 CSS |
| `url-loader` | 通用 | 小图片转 Base64 内联，大图片交给 file-loader |
| `file-loader` | 通用 | 拷贝字体/大文件到输出目录，返回 URL |
| `happypack/loader` | 生产 | 代理层，将任务路由到 HappyPack 子进程并行编译 |

### Plugin 速查

| Plugin | 环境 | 作用 |
|--------|------|------|
| `VueLoaderPlugin` | 通用 | 克隆 loader 规则，使其能应用到 .vue 语言块 |
| `webpack.ProvidePlugin` | 通用 | 编译时自动注入全局模块（Vue/axios/lodash） |
| `webpack.DefinePlugin` | 通用 | 编译时文本替换，定义全局常量（Vue 3 Feature Flags） |
| `HtmlWebpackPlugin` | 通用 | 为每个入口生成注入了 JS/CSS 引用的 .tpl 模板 |
| `HotModuleReplacementPlugin` | 开发 | 生成 HMR 热更新产物（manifest + update chunk） |
| `CleanWebpackPlugin` | 生产 | 构建前清空输出目录 |
| `MiniCssExtractPlugin` | 生产 | 将 CSS 提取为独立文件（并行加载 + 独立缓存） |
| `CssMinimizerPlugin` | 生产 | 压缩 CSS（去空格/注释/缩写属性） |
| `TerserPlugin` | 生产 | 压缩混淆 JS + 删除 console + 死代码消除 |
| `HappyPack` | 生产 | 多线程并行编译，加速构建 |
| `HtmlWebpackInjectAttributesPlugin` | 生产 | 为 script/link 标签注入 crossorigin 属性 |

### 中间件速查

| 中间件 | 环境 | 作用 |
|--------|------|------|
| `webpack-dev-middleware` | 开发 | 内存编译 + 文件监听 + 选择性落地 .tpl |
| `webpack-hot-middleware` | 开发 | SSE 通道，推送 HMR 更新通知到浏览器 |

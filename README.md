## Elpis-core

基于领域模型，沉淀业务能力，同时提供可扩展页面的前后端一体化解决方案。

Elpis-core 通过约定目录结构和一套 Loader 机制，把「模型配置、项目配置、路由、Controller、Service、中间件、前端页面」组织在一起，让你可以：

- **按领域模型沉淀业务能力**：通过 `model` 下的配置沉淀公共模型，再由 `project` 对模型进行继承和扩展。
- **快速暴露标准化 API**：结合 `router-schema` + `ajv` 实现 API 入参 JSON Schema 校验。
- **快速搭建管理页面**：内置 Vue 3 + Element Plus + Pinia 的前端启动脚手架，支持扩展业务页面。
- **一键本地/测试/生产切换**：通过 `_ENV` 环境变量和 `config` 目录加载不同环境配置。

---

## 目录结构

项目核心目录结构如下（部分）：

```text
Elpis-core
├── index.js                 # 项目启动入口（调用 elpis-core.start）
├── elpis-core/              # 核心框架能力（Koa 封装 + Loader）
│   ├── index.js             # 创建 Koa 实例，加载各类 Loader 并启动服务
│   ├── env.js               # 环境变量封装（local/beta/production）
│   └── loader/
│       ├── config.js        # 加载并合并 config 下的环境配置
│       ├── middleware.js    # 扫描 app/middlewares 并注入 app.middlewares
│       ├── router-schema.js # 加载 app/router-schema 生成 app.routerSchema
│       ├── router.js        # 加载 app/router 注册业务路由
│       ├── controller.js    # 加载 app/controller 注册 app.controller
│       └── service.js       # 加载 app/service 注册 app.service
├── app/                     # 业务应用目录
│   ├── middleware.js        # 注册全局中间件（静态服务、模板引擎、签名校验等）
│   ├── middlewares/         # 自定义中间件（签名校验、参数校验、异常处理等）
│   ├── router/              # 业务路由定义（如 project.js）
│   ├── router-schema/       # API 入参 JSON Schema 定义
│   ├── controller/          # 业务 Controller（处理请求与响应）
│   ├── service/             # 业务 Service（领域逻辑抽象）
│   ├── pages/               # 前端 Vue 页面（boot.js、各业务页面入口）
│   ├── view/entry.tpl       # 页面模板（注入 env、options 等）
│   ├── public/              # 静态资源与构建产物
│   └── webpack/             # Webpack 构建相关配置与 Dev Server
├── model/                   # 领域模型 & 项目配置
│   └── index.js             # 扫描并组装 model / project 配置，做继承与合并
├── config/                  # 环境配置（default/local/beta/prod）
├── package.json             # NPM 配置与依赖
└── README.md
```

---

## 核心设计理念

- **领域模型驱动**：在 `model` 目录中沉淀通用领域模型（如字段、结构、校验规则等），在 `model/**/project/*.js` 中按项目维度对模型做继承、精简或扩展，最终通过 `model/index.js` 生成统一的模型列表数据。
- **约定优于配置**：通过统一的目录约定和 Loader（`controller/service/router/middlewares/router-schema`），自动扫描并挂载到 `app` 实例，减少样板代码。
- **强约束 API 层**：通过 `router-schema` + `ajv` 结合 `api-params-verify` 中间件，对所有 `/api/**` 请求进行 JSON Schema 参数校验，保证 API 的输入可靠性。
- **前后端一体**：后端 Koa 提供 API 和模板渲染，前端 Vue 3 + Element Plus 通过 Webpack 构建产出到 `app/public/dist`，统一由 Koa 静态资源和模板能力提供页面。

---

## 运行与构建

### 环境要求

- **Node.js**: 建议 Node 16+（兼容 Webpack 5 / Vue 3）
- **npm** 或 **pnpm/yarn**（以下以 npm 为例）

### 安装依赖

```bash
npm install
```

### 后端服务启动

项目通过 `_ENV` 环境变量区分环境，`package.json` 中已内置常用脚本：

- **本地开发环境启动（Koa 服务）**

```bash
npm run dev
```

等价于：

```bash
_ENV='local' nodemon ./index.js
```

默认监听端口：`8080`（也可以通过 `PORT` 环境变量覆盖）。

- **测试环境启动**

```bash
npm run beta
```

- **生产环境启动**

```bash
npm run prod
```

> 不同环境下，`config/` 目录中的配置会被 `config.loader` 读取并合并到 `app.config`：
> - `config.default.js`：默认配置
> - `config.local.js`：本地环境覆盖项
> - `config.beta.js`：测试环境覆盖项
> - `config.prod.js`：生产环境覆盖项

### 前端构建

Elpis-core 自带 Webpack 构建脚本，把前端 Vue 页面打包到 `app/public/dist`：

- **开发模式构建 + Dev Server**

```bash
npm run build:dev
```

对应 `app/webpack/dev.js`，内部会：

- 启动一个基于 Express 的 Dev Server；
- 使用 `webpack-dev-middleware` / `webpack-hot-middleware` 提供 HMR；
- 将 `.tpl` 模板落盘到 `app/public/dist`。

- **生产构建**

```bash
npm run build:prod
```

构建产物会产出在 `app/public/dist/prod` 目录（具体参见 `app/webpack/config/webpack.prod.js`）。

---

## 领域模型 & 项目配置说明

领域模型与项目配置的组织由 `model/index.js` 负责：

- **目录约定**
  - `model/**/model.js`：定义某个领域模型的通用结构（如字段列表、默认行为等）。
  - `model/**/project/*.js`：针对具体项目的配置，对模型进行继承和修改。
- **合并规则**
  - 使用 `lodash.mergeWith` 做深度合并；
  - 对数组类型做特殊处理：项目配置中的同 key 项会覆盖模型中的对应项，新 key 项会被追加；
  - 最终返回形如：

```js
[{
  model: { key, name, desc, ... },     // 模型定义
  project: {                           // 各项目继承后的配置
    projKey1: { key, name, desc, homepage, ... },
    projKey2: { ... }
  }
}]
```

这些数据通过 `app/service/project.js` 暴露为 `getModelList`，并在 `app/controller/project.js` 中对外提供 `/api/project/model_list` 接口。

---

## API 约束与中间件

- **API 路由与 Schema**
  - 在 `app/router-schema` 中为每个 API 定义 JSON Schema，例如：
    - `app/router-schema/project.js` 中定义了 `api/project/list` 的 GET 规则。
  - `router-schema.loader` 会加载所有文件并挂到 `app.routerSchema`。

- **参数校验中间件（`api-params-verify`）**
  - 仅对 `/api/**` 路径生效；
  - 从 `app.routerSchema` 中按 `path + method` 查找对应 Schema；
  - 使用 `ajv` 对 `headers / body / query / params` 进行校验；
  - 校验失败时返回：
    - `success: false`
    - `code: 442`
    - `message: request validate fail: ...`

- **签名校验中间件（`api-sign-verify`）**
  - 仅对 `/api/**` 路径生效；
  - 从请求头中读取 `s_sign` 与 `s_t`；
  - 使用固定 `signKey` 生成签名 `md5(\`\${signKey}_\${s_t}\`)`；
  - 校验签名正确且时间未过期（默认 6000ms）；
  - 失败时返回：
    - `success: false`
    - `code: 445`
    - `message: signature not correct or api timeout`

- **异常捕获中间件（`error-handle`）**
  - 兜底捕获下游抛出的异常；
  - 当模板不存在（`template not found`）时，临时重定向到首页 `homePage`；
  - 其他异常统一返回：
    - `success: false`
    - `code: 500`
    - `message: 网络异常，请稍后重试`

---

## 前端页面体系

前端部分以 `app/pages` 为目录根：

- **启动入口：`app/pages/boot.js`**
  - 基于 Vue 3 `createApp` 启动应用；
  - 自动挂载：
    - Element Plus（包含暗色主题支持）；
    - 全局 Pinia（`app/pages/store/index.js`）；
    - 可选自定义第三方插件；
    - 可选 Vue Router（Hash 模式）。

- **页面示例：`app/pages/project-list/project-list.vue`**
  - 使用自定义组件 `header-container` 渲染「项目列表」页面；
  - 可以通过路由/入口脚本关联到对应的 Nunjucks 模板（如 `entry.project-list.tpl`）。

- **页面模板：`app/view/entry.tpl`**
  - 定义通用 HTML 结构与 `#root` 容器；
  - 注入后端环境变量 `env` 和 `options` 到 `window`，供前端使用；
  - 引入规范化样式与 favicon。

---

## 开发建议

- **推荐流程**
  1. 在 `model` 中抽象业务领域模型；
  2. 在 `model/**/project/*.js` 中按项目维度配置继承与扩展；
  3. 在 `app/service` 中读取模型数据并封装业务逻辑；
  4. 在 `app/controller` 中编排返回结构，统一成功/失败格式；
  5. 在 `app/router` 中暴露 API 路径；
  6. 在 `app/router-schema` 中补充 JSON Schema 约束；
  7. 在 `app/pages` 中编写对应管理/展示页面。

- **适用场景**
  - 需要沉淀大量类似结构的业务模型（如多项目、多租户配置中心、统一运营配置等）；
  - 需要快速搭建配套管理后台页面与标准化 API；
  - 后端使用 Koa，前端使用 Vue 3 的一体化中台类项目。

---

## License

本项目基于 ISC 协议开源。

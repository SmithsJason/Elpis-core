# Elpis-core 项目学习总结（面试向）

## 一、项目概览

Elpis-core 是我自研的一个基于 **Koa** 的轻量级 Node.js 应用框架，设计理念参考 Egg.js，核心思想是 **约定优于配置（Convention over Configuration）**。前端采用 **Vue 3 + Element Plus**，通过 CSR + 服务端模板注入的方式渲染页面。


## 二、为什么要做 elpis-core？—— 解决了什么问题

### 传统手动方案的痛点

假设不用框架，纯手写一个 Koa 项目，随着业务增长会面临以下问题：

#### 痛点 1：入口文件膨胀 —— 手动 require 地狱

```js
// ❌ 传统方案：app.js 入口文件
const Koa = require('koa');
const app = new Koa();

// 手动引入每一个 controller
const viewController = require('./app/controller/view');
const projectController = require('./app/controller/project');
const userController = require('./app/controller/user');
const orderController = require('./app/controller/order');
// ... 随着业务增长，这里会有几十上百行 require

// 手动引入每一个 service
const projectService = require('./app/service/project');
const userService = require('./app/service/user');
const orderService = require('./app/service/order');
// ... 同样几十行

// 手动引入每一个中间件
const errorHandle = require('./app/middlewares/error-handle');
const apiSignVerify = require('./app/middlewares/api-sign-verify');
const apiParamsVerify = require('./app/middlewares/api-params-verify');
// ...

// 手动注册每一条路由
const Router = require('koa-router');
const router = new Router();
router.get('/view/:page', viewController.renderPage);
router.get('/api/project/model_list', projectController.getModelList);
router.get('/api/user/info', userController.getInfo);
// ... 几十条路由
```

**问题**：入口文件动辄几百行，全是 require 和注册代码，难以维护。

#### 痛点 2：团队协作 Git 冲突

```
场景：A 同学新增了 UserController，B 同学新增了 OrderController
两人都需要修改同一个入口文件 app.js，添加各自的 require 和路由注册
→ 频繁的 Git 合并冲突
```

#### 痛点 3：加载顺序需要人工保证

```js
// ❌ 传统方案：顺序写错就报错
const projectController = new ProjectController(app); // 用到了 app.service.project
const projectService = new ProjectService(app);       // 但 service 还没初始化！
// → TypeError: Cannot read property 'project' of undefined
```

#### 痛点 4：新增模块流程繁琐

每新增一个业务模块（比如"订单管理"），需要：
1. 写 `controller/order.js`
2. 写 `service/order.js`
3. 写 `router/order.js`
4. **回到入口文件**，添加 3 行 require
5. **回到入口文件**，注册路由
6. 可能还要传递依赖

步骤 4-6 是纯样板代码，与业务逻辑无关。

---

### elpis-core 如何解决这些问题

#### 解决方案：Loader 自动加载机制

elpis-core 的核心是一套 **Loader 体系**，通过 `glob` 扫描约定目录，自动完成模块的发现、实例化和挂载：

```
elpis-core/loader/
  ├── config.js          → 加载配置，合并环境差异
  ├── middleware.js       → 扫描 app/middlewares/，挂载到 app.middlewares
  ├── controller.js       → 扫描 app/controller/，挂载到 app.controller
  ├── service.js          → 扫描 app/service/，挂载到 app.service
  ├── router.js           → 扫描 app/router/，自动注册路由
  ├── router-schema.js    → 扫描 app/router-schema/，加载参数校验规则
  └── extend.js           → 扫描 app/extend/，扩展 app 对象
```

**启动时自动执行加载链**（`elpis-core/index.js`）：

```js
start: (options = {}) => {
    const app = new Koa();

    configLoader(app);       // 1. 配置（最先加载，后续都可能依赖）
    middlewareLoader(app);   // 2. 自定义中间件
    routerSchemaLoader(app); // 3. 路由参数 Schema
    controllerLoader(app);   // 4. 控制器
    serviceLoader(app);      // 5. 服务层
    extendLoader(app);       // 6. 扩展

    // 7. 注册全局中间件
    require(`${app.businessPath}/middleware.js`)(app);

    // 8. 注册路由（最后加载，因为路由依赖 controller）
    routerLoader(app);

    app.listen(port);
    return app;
}
```

---

## 三、核心设计解析 —— Loader 是怎么工作的

### 以 Controller Loader 为例（面试重点）

```js
// elpis-core/loader/controller.js 核心逻辑

module.exports = (app) => {
    // 1️⃣ 用 glob 扫描约定目录下所有 JS 文件
    const controllerPath = path.resolve(app.businessPath, './controller');
    const fileList = glob.sync(path.resolve(controllerPath, './**/*.js'));

    // 2️⃣ 遍历文件，构建对象树
    const controller = {};
    fileList.forEach(file => {
        // 3️⃣ 提取相对路径：project/project-list.js
        let name = /* 截取 controller/ 之后的路径 */;

        // 4️⃣ 命名转换：kebab-case → camelCase
        name = name.replace(/[_-][a-z]/ig, (s) => s.substring(1).toUpperCase());
        // project/project-list → project/projectList

        // 5️⃣ 按目录层级挂载到对象树
        const names = name.split(sep);
        // names = ['project', 'projectList']
        // → controller.project.projectList = new ControllerModule()
    });

    // 6️⃣ 挂载到 app 全局对象
    app.controller = controller;
}
```

**效果**：

```
文件系统                              内存对象树
app/controller/                      app.controller = {
  ├── view.js                          view: ViewControllerInstance,
  ├── project.js                       project: ProjectControllerInstance,
  ├── base.js                          base: BaseControllerInstance,
  └── user/                            user: {
      └── user-info.js                   userInfo: UserInfoControllerInstance
  }                                    }
```

**Service / Middleware Loader 采用完全相同的模式**，分别挂载到 `app.service` 和 `app.middlewares`。

### Router Loader 的设计

路由也是自动扫描的，但模式稍有不同 —— 它将 `app` 和 `router` 注入到每个路由文件：

```js
// elpis-core/loader/router.js
const router = new KoaRouter();
fileList.forEach(file => {
    require(file)(app, router);  // 注入 app 和 router
});
app.use(router.routes());
```

业务路由文件只需关注自身逻辑：

```js
// app/router/project.js
module.exports = (app, router) => {
    const { project: projectController } = app.controller;
    router.get('/api/project/model_list', projectController.getModelList.bindprojectController));
};
```

**好处**：每个路由文件独立、职责单一，新增路由不影响其他文件。

### Config Loader 的环境策略

```js
// 默认配置 + 环境配置，后者覆盖前者
app.config = Object.assign({}, defaultConfig, envConfig);
```

```
config/
  ├── config.default.js      → 所有环境的公共配置
  ├── config.local.js        → 本地开发覆盖项
  ├── config.beta.js         → 测试环境覆盖项
  └── config.prod.js         → 生产环境覆盖项
```

通过 `process.env._ENV` 自动判断加载哪个环境文件，实现 **同一套代码、多环境部署**。

### Extend Loader 的扩展机制

允许在 `app/extend/` 下放置模块，自动挂载到 `app` 对象上：

```js
// app/extend/mysql.js
module.exports = (app) => new MySQLClient(app.config.mysql);

// 使用时
app.mysql.query('SELECT ...');
```

同时有安全校验：如果扩展名与 app 已有属性冲突，会报错提示而不是静默覆盖。

---

## 四、完整对比：传统方案 vs elpis-core

### 场景：新增一个"订单管理"模块

#### 传统手动方案（需改 4 个文件）

```diff
// 1. 新建 controller/order.js  ✅ 业务代码
// 2. 新建 service/order.js     ✅ 业务代码
// 3. 新建 router/order.js      ✅ 业务代码

// 4. ❌ 修改入口文件 app.js
+ const orderController = require('./app/controller/order');
+ const orderService = require('./app/service/order');
+ router.get('/api/order/list', orderController.getList);
+ router.post('/api/order/create', orderController.create);
```

**改动 4 个文件，其中入口文件修改容易与他人冲突。**

#### elpis-core 方案（只改 3 个文件，且互不冲突）

```diff
// 1. 新建 app/controller/order.js  ✅ 业务代码
// 2. 新建 app/service/order.js     ✅ 业务代码
// 3. 新建 app/router/order.js      ✅ 业务代码

// 无需修改任何公共文件！
// 框架自动发现、自动加载、自动挂载
```

**只写纯业务代码，零样板代码，零合并冲突。**

### 全维度对比表

| 维度 | 传统手动 require | elpis-core | 优势说明 |
|------|-----------------|------------|---------|
| **模块注册** | 每个文件手动 require + 手动挂载 | glob 自动扫描 + 自动挂载 | 消除入口文件膨胀 |
| **命名规范** | 自行维护变量名，风格不统一 | 文件名 kebab-case 自动转 camelCase | 强制统一编码风格 |
| **依赖传递** | 手动 require 路径耦合或手动注入 | 统一挂载到 `app` 对象，任意模块可通过 `app.controller.xx`、`app.service.xx` 访问 | 解耦模块间依赖 |
| **加载顺序** | 人工保证，写错就运行时报错 | 框架内置：config→middleware→controller→service→router | 杜绝顺序错误 |
| **新增模块** | 新建文件 + 修改入口文件 | 新建文件即可，零配置 | 开发效率高 |
| **团队协作** | 多人改同一个入口文件→Git 冲突 | 每人只改自己的业务文件→无冲突 | 协作体验好 |
| **环境配置** | 自行写 if/else 判断环境 | config.default + config.{env} 自动合并 | 多环境部署简洁 |
| **参数校验** | 在每个 controller 里重复写校验逻辑 | router-schema + 中间件统一拦截 | 校验逻辑集中，减少重复代码 |
| **扩展能力** | 自行管理全局工具类 | extend loader 自动挂载 + 命名冲突检测 | 扩展安全可控 |
| **项目一致性** | 每个人写法不同，风格混乱 | 约定目录结构，新人看目录就懂 | 降低上手成本 |

---

## 五、面试话术建议

### 问："你这个框架的核心设计思想是什么？"

> 核心思想是 **约定优于配置**。框架通过一套 Loader 机制，在启动时按约定目录（controller / service / middleware / router / extend）自动扫描、实例化和挂载模块。开发者只需把文件放在对应目录下，框架自动完成发现和注册，不需要手动 require，也不需要修改任何配置文件。

### 问："相比直接用 Koa，你的框架解决了什么问题？"

> 解决了三个核心问题：
>
> 1. **入口文件膨胀**：传统 Koa 项目随着业务增长，入口文件会充满大量 require 和路由注册代码。elpis-core 通过 glob 自动扫描消除了这些样板代码。
>
> 2. **团队协作冲突**：传统方案新增模块必须修改公共入口文件，多人协作容易产生 Git 冲突。elpis-core 让每个模块完全独立，新增功能只需新建文件。
>
> 3. **加载顺序和依赖传递**：传统方案需要人工保证初始化顺序，模块间依赖要么路径耦合要么手动注入。elpis-core 通过统一的 `app` 对象树和固定的加载链（config → middleware → controller → service → router）自动解决。

### 问："自动加载的实现原理是什么？"

> 以 Controller Loader 为例，实现分三步：
>
> 1. 用 `glob` 库递归扫描 `app/controller/` 下所有 `.js` 文件
> 2. 对文件的相对路径做 kebab-case 到 camelCase 的命名转换
> 3. 按目录层级构建嵌套对象树，`require` 模块并 `new` 实例化后挂载到 `app.controller`
>
> 比如 `app/controller/project.js` 会被自动加载为 `app.controller.project`，在路由文件中通过 `app.controller.project.getModelList` 直接调用，无需手动 require。

### 问："这个设计参考了什么？跟 Egg.js 有什么区别？"

> 设计思想参考了 Egg.js 的 Loader 机制和约定目录结构。区别在于 elpis-core 是一个极简实现，去掉了 Egg 的插件系统、多进程模型、agent 机制等复杂功能，只保留了核心的自动加载能力，更适合中小型项目快速搭建。这样做的好处是代码量小、好理解、好定制。

---

## 六、请求处理完整流程

以访问 `http://localhost:3000/view/project-list` 为例：

```
浏览器请求 GET /view/project-list
        │
        ▼
┌──────────────────────────────────┐
│    Koa 中间件链（洋葱模型）         │
│                                  │
│  1. koaStatic      静态资源服务    │
│  2. koaNunjucks    模板引擎注册    │
│  3. bodyParser     请求体解析      │
│  4. apiSignVerify  API签名校验    │
│  5. errorHandle    异常捕获       │
│  6. apiParamsVerify 参数校验      │
└───────────┬──────────────────────┘
            │
            ▼
┌──────────────────────────────────┐
│  路由匹配：/view/:page            │
│  → ctx.params.page = 'project-list' │
│  → ViewController.renderPage()   │
└───────────┬──────────────────────┘
            │
            ▼
┌──────────────────────────────────┐
│  Nunjucks 渲染模板                │
│  dist/entry.project-list.tpl     │
│  注入 env / options 变量          │
│  输出 HTML（含空 <div id="root">） │
└───────────┬──────────────────────┘
            │
            ▼
┌──────────────────────────────────┐
│  浏览器接收 HTML                  │
│  下载 entry.project-list.js      │
│  Vue 3 createApp → mount('#root')│
│  页面渲染完成                     │
└──────────────────────────────────┘
```

### 渲染方式：CSR + 服务端模板注入

**不是 SSR**。服务端只负责返回 HTML 骨架和注入环境变量，`<div id="root">` 是空的，所有页面内容由客户端 Vue 渲染。

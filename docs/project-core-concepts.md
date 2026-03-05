# Elpis-core 项目核心概念文档

## 一、目录结构概览

```
model/
├── index.js                    # 核心：扫描并组装 modelList
├── business/                   # 模型目录（modelKey = 'business'）
│   ├── model.js                # 模型基础配置
│   └── project/
│       ├── taobao.js           # 项目配置（projKey = 'taobao'）
│       └── pdd.js              # 项目配置（projKey = 'pdd'）
└── course/                     # 模型目录（modelKey = 'course'）
    ├── model.js                # 模型基础配置
    └── project/
        ├── bilibili.js         # 项目配置（projKey = 'bilibili'）
        └── douyin.js           # 项目配置（projKey = 'douyin'）
```

---

## 二、核心概念

### 2.1 modelKey（模型标识）

- **来源**：从文件路径中提取，即 `model/{modelKey}/model.js` 中的目录名
- **提取逻辑**（`model/index.js`）：
  ```js
  const modelKey = normalizedFile.match(/\/model\/(.*?)\/project/)?.[1];
  // 或
  const modelKey = normalizedFile.match(/\/model\/(.*?)\/model\.js/)?.[1];
  ```
- **当前项目中的值**：`'business'`、`'course'`

### 2.2 projKey（项目标识）

- **来源**：从项目配置文件的文件名中提取，即 `model/{modelKey}/project/{projKey}.js` 中的文件名（不含 `.js`）
- **提取逻辑**（`model/index.js`）：
  ```js
  const projectKey = normalizedFile.match(/\/project\/(.*?)\.js/)?.[1];
  ```
- **当前项目中的值**：`'taobao'`、`'pdd'`、`'bilibili'`、`'douyin'`
- **API 中的使用**：通过 query 参数 `proj_key` 传入，用于筛选特定项目
  ```
  GET /api/project/list?proj_key=taobao   → 返回淘宝项目
  GET /api/project/list                    → 返回所有项目
  ```

### 2.3 model（模型配置）

模型定义了一个业务领域的**基础菜单和通用配置**，供其下的所有项目继承。

**示例** — `model/business/model.js`：
```js
{
    model: 'dashboard',
    name: '电商系统',
    menu: [
        { key: 'product', name: '商品管理', menuType: 'module', moduleType: 'custom', customConfig: { path: '/todo' } },
        { key: 'order',   name: '订单管理', menuType: 'module', moduleType: 'custom', customConfig: { path: '/todo' } },
        { key: 'client',  name: '客户管理', menuType: 'module', moduleType: 'custom', customConfig: { path: '/todo' } },
    ]
}
```

**示例** — `model/course/model.js`：
```js
{
    model: 'dashboard',
    name: '课程系统',
    menu: [
        { key: 'video', name: '视频管理', menuType: 'module', moduleType: 'custom', customConfig: { path: '/todo' } },
        { key: 'user',  name: '客户管理', menuType: 'module', moduleType: 'custom', customConfig: { path: '/todo' } },
    ]
}
```

### 2.4 project（项目配置）

项目是具体的业务实例，**继承并覆盖**所属模型的配置。项目可以：
- **修改**模型中已有的菜单项（通过相同的 `key` 匹配）
- **新增**模型中没有的菜单项
- **保留**模型中有但项目未覆盖的菜单项

**示例** — `model/business/project/pdd.js`（拼多多，继承 business 模型）：
```js
{
    name: '拼多多',
    desc: '拼多多电商系统',
    menu: [
        { key: 'product', name: '商品管理（拼多多）' },  // 修改：覆盖 model 中 product 的 name
        { key: 'client',  name: '客户管理（拼多多）' },  // 修改：覆盖 model 中 client 的 name
        { key: 'data',    name: '数据分析', ... },       // 新增：model 中没有的菜单
        { key: 'sider-search', name: '信息查询', ... },  // 新增
    ]
}
```

> 继承后，拼多多的最终菜单 = model 的 `product`(被覆盖) + model 的 `order`(保留) + model 的 `client`(被覆盖) + 新增的 `data` + 新增的 `sider-search`

### 2.5 modelItem（模型项）

`modelList` 数组中的每一个元素，包含一个完整的模型及其下属的所有项目。

**数据结构**：
```js
{
    model: {                        // 模型基础配置（来自 model.js，运行时注入 key）
        key: 'business',            // = modelKey
        model: 'dashboard',
        name: '电商系统',
        menu: [...]
    },
    project: {                      // 所有项目配置（key 为 projKey，值为继承后的完整配置）
        'taobao': { projectKey: 'taobao', name: '淘宝', menu: [...], ... },
        'pdd':    { projectKey: 'pdd',    name: '拼多多', menu: [...], ... }
    },
    modelKey: 'business'            // 冗余字段，= model.key
}
```

### 2.6 modelList（模型列表）

所有 `modelItem` 组成的数组，是整个项目的**顶层数据结构**。

```js
[
    {   // modelItem[0]
        model: { key: 'business', name: '电商系统', menu: [...] },
        project: {
            'taobao': { projectKey: 'taobao', name: '淘宝', ... },
            'pdd':    { projectKey: 'pdd',    name: '拼多多', ... }
        },
        modelKey: 'business'
    },
    {   // modelItem[1]
        model: { key: 'course', name: '课程系统', menu: [...] },
        project: {
            'bilibili': { projectKey: 'bilibili', name: 'b站课堂', ... },
            'douyin':   { projectKey: 'douyin',   name: '抖音课堂', ... }
        },
        modelKey: 'course'
    }
]
```

---

## 三、核心流程

### 3.1 数据组装流程（`model/index.js`）

```
1. glob 扫描 model/ 下所有 .js 文件（排除 index.js）
       ↓
2. 根据路径判断类型：包含 /project/ → project 类型，否则 → model 类型
       ↓
3. 从路径中提取 modelKey 和 projectKey
       ↓
4. 按 modelKey 分组，挂载到 modelList 对应的 modelItem 上
       ↓
5. 执行继承：每个 project 调用 projectExitModel(model, project) 合并配置
       ↓
6. 返回最终的 modelList
```

### 3.2 继承合并规则（`projectExitModel` 函数）

底层使用 `lodash.mergeWith`，对数组类型做特殊处理：

| 场景 | 规则 | 说明 |
|------|------|------|
| project 和 model 都有同 key 的项 | **递归合并覆盖** | project 的值覆盖 model 的值 |
| model 有但 project 没有 | **保留 model** | 模型的默认配置不丢失 |
| project 有但 model 没有 | **新增** | 项目独有的配置被追加 |

### 3.3 API 调用流程

```
客户端请求
    ↓
app/router/project.js          路由分发
    ↓
app/controller/project.js      参数提取 + DTO 转换
    ↓
app/service/project.js         业务逻辑（遍历 modelList）
    ↓
model/index.js                 数据源（modelList）
```

**API 列表**：

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/project/list` | GET | 获取项目列表，可选参数 `proj_key` 筛选 |
| `/api/project/model_list` | GET | 获取所有模型与项目的结构化数据 |

---

## 四、概念关系图

```
modelList (数组)
│
├── modelItem[0]
│   ├── model ──────── { key: 'business', name: '电商系统', menu: [...] }
│   │                     ↑ modelKey = 'business'（从目录名提取）
│   │
│   └── project ────── {
│       ├── 'taobao'  → { projectKey: 'taobao', name: '淘宝', menu: [...] }
│       │                  ↑ projKey = 'taobao'（从文件名提取）
│       │                  ↑ menu = model.menu 与 project.menu 合并后的结果
│       └── 'pdd'     → { projectKey: 'pdd', name: '拼多多', menu: [...] }
│
└── modelItem[1]
    ├── model ──────── { key: 'course', name: '课程系统', menu: [...] }
    └── project ────── {
        ├── 'bilibili' → { projectKey: 'bilibili', name: 'b站课堂', menu: [...] }
        └── 'douyin'   → { projectKey: 'douyin', name: '抖音课堂', menu: [...] }
```

---

## 五、快速参考

| 概念 | 类型 | 含义 | 示例值 |
|------|------|------|--------|
| `modelList` | `Array` | 所有模型的集合 | `[modelItem0, modelItem1]` |
| `modelItem` | `Object` | 单个模型 + 其下所有项目 | `{ model, project, modelKey }` |
| `modelKey` | `String` | 模型标识，从目录名提取 | `'business'`, `'course'` |
| `model` | `Object` | 模型基础配置（菜单模板） | `{ name: '电商系统', menu: [...] }` |
| `project` | `Object` | 项目集合，key 为 projKey | `{ taobao: {...}, pdd: {...} }` |
| `projKey` | `String` | 项目标识，从文件名提取 | `'taobao'`, `'bilibili'` |
| `projectExitModel` | `Function` | 项目继承模型的合并函数 | 深度合并，数组按 key 匹配 |

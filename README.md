# 师闲趣

<p align="center">
  <b>校园二手交易平台</b><br>
  <sub>基于微信小程序 · 云开发 CloudBase · TDesign 组件库</sub>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-WeChat%20MiniProgram-07C160?logo=wechat&logoColor=white" alt="platform">
  <img src="https://img.shields.io/badge/backend-CloudBase-0ABF53?logo=tencentcloud&logoColor=white" alt="backend">
  <img src="https://img.shields.io/badge/UI-TDesign-0052CC" alt="UI">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="license">
</p>

---

## 项目简介

师闲趣是一个面向高校校园的二手商品交易小程序。学生可以自由发布闲置物品、浏览商品信息、收藏感兴趣的物品，并通过内置的云开发后端实现完整的交易闭环。系统支持管理员审核机制，确保内容质量。

## 功能概览

| 模块 | 描述 |
|------|------|
| 🏠 **广场** | 瀑布流展示最新上架商品，支持分类筛选与下拉刷新 |
| ✏️ **发布** | 多图上传至云存储，填写标题、价格、成色、分类、联系方式 |
| 🔍 **搜索** | 关键词模糊搜索商品标题，结果按发布时间排序 |
| 📋 **详情** | 大图轮播、图文描述、卖家联系方式一键复制 |
| ❤️ **收藏** | 收藏/取消收藏，个人中心查看收藏列表 |
| 👤 **用户系统** | 微信授权登录，普通用户 / 管理员角色分流 |
| 🛠️ **管理后台** | 查看全部商品（含待审核），上架/下架/删除操作 |

## 技术架构

```
┌──────────────────────────────────────────┐
│               微信小程序前端                │
│    TDesign Miniprogram · dayjs            │
├──────────────────────────────────────────┤
│              CloudBase 云开发               │
│  ┌──────────┬──────────┬──────────────┐  │
│  │ 云函数    │ 云数据库  │   云存储      │  │
│  │ Node.js  │ MongoDB  │   图片托管    │  │
│  └──────────┴──────────┴──────────────┘  │
└──────────────────────────────────────────┘
```

### 云函数

| 函数 | 触发方 | 用途 |
|------|--------|------|
| `getUserRole` | 小程序端 | 获取用户角色，区分管理员与普通用户 |
| `publishProduct` | 小程序端 | 商品增删改，图片上传 |
| `getProducts` | 小程序端 | 商品列表查询，支持多条件筛选与分页 |
| `getProductDetail` | 小程序端 | 获取单一商品详情 |
| `toggleFavorite` | 小程序端 | 收藏/取消收藏 |
| `campusWall` | 小程序端 | 校园信息墙发布、列表、审核 |

### 数据库集合

| 集合 | 核心字段 |
|------|---------|
| `users` | `_openid` · `nickName` · `avatarUrl` · `role` |
| `products` | `title` · `price` · `images` · `coverImage` · `status` · `category` |
| `favorites` | `_openid` · `productId` |
| `campus_posts` | `title` · `type` · `images` · `status` · `likeCount` |

## 项目结构

```
miniprogram-1/
├── pages/
│   ├── wall/                    # 广场首页（瀑布流）
│   ├── publish/                 # 商品发布 / 编辑
│   ├── search/                  # 搜索页
│   ├── detail/                  # 商品详情
│   ├── login/                   # 授权登录
│   ├── goods/
│   │   ├── list/                # 商品列表
│   │   ├── details/             # 商品详情
│   │   ├── search/              # 搜索入口
│   │   └── result/              # 搜索结果
│   ├── usercenter/
│   │   ├── index/               # 个人中心
│   │   ├── favorites/           # 我的收藏
│   │   ├── person-info/         # 个人信息
│   │   └── name-edit/           # 昵称编辑
│   └── admin/
│       └── home/                # 管理后台
├── cloudfunctions/              # 6 个云函数
├── custom-tab-bar/              # 自定义底部导航栏
├── common/                      # 公共工具（版本更新管理等）
├── style/                       # 全局样式与图标字体
├── images/                      # 静态图片资源
├── app.js                       # 应用入口，云开发初始化
├── app.json                     # 全局配置，路由注册
├── app.wxss                     # 全局样式
├── project.config.json          # 微信开发者工具项目配置
└── package.json                 # npm 依赖声明
```

## 页面预览

<p align="center">
 
</p>

> 更多页面截图正在整理中。

## 快速开始

### 环境要求

- [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html) ≥ 1.06
- Node.js ≥ 14（云函数运行时）
- 微信小程序 AppID（[注册入口](https://mp.weixin.qq.com/)）

### 1. 克隆仓库

```bash
git clone https://github.com/你的用户名/仓库名.git
cd miniprogram-1
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

打开 `app.js`，将 `your-env-id` 替换为你的云开发环境 ID：

```js
wx.cloud.init({
  env: 'your-env-id',   // ← 替换为实际环境 ID
  traceUser: true
});
```

打开 `project.config.json`，将 `your-appid` 替换为你的小程序 AppID。

### 4. 构建 npm

微信开发者工具中点击 **工具 → 构建 npm**，等待构建完成。

### 5. 部署云函数

右键点击 `cloudfunctions/` 下的每个云函数文件夹 → **上传并部署：云端安装依赖**。

### 6. 初始化数据库

在云开发控制台 → 数据库中新建集合：

```
users
products
favorites
campus_posts
```

权限建议设置为「仅创建者可读写」。

### 7. 创建管理员账号

在 `users` 集合中手动添加记录：

```json
{
  "_openid": "你的微信 OpenID",
  "nickName": "管理员",
  "avatarUrl": "",
  "role": "admin",
  "createTime": { "$date": "2026-06-14T00:00:00Z" }
}
```

> 首次登录后可在云开发控制台查看自动创建的 `users` 记录，将其 `role` 改为 `"admin"` 即可。

## 说明

本项目基于 [TDesign 云开发电商模板](https://tcb.cloud.tencent.com/cloud-template/detail?appName=electronic-business) 改造，原模板由腾讯云开发团队与 TDesign 团队联合提供，许可证 MIT。

## License

[MIT](LICENSE)

# 师闲物 - 云开发部署指南

## 一、环境配置

- **云环境 ID**: `cloud1-d5go8oau1669dda05`
- **AppID**: `wx2e7861bfd789d365`

## 二、部署步骤

### 1. 微信开发者工具中开通云开发

在微信开发者工具中点击「云开发」按钮，开通云开发环境。

### 2. 上传云函数

右键点击 `cloudfunctions` 目录下的每个云函数文件夹，选择「上传并部署：云端安装依赖」：

- `getUserRole` — 获取用户角色
- `publishProduct` — 发布/编辑/删除商品
- `getProducts` — 获取商品列表
- `getProductDetail` — 获取商品详情
- `toggleFavorite` — 切换收藏状态

### 3. 创建数据库集合

在云开发控制台 → 数据库中，创建以下集合：

```
users        — 用户表
products     — 商品表
favorites    — 收藏表
```

#### 集合权限设置

所有集合的权限设置为：「仅创建者可读写」（或根据需要在云函数端处理权限）。

### 4. 初始化管理员账号

在云开发控制台 → 数据库 → `users` 集合中，**手动添加一条记录**：

```json
{
  "_openid": "你的微信openid",
  "nickName": "管理员",
  "avatarUrl": "",
  "role": "admin",
  "createTime": "2026-06-09T00:00:00Z"
}
```

> **获取 openid 的方法**：先以普通用户身份登录一次小程序，然后在云开发控制台 → 数据库 → `users` 中查看自动创建的记录，复制其中的 `_openid`，然后修改该记录的 `role` 字段为 `"admin"`。

## 三、系统架构

### 登录分流

```
用户打开小程序
    │
    ▼
登录页 (pages/login/index)
    │
    ▼
调用云函数 getUserRole
    │
    ├─ role === 'admin'  ➜  管理后台 (pages/admin/home/index)
    │
    └─ role === 'user'   ➜  用户首页 (pages/home/home)
```

### 管理员系统

| 功能 | 页面 | 说明 |
|------|------|------|
| 商品管理 | `pages/admin/home/index` | 查看全部商品、上下架、删除 |
| 发布商品 | `pages/publish/index` | 上传图片到云存储、填写信息 |
| 编辑商品 | `pages/publish/index?id=xxx` | 修改已有商品 |
| 浏览详情 | `pages/goods/details/index` | 查看商品（同用户系统） |

### 用户系统

| 功能 | 页面 | 说明 |
|------|------|------|
| 浏览首页 | `pages/home/home` | 瀑布流展示最新商品 |
| 分类浏览 | `pages/goods/category/index` | 按分类筛选 |
| 商品详情 | `pages/goods/details/index` | 查看描述、获取卖家微信 |
| 收藏商品 | 详情页底部 | 切换收藏状态 |
| 我的收藏 | `pages/usercenter/favorites/index` | 查看收藏列表 |
| 我的发布 | `pages/goods/list/index?myOnly=1` | 查看自己发布的商品 |

## 四、云数据库结构

### users 集合

| 字段 | 类型 | 说明 |
|------|------|------|
| `_openid` | string | 自动生成，微信用户唯一标识 |
| `nickName` | string | 微信昵称 |
| `avatarUrl` | string | 头像 URL |
| `role` | string | `"admin"` 或 `"user"` |
| `createTime` | date | 创建时间 |

### products 集合

| 字段 | 类型 | 说明 |
|------|------|------|
| `_openid` | string | 发布者 openid |
| `title` | string | 商品标题 |
| `price` | number | 价格 |
| `coverImage` | string | 封面图 cloud://fileID |
| `images` | array | 图片列表 |
| `cloudImageIds` | array | 云存储 fileID 列表 |
| `desc` | string | 描述 |
| `category` | string | 分类名称 |
| `condition` | string | 成色 |
| `publisher` | object | `{ nickname, avatar, wechat, phone, phoneRaw, dorm }` |
| `status` | string | `"on"` 上架 / `"off"` 下架 |
| `viewCount` | number | 浏览次数 |
| `publishTime` | date | 发布时间 |
| `createTime` | date | 创建时间 |

### favorites 集合

| 字段 | 类型 | 说明 |
|------|------|------|
| `_openid` | string | 收藏者 openid |
| `productId` | string | 商品 _id |
| `createTime` | date | 收藏时间 |

## 五、云函数说明

| 云函数 | 触发方式 | 参数 |
|--------|---------|------|
| `getUserRole` | 小程序端调用 | 无（自动获取 openid） |
| `publishProduct` | 小程序端调用 | `{ action, product/productId }` |
| `getProducts` | 小程序端调用 | `{ page, pageSize, category, keyword, status, myOnly }` |
| `getProductDetail` | 小程序端调用 | `{ productId }` |
| `toggleFavorite` | 小程序端调用 | `{ productId }` |

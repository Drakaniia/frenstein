# 项目概览

这是一个基于 React + TypeScript + Vite 的生日庆祝网站项目，使用了现代化的 UI 组件库和动画效果。该项目是一个交互式的生日祝福页面，包含密码解锁、动画效果、图片画廊等功能。

## 主要技术栈

- **前端框架**: React 18.3.1 + TypeScript
- **构建工具**: Vite 5.4.21
- **UI 组件库**: Radix UI + shadcn/ui
- **样式框架**: Tailwind CSS
- **动画库**: GSAP (GreenSock Animation Platform)
- **路由**: React Router DOM
- **状态管理**: React Query (TanStack Query)
- **图标**: Lucide React

## 项目结构

```
src/
├── components/          # 可复用组件
│   ├── ui/             # shadcn/ui 基础组件
│   ├── LandingCard.tsx # 密码解锁卡片
│   ├── HeroSection.tsx # 主英雄区域
│   ├── MemoryGallery.tsx # 记忆画廊
│   └── ...            # 其他特效组件
├── pages/              # 页面组件
│   ├── Index.tsx       # 主页面
│   └── NotFound.tsx    # 404页面
├── hooks/              # 自定义Hooks
├── lib/                # 工具函数
└── assets/             # 静态资源
```

## 核心功能

### 1. 密码解锁系统
- 4位数字密码验证（默认密码：2306）
- 虚拟数字键盘
- 错误提示和动画效果
- 成功解锁后的过渡动画

### 2. 动画效果
- GSAP 动画库实现的复杂页面动画
- 滚动触发动画 (ScrollTrigger)
- 五彩纸屑效果
- 悬停和交互效果

### 3. 响应式设计
- 移动端优先的响应式布局
- 适配各种屏幕尺寸
- 触摸友好的交互设计

## 构建和运行

### 开发环境
```bash
npm run dev
```
启动开发服务器，默认运行在 `http://localhost:8080`

### 构建生产版本
```bash
npm run build
```
构建生产版本到 `dist/` 目录

### 预览生产版本
```bash
npm run preview
```
预览构建后的生产版本

### 代码检查和格式化
```bash
npm run lint      # ESLint 代码检查
npm run format    # Prettier 代码格式化
```

## 开发约定

### 代码风格
- 使用 TypeScript 进行类型检查
- 遵循 ESLint 规则
- 使用 Prettier 进行代码格式化
- 组件使用 PascalCase 命名
- 文件名使用 PascalCase（组件）或 camelCase（工具函数）

### 组件开发
- 所有 UI 组件基于 shadcn/ui 构建
- 使用 Tailwind CSS 进行样式设计
- 组件应包含适当的 TypeScript 类型定义
- 使用 React Hooks 管理状态和副作用

### 资源管理
- 静态资源放在 `src/assets/` 目录
- 图片资源使用 WebP 格式优化
- 动画资源（如 GIF）适当控制大小

## 特殊说明

### 密码修改
默认密码为 `2306`，可在 `src/components/LandingCard.tsx` 中修改：
```typescript
const correctPin = '2306'; // 修改这里的值
```

### 动画配置
GSAP 动画配置在各个组件中独立管理，主要动画参数：
- 持续时间：0.5s - 0.8s
- 缓动函数：主要使用 'power3.out', 'back.out', 'elastic.out'
- 滚动触发：使用 ScrollTrigger 插件

### 主题定制
Tailwind CSS 主题配置在 `tailwind.config.ts` 中：
- 自定义颜色变量使用 CSS 变量
- 自定义动画关键帧
- 响应式断点配置

## 依赖管理

### 主要依赖
- React 生态系统（React, React DOM, React Router）
- Radix UI 组件库（无障碍访问支持）
- GSAP 动画库
- Tailwind CSS 样式框架

### 开发依赖
- Vite 构建工具
- TypeScript 类型检查
- ESLint + Prettier 代码质量工具
- 测试相关工具（Testing Library, Playwright）

## 部署建议

1. 构建生产版本：`npm run build`
2. 将 `dist/` 目录内容部署到静态文件服务器
3. 确保服务器支持 SPA 路由（所有路由重定向到 index.html）
4. 配置适当的缓存策略

## 注意事项

- 项目使用了相对路径导入（`@/` 别名指向 `src/` 目录）
- 动画效果可能需要一定的加载时间，建议在低速网络环境下测试
- 某些动画效果在低端设备上可能会有性能影响
- 图片资源较大，建议在生产环境中使用 CDN 加速
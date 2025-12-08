# Vite 统一构建迁移备忘录

## 迁移日期

2025-12-09

## 迁移目标

将 LeafSeamer 项目的所有构建工具统一为 Vite，包括 extension（后端）和 dashboard/graphics（前端）部分。

---

## 迁移前状态

### 构建方式

- **Extension (后端)**: 使用 TypeScript 编译器 (`tsc`) 直接编译
- **Dashboard/Graphics (前端)**: 使用 Vite 进行打包

### 问题

- 构建工具不统一，维护成本高
- 需要维护两套构建配置
- 开发体验不一致

---

## 迁移后状态

### 构建方式

- **所有组件**: 统一使用 Vite 进行构建
- **Extension**: 使用 Vite 库模式 + CommonJS 输出格式
- **Dashboard/Graphics**: 继续使用 Vite（无变化）

### 优势

✅ 构建工具统一，易于维护  
✅ 构建速度更快（esbuild）  
✅ 配置集中管理  
✅ 更好的依赖优化

---

## 关键技术点

### 1. Vite 库模式配置

创建了 [`vite.config.extension.ts`](file:///e:/GitHub%20repository/LeafSeamer/vite.config.extension.ts) 文件，关键配置如下：

```typescript
build: {
  lib: {
    entry: entryFile,
    formats: ["cjs"],  // NodeCG 需要 CommonJS 格式
    fileName: () => "index.js",
  },
  rollupOptions: {
    external: [
      "nodecg/types",
      "nodecg",
      /^node:.*/,  // Node.js 内置模块
      // 其他第三方依赖
    ]
  }
}
```

### 2. 环境变量传递

通过 `BUNDLE_NAME` 环境变量指定当前构建的 bundle：

```typescript
const bundleName = process.env.BUNDLE_NAME;
```

### 3. External 依赖配置

正确配置 `external` 非常重要，需要排除：

- NodeCG 相关模块 (`nodecg`, `nodecg/types`)
- Node.js 内置模块 (`fs`, `path`, `net`, `dgram` 等)
- 第三方运行时依赖 (`node-osc`, `obs-websocket-js` 等)

---

## 修改的文件清单

### 核心配置文件

1. **[NEW]** [`vite.config.extension.ts`](file:///e:/GitHub%20repository/LeafSeamer/vite.config.extension.ts)
   - 新建统一的 extension Vite 配置

2. **[MODIFY]** [`scripts/build-bundles.ts`](file:///e:/GitHub%20repository/LeafSeamer/scripts/build-bundles.ts#L46-L53)
   - 添加 `BUNDLE_NAME` 环境变量传递

### Bundle 配置文件

修改了所有 6 个 bundle 的 `package.json`：

3. [`bundles/mixer-control/package.json`](file:///e:/GitHub%20repository/LeafSeamer/bundles/mixer-control/package.json#L33-L37)
4. [`bundles/obs-control/package.json`](file:///e:/GitHub%20repository/LeafSeamer/bundles/obs-control/package.json#L25-L29)
5. [`bundles/backup-system/package.json`](file:///e:/GitHub%20repository/LeafSeamer/bundles/backup-system/package.json#L17-L21)
6. [`bundles/data-sync-service/package.json`](file:///e:/GitHub%20repository/LeafSeamer/bundles/data-sync-service/package.json#L9-L12)
7. [`bundles/logger-system/package.json`](file:///e:/GitHub%20repository/LeafSeamer/bundles/logger-system/package.json#L17-L21)
8. [`bundles/schedule-manager/package.json`](file:///e:/GitHub%20repository/LeafSeamer/bundles/schedule-manager/package.json#L24-L28)

**修改内容：**

```diff
"scripts": {
-  "build:extension": "tsc",
+  "build:extension": "vite build --config ../../vite.config.extension.ts",
   "build:dashboard": "vite build --config ../../vite.config.dashboard.ts",
   "build": "npm run build:extension && npm run build:dashboard",
-  "watch:extension": "tsc --watch",
+  "watch:extension": "vite build --config ../../vite.config.extension.ts --watch",
   "watch": "npm run watch:extension"
}
```

---

## 验证结果

### 构建测试

✅ 所有 bundle 构建成功  
✅ 生成的 extension/index.js 为 CommonJS 格式  
✅ 构建速度正常

### 运行测试

✅ NodeCG 成功启动  
✅ 所有 extension 正常加载  
✅ 无运行时错误

### 测试命令

```bash
# 构建所有 bundles
npm run build

# 启动 NodeCG
npm run dev

# 单个 bundle watch 模式
cd bundles/mixer-control
npm run watch:extension
```

---

## 开发工作流

### 日常开发

```bash
# 启动 NodeCG 开发服务器
npm run dev

# 另开终端，监听某个 bundle 的 extension 变化
cd bundles/mixer-control
npm run watch:extension
```

### 生产构建

```bash
# 构建所有 bundles
npm run build
```

---

## 注意事项

### 1. 依赖管理

- 新增依赖后，需要检查是否应该添加到 `vite.config.extension.ts` 的 `external` 列表
- 运行时依赖应该被 external，构建时依赖可以打包

### 2. 调试

- Vite 构建后的代码已经过打包，调试时建议启用 sourcemap
- 开发模式下会自动生成 sourcemap (`sourcemap: mode === "development"`)

### 3. tsconfig.json

- 各 bundle 的 `tsconfig.json` 仍然保留，用于类型检查
- 可以使用 `npm run typecheck` 进行类型检查

---

## 后续优化建议

### 短期

1. 监控构建速度，收集反馈
2. 观察是否有运行时兼容性问题
3. 完善开发文档

### 长期

1. 考虑是否可以进一步优化 `external` 配置
2. 评估是否需要代码分割
3. 考虑添加构建缓存机制

---

## 回退方案

如果遇到无法解决的问题，可以通过以下方式回退：

```bash
# 使用 Git 回退所有修改
git checkout HEAD -- vite.config.extension.ts
git checkout HEAD -- scripts/build-bundles.ts
git checkout HEAD -- bundles/*/package.json
```

然后手动恢复为 `tsc` 构建方式。

---

## 参考资料

- [Vite 库模式文档](https://vite.dev/guide/build.html#library-mode)
- [NodeCG Extension 文档](https://www.nodecg.dev/docs/extensions)
- [项目实施计划](file:///C:/Users/tensi/.gemini/antigravity/brain/c7dcb381-0844-4d31-a598-16e3893ecec3/implementation_plan.md)

---

## 总结

✅ **迁移成功**：所有构建工具已统一为 Vite  
✅ **功能正常**：NodeCG 和所有 extension 运行正常  
✅ **收益明显**：构建工具统一，维护成本降低

统一使用 Vite 构建是一个成功的技术决策，为项目的长期维护带来了显著的收益。

# F1 终审真实 UI 行为修复报告

## 修改文件

- `bundles/atem-control/src/dashboard/atem-panel.tsx`
- `bundles/obs-control/src/dashboard/obs-control-panel.tsx`
- `bundles/obs-control/src/dashboard/obs-control-panel.css`
- `bundles/obs-control/src/dashboard/obs-connection.tsx`
- `bundles/vb-matrix-control/src/dashboard/components/PatchStatus.tsx`
- `bundles/vb-matrix-control/src/dashboard/components/NetworkConfigList.tsx`
- `tests/dashboard-ui-device.test.ts`
- `DEVELOPMENT_MEMO.md`

## 实现结果

- ATEM Macro、OBS Streaming、OBS Connection 与 VB Patch 均在发送命令前通过同步 `useRef` 获取互斥锁，在途时禁用相关控件并展示 pending；错误继续进入原 toast，锁仅在 `finally` 释放。
- OBS Scene 使用相邻的原生选择按钮与 "Switch to program" 按钮。Switch 的键盘和点击路径只调用既有 `setOBSScene` 消息。
- OBS Playlist 实现模态语义、标题和描述、打开聚焦、Tab/Shift+Tab 圈定、Escape、遮罩关闭与触发元素焦点恢复。
- VB Network 删除确认完成后，使用稳定 `data-network-remove-id` 恢复到相邻配置的 Remove；无相邻项时回退 Add Configuration。Cancel 保持 ConfirmDialog 原有恢复逻辑。

## RED

命令：

```powershell
node -r ts-node/register -e "require('./tests/dashboard-ui-device.test'); require('./tests/test-harness').runTests();"
```

结果：初始 7 项中 4 项失败，分别指出现有代码缺少同步命令锁/pending/finally、Scene 原生相邻按钮、Playlist 模态焦点合同和 Network 删除焦点恢复。随后追加“仅对仍在 DOM 的触发元素恢复焦点”合同，得到 1 项预期失败。

## GREEN

命令与结果：

- 上述定向命令：7/7 通过。
- `npm.cmd test`：84/84 通过；仅输出既有 `node:sqlite` experimental warning。
- `npm.cmd run typecheck`：通过。
- `npm.cmd run build --workspace atem-control`：通过；仅输出既有 Vite `build.outDir` 警告。
- `npm.cmd run build --workspace obs-control`：通过；仅输出既有 Vite `build.outDir` 警告。
- `npm.cmd run build --workspace vb-matrix-control`：通过；仅输出既有 Vite `build.outDir` 警告。
- `git diff --check`：通过。

## 提交

- 实现提交：`b410358`（`fix: harden dashboard command interactions`）。

## Graphics 检查

```powershell
git diff --name-only 4cb3af2..HEAD -- bundles/graphics-package
```

结果为空，未修改 `graphics-package`。

## 遗留风险

- 当前环境没有真实 ATEM、OBS、VB Matrix 设备或认证 NodeCG 会话；已验证的静态合同、类型检查和独立构建不能替代真实命令往返与辅助技术的现场验收。

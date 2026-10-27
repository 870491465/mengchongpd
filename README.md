# 萌宠拼豆

Cocos Creator **3.8.8** 手机竖屏拼豆原型。当前关卡为“小猫的花园”，80×80、6400颗，使用20色色板，支持手动装填与全自动逐排发射。

## 运行

1. 使用 Cocos Creator 3.8.8 打开项目根目录，等待资源与脚本导入完成。
2. 打开 `assets/scenes/RowPrototype.scene` 并预览，从首页点击“开始拼豆”。
3. 可点击“全自动”完成整图，或按颜色装夹并按住发射。枪头上的倍率可调整发射节奏；右上设置可调整动作参数、慢放、重置或返回首页。
4. 完成后自动显示成功结算页。收藏写入本机存储；当前仅一关，“继续拼豆”返回首页。浏览器分享支持系统文件分享或PNG导出，原生平台分享SDK尚未接入。

## 代码与资源

- `assets/scripts/RowModel.ts`：逐排模拟、目标预占、弹药计数、换夹和自动模式。
- `assets/scripts/RowPrototype.ts`：游戏场景、触摸与动画展示。
- `assets/scripts/HomeScreen.ts`、`SuccessScreen.ts`：首页与成功结算页。
- `assets/scripts/PictureData.ts`：当前80×80矩阵与关卡名称。
- `assets/resources/`：实际运行素材、临时音效和合成棋盘贴图。
- `docs/`：原始设计说明、UI参考与小猫源图。
- `doc/`：启动、页面接入、验证与性能优化记录。

静态拼图使用同矩阵合成贴图，游戏保留当前行80颗实时豆及飞行豆。手工修改矩阵或色板后，运行 `python tools/bake-picture.py` 同步贴图。Python脚本需要 Pillow。

从猫源图重新采样：

```powershell
python tools/create-cat-picture.py --size 80
```

## 验证

以下脚本使用Node.js执行模拟与场景代码检查。脚本默认寻找Windows标准安装位置的Creator 3.8.8；其他安装位置可设置 `COCOS_EDITOR`（编辑器目录）和 `COCOS_TSC`（该编辑器内TypeScript的tsc.js路径）。

```powershell
node tools/test-initialization.cjs
node tools/test-row.cjs
node tools/test-picture.cjs
node tools/test-auto.cjs
node tools/test-home.cjs
node tools/test-success.cjs
node tools/test-row-render.cjs
node tools/test-render-performance.cjs
python tools/test-picture-texture.py
```

这些检查包括延迟资源加载、6400颗完整发射、换排、暂停、重置、收藏与节点预算。CPU场景代码检查不能代替Creator/GPU或手机验收；实际设备帧率、安全区、系统分享仍需实测，详见 `design-qa.md`。

`library/`、`temp/`、`build/` 等生成目录不提交；设计资源原压缩包已解压，因此不重复提交ZIP。

# 萌宠拼豆：成功结算页资源说明

对应reference/success_approved.png。共9张独立资源PNG，另附定稿与作品示例。按截图重绘拆分，非原始PSD分层；标题及可选边框存在注明的造型差异。尚未在Cocos工程运行验证。

## 结算页背景

![结算页背景](assets/background_success.png)

`assets/background_success.png`：不含UI的米白浅绿背景，花叶在底部边角；全屏铺满。

## 成功标题

![成功标题](assets/title_success.png)

`assets/title_success.png`：固定“拼好啦！”透明装饰字，重绘版比原图多一层奶油描边。

## 继续按钮底图

![继续按钮底图](assets/button_continue_base.png)

`assets/button_continue_base.png`：透明无字，叠加Label“继续拼豆”。

## 分享按钮底图

![分享按钮底图](assets/button_share_base.png)

`assets/button_share_base.png`：透明无字，叠加分享图标及Label“分享作品”。

## 返回首页

![返回首页](assets/button_home.png)

`assets/button_home.png`：圆形底座和房子合图，整体点击。

## 分享图标

![分享图标](assets/icon_share.png)

`assets/icon_share.png`：三节点分享符号，独立透明PNG。

## 收藏成功图标

![收藏成功图标](assets/icon_saved.png)

`assets/icon_saved.png`：绿色圆形勾选，仅保存成功后显示。

## 作品装饰框（可选）

![作品装饰框（可选）](assets/frame_artwork.png)

`assets/frame_artwork.png`：中心透明，重绘版边框比定稿厚且颗粒较大；要求贴合定稿时推荐用程序绘制细奶油圆角框，或用重复小方豆组成细边。不要用厚框遮住作品。

## 金色星光

![金色星光](assets/sparkle_gold.png)

`assets/sparkle_gold.png`：复用3–4份，轻微缩放淡入淡出，不遮挡作品。

## 作品来源必须一致

reference/artwork_example_only.png仅为原图裁切示例，不作为正式关卡完成图。实际结算页显示本局相同矩阵渲染的完整作品或游戏中主图区域的RenderTexture截图，不另换一张更漂亮的小猫。截图时排除当前行数字、枪、飞豆和界面文字，不能把UI一起截进去。

## Cocos布局与文字

建议设计分辨率864×1536，以下为左上原点参考矩形(x,y,w,h)，依据安全区微调，保持作品比例：返回首页(40,48,82,82)；成功标题(170,120,530,135)；关卡名(260,260,344,42)；作品区域(76,325,712,770)；收藏状态(328,1128,220,48)；继续按钮(188,1204,488,126)；分享按钮(270,1360,324,94)。

图层：Background → Artwork → Frame（可选）→ Sparkles → Title → LevelName → SavedStatus → Buttons。作品用同一关卡的行列比例等比适配，禁止为了填满边框拉伸。固定标题可使用title_success；关卡名读取level.name采用普通Label。按钮文案“继续拼豆”“分享作品”和状态“作品已收藏”用Label，不需要每关单做文字图片。

收藏状态必须在持久化保存成功后显示；失败时保留作品并提供重试，不假显示已收藏。继续按钮进下一关，无下一关时回选关或首页。分享按钮由真实用户点击后调用目标平台分享能力，不自动发出消息。返回首页保留本局完成记录。

按钮图默认整体等比缩放；需明显改宽高时再检查九宫格边缘。按下scale0.96、释放回1，触摸范围不少于44设计像素；界面整体位于安全区。PNG保留alpha并按SpriteFrame导入，普通设备/图标可用Linear。星光建议缩放0.9–1.05、透明度缓变，数量少、频率低。

本包不包含字体、音效、Cocos脚本。标题装饰字可替换为普通Label以统一工程字体。图片说明.html支持离线查看；asset_manifest.json记录各图实际尺寸。

## 给Codex

按reference/success_approved.png实现成功页，用assets分层组装，不把整张截图当背景。读取真实关卡名，展示玩家真实完成作品；保存成功再显示收藏勾选；实现继续、分享和返回首页。透明组件是重绘素材，请调整尺寸与定位。frame_artwork为较厚的可选框，优先按定稿绘制细框。验证长名称、作品比例、手机安全区、重复进入结算页不重复保存，以及下一关不存在时的跳转。报告实际验证情况，不宣称未执行的真机测试已通过。

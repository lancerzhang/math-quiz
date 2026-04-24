# math-quiz

一个适合小朋友在 iPad 上使用的数学口算练习页。

这个项目现在支持单人练习，也支持两个小朋友配合做测试：

- `100题闯关`：做完 100 题后统计答对、答错和总用时。
- `单人限时 3 分钟`：3 分钟内尽量多做，时间到自动结算。
- `双人限时 3 分钟`：一个小朋友拿着 iPad 看题目和答案，帮另一个小朋友做测试，点击 `√` / `×` 后自动进入下一题。

## 功能

- 支持 `简单 / 中等 / 困难` 三档难度。
- 支持加减法出题，结果不会出现负数。
- 支持最近 30 天历史记录，保存在 `localStorage`。
- 支持答题进度自动保存，刷新页面后可以继续当前这一局。
- 支持查看本局详情。

## 使用方式

直接用浏览器打开 [math.html](/C:/Dev/Projects/math-quiz/math.html:1) 即可。

如果是在 iPad 上使用，建议：

- 使用 Safari 打开。
- 把页面加入主屏幕，方便像应用一样点击进入。
- 保持横屏或竖屏都可以，页面已经做了自适应。

## 文件结构

- [math.html](/C:/Dev/Projects/math-quiz/math.html:1)：页面入口和主要结构。
- [styles/app.css](/C:/Dev/Projects/math-quiz/styles/app.css:1)：界面样式。
- [scripts/config.js](/C:/Dev/Projects/math-quiz/scripts/config.js:1)：模式、难度和存储 key 等配置。
- [scripts/questions.js](/C:/Dev/Projects/math-quiz/scripts/questions.js:1)：题目生成逻辑。
- [scripts/storage.js](/C:/Dev/Projects/math-quiz/scripts/storage.js:1)：`localStorage` 读写、历史清理、进度保存。
- [scripts/app.js](/C:/Dev/Projects/math-quiz/scripts/app.js:1)：答题流程、计时、结算、恢复进度。

## 存储说明

项目使用浏览器的 `localStorage` 保存数据：

- 当前答题进度：页面刷新后自动恢复。
- 历史记录：只保留最近 30 天。

如果手动清除浏览器站点数据，进度和历史记录也会一起被清除。

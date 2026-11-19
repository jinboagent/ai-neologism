# GAME-DEV-playbook — AI 协作开发网页游戏的门禁方法论

> 游戏从概念到上线的标准管线。适用于 `docs/games/` 下所有 game-NN 规格。
> 地位对标造词管线的 [COINING-PIPELINE-playbook.md](./COINING-PIPELINE-playbook.md)：那份管"词怎么来"，这份管"游戏怎么来"。
> 核心哲学一句话：**确定性内核 + AI 只在边界**。

---

## 一、游戏设计的第一性理念（评判一切概念卡的八条尺子）

1. **核心循环（Core Loop）**：存在一个 ≤30 秒的循环——"玩家做什么 → 得到什么 → 为什么想再来一次"。三问答不出来的设计未收敛。
2. **从感受倒推（MDA 框架）**：先写"想让玩家感受到什么"（顿悟？好奇？放松？），再定机制。机制(M)→涌现(D)→感受(A)，设计方向永远从 A 倒推 M，不反过来。
3. **心流通道（Flow）**：难度必须跟着能力涨——太易生无聊，太难生焦虑。词库游戏的难度旋钮天然丰富：起手套件、限步数、语义距离阈值、时限。
4. **即时反馈（Juice）**：任何操作 <100ms 内必须有可感知回应（颜色/动效/文案变化）。反馈迟滞是网页游戏手感的第一杀手。
5. **一句话动词**：好游戏能用一个动词讲完（猜 / 锻 / 连 / 拆 / 审 / 育）。讲不出动词 = 还没想清楚玩家在干什么。
6. **30 秒上手**：第一关必须是注定成功的题；教学即第一关，说明书即失败。
7. **仪式感与变动奖励**：每日同题全球共享（Wordle 真正的天才是仪式感不是机制）、连胜、首次发现 ✦。奖励要有变化性——新词本身就是最好的变动奖励。
8. **公平失败**：失败必须能归因于玩家**可学习的技巧**，而不是数据缺失或运气。词库游戏特别注意：没见过的词不是失败理由，是前提。

---

## 二、六阶段开发管线（每阶段有进出闸门）

### S0 概念卡（一页纸）
- 内容：fantasy（玩家幻想成为什么：造词师？侦探？训词师？）、核心动词、目标感受、一句话 pitch
- **出闸门**：能用"一个动词 + 一种感受"讲清

### S1 纸面规格（→ docs/games/game-NN-xxx.md）
- 内容：规则、数据契约（吃词库哪些字段）、胜负条件、难度旋钮清单、界面草图、开放问题
- **出闸门**：spec 文件存档（游戏一 Wordforge 即范例）

### S2 确定性引擎（无 AI、无 DOM）
- 核心状态机 = **纯函数 TS**（engine.ts 模式）：`(state, move) → state`
- vitest 单测：合法/非法操作、边界、seeded 随机
- **出闸门**：引擎测试全绿，不打开浏览器就能证明规则正确

### S3 可玩原型（UI + juice）
- **点击优先规则**：不碰键盘也能玩完整局（无障碍 + 移动端 + e2e 可自动化，三鸟一石）
- e2e harness：headless 浏览器模拟点击流，断言游戏状态（复用 scripts/test.mjs 的 162 检查模式）
- **出闸门**：e2e 全绿 + 关键截图过视觉审查

### S4 AI 层（内容与判分）
- **AI 只在边界**：配方生成 / 语义判分 = 独立 API 路由；引擎文件禁止 import AI 模块
- **磁带测试（record/replay）**：录一次真实 LLM 响应作为 fixture，此后单测永不联网
- **缓存确定性**：同输入必同输出（如 craft_pairs 的唯一约束）——"世界一致性"的机器保障
- **降级路径**：AI 不可用时游戏仍可玩（静态题库兜底）
- **出闸门**：拔掉 AI 网线，全部测试依然绿

### S5 试玩调参与上线
- **AI 试玩员**：LLM 走同一套点击 harness 玩游戏，报告困惑点（比人快、比人便宜、先于人发现教学断层）
- 体验指标（趣味代理）：完成率、再来一局率、分享卡点击率、首题用时
- **出闸门**：指标达标 + 真人试玩 ≥N 局无阻断性困惑

---

## 三、五层测试 harness 总表（对应嵌入式"回归门禁"的网页版）

| 层 | 测什么 | 放哪 | 禁入物 |
|---|---|---|---|
| L1 纯函数引擎 | 规则与状态机 | vitest 单测 | DOM、网络、AI |
| L2 数据契约 | GAME_DATA 形状、schema | vitest | 任何渲染逻辑 |
| L3 端到端点击流 | 真实浏览器里点完一局 | scripts/test.mjs 模式 | 键盘依赖 |
| L4 AI 边界 | 磁带回放、缓存确定性、降级 | fixture + 契约测试 | 真实联网 |
| L5 视觉/体验门 | 截图审查、AI 试玩员报告 | visual-judge + 播放日志 | — |

每层绿了才进下一层——和嵌入式 evidence gate（身份→套件→复位健康→存证）同构：**改动的验收不是"看着能跑"，是"门禁链条完整走过"**。

## 四、AI 在管线里的四个角色

| 角色 | 干什么 | 纪律 |
|---|---|---|
| 代码生成者 | 写引擎/UI/测试 | 受 L1 纯函数纪律约束 |
| 内容 oracle | 配方机（Wordforge 盲锻） | 只看输入对，永不看目标 |
| 判分 judge | 语义分 v0（v1 换 embedding 余弦） | 结果进缓存，可复现 |
| 试玩员 | 走点击 harness 玩游戏报困惑 | 与玩家同一套界面，无特权信息 |

## 五、本仓库已验证的先例

- L1：engine.ts 纯函数 + 39 条单测（含多语折叠）
- L3：e2e 162 检查（click-only 规则从第一天就执行）
- S0–S1 一次走通：Wordforge（game-01 spec + 悬赏模式试玩验证）

## 六、与其他文档的关系

- `docs/games/game-NN-*.md`：各游戏的 S1 产物（本 playbook 是它们的生产线）
- [CONVENTIONS.md](../CONVENTIONS.md)：i18n 等站点纪律仍然全量适用
- [COINING-PIPELINE-playbook.md](./COINING-PIPELINE-playbook.md)：游戏产出的好词回流词典时走那份管线

---

## 七、本项目实例化（AI Neologism 专属，2026-11-19 快照）

> 前六节是通用方法论；本节把每个抽象门禁锚定到**本仓库的具体文件、命令、数字**。
> 纪律不变式是门禁本身；下列路径与计数是随仓库生长的"表盘读数"——数字会漂移，门不会。

### 7.1 数据流总图（本仓库实际链路）

```
Turso words(status='published', language)
   │  字段契约: word/definition/explanation/why_this_word/pronunciation/
   │           categories_json/related_words/grammar_json/concept_id
   ▼
src/lib/games/data.ts  getLexicon(lang) ── 60s TTL 缓存 LexiconBundle
   ▼
src/lib/games/engine.ts（纯函数，禁 import db/i18n/AI）
   │  meaningPayload / realOrFakePayload / categorySortPayload /
   │  semanticPayload / fusion·flower·reverse·chainPayload / availability
   ▼
src/lib/games/service.ts ── payload getters + 每语种语义词库
   ▼
src/app/games/[game]/page.tsx（含 [locale] 镜像，force-dynamic）
   ▼
src/components/games/*.tsx（客户端组件，点击优先）
```

### 7.2 五层门禁 → 本项目命令表

| 层 | 命令（在 ai-neologism/ 下） | 当前读数（2026-11-19） |
|---|---|---|
| L1 引擎 | `npx vitest run tests/lib/games/engine.test.ts` | 39 条（含多语折叠用例） |
| L1' 站点全量 | `npx tsc --noEmit && npx vitest run` | tsc 0 错 / 446 条 |
| L2 契约 | 引擎测试隐式覆盖（GAME_DATA 形状由 service→组件 Props 链路保证）；新增字段时先改 engine 测试 | — |
| L3 点击流 | `node scripts/test.mjs`（games 节） | 162 检查全绿，其中 games 14 条（四语枢纽、404、降级、重定向） |
| L4 AI 边界 | 尚无线上 AI 调用（语义温度为模拟分）；Wordforge 落地时按 7.5 执行 | — |
| L5 视觉/试玩 | 截图审查（browser-use + visual-judge）；AI 试玩员走与 e2e 相同的点击路径 | 上线时人工过一轮，未常态化 |

**门禁执行顺序固定**：`tsc → vitest → eslint → e2e`（CONVENTIONS.md 第四节），一步绿了才走下一步——这就是本项目的 evidence gate。

### 7.3 各游戏阶段矩阵（诚实快照）

| 游戏 | S0 概念 | S1 规格 | S2 引擎 | S3 原型+e2e | S4 AI | S5 调参 |
|---|---|---|---|---|---|---|
| 猜意思 meaning-reveal | ✅ | 追认（9db774a 直接上线） | ✅ meaningPayload | ✅ | — 无AI | 部分（无指标埋点） |
| 真假定义 real-or-fake | ✅ | 追认 | ✅ | ✅ | ⚠️ 诱饵=v0真词定义 | 同上 |
| 分类棋盘 category-sort | ✅ | 追认 | ✅ | ✅ | — | 同上 |
| 语义温度 semantic-ladder | ✅ | 追认 | ✅ 模拟分 | ✅ | ⚠️ 待 P1 embedding 替换模拟分 | 同上 |
| 古董馆 ancient-vault（5 子游戏） | ✅ | 追认 | ✅ 多语已通（fe325ce） | ✅ | — | 同上 |
| **Wordforge 词锻所（game-01）** | ✅ | ✅ spec 已存档 | ⬜ | ⬜ | ⬜（见 7.5） | ⬜ |

矩阵读法：六个已上线游戏全部通过 L1+L3（这是它们能上线的门）；两个 ⚠️ 是 S4 的"模拟/借位"实现，升级项已在路线图；Wordforge 是第一个**从头按本管线走**的游戏——它的 S2 必须新建 `src/lib/games/forge-engine.ts`（纯函数：`(board, move) → board`，含 §1.10 校验调用），S3 起新增 e2e 节，S4 按 7.5。

### 7.4 本项目专属纪律（踩坑提炼，游戏域生效）

1. **点击优先**从第一行组件代码开始（无障碍+移动端+e2e 三合一；六游戏全量已执行）
2. **engine.ts 纯度契约**：不 import db/i18n/AI——它能在无数据库的 vitest 里跑是多语门禁的前提（fe325ce 教训）
3. **可见降级**：`availability()` 判定某语言数据不足时灰出卡片/隐藏古董馆段落，**绝不生成空回合**——数据薄不是错，装作有数据是错
4. **文案零硬编码**：games 命名空间四语字典、`Dictionary = typeof en` 编译期奇偶——新增任何玩家可见字符串先过这条
5. **语素数据质量门**：why_this_word 驱动全部语素游戏；§1.10 + compact 重建是门；**后缀停用词表待建**（ing×93 噪音，见 game-01 开放问题）
6. e2e 用裸 fetch 测重定向（cookie jar 污染）；hreflang 断言大小写不敏感；Next 16 `params` 必须 `await`（CONVENTIONS 已录，游戏域同样生效）

### 7.5 Wordforge 的 L4 具体规范（S4 落地时照此执行）

- **AI 调用**：glm-4-flash（bigmodel 免费档，standard key `id.secret`）——只出现在 `src/app/api/craft/route.ts`，forge-engine.ts 与组件**永不** import AI 模块
- **缓存即世界**：`craft_pairs` 表 `UNIQUE(first_text, second_text, language)`，应用层无序对归一（字典序）；同对必同果
- **磁带测试**：`tests/fixtures/craft/` 存录制的真实 LLM 响应，单测回放永不联网；契约测试断言返回形如 `{word, why, emoji}`
- **盲锻纪律**：配方调用只收 `{first, second, language}`，**请求体里禁止出现目标定义**（悬赏模式防作弊的机器保障）
- **降级门**：glm 不可用 → 悬赏令从已发布词静态出题（定义现成），页面顶部如实标注"离线锻造"；拔网线全测试仍须绿
- **回流契约**：合成好词 `INSERT words(input_type='craft', status='in_review')` → /review 审核 → published → 自动进入 getLexicon——**游戏产出第一次反哺词典**，闭环完成

### 7.6 数字表盘的诚实声明

本节数字（39/446/162/14、1553·807·807·807 词量、404 家族）为 2026-11-19 快照。它们是"算法 × 数据"的函数，两个变了就会漂移——**可复现的永远是命令，不是读数**。管线自身（六阶段、五层门、AI 四角色）是不变式；每次大改动后重跑 7.2 命令表刷新本节。

---
*2026-11-16 立；2026-11-19 增补第七节（本项目实例化）。docs/ 根 *.md 在 git 白名单内，提交时随仓库公开。*

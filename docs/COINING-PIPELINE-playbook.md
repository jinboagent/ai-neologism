# 造词流水线工作模板（batch-N 通用）

> 适用范围：每一批新词从"决定做"到"上线可玩"的全部阶段。上游选词见 `SOURCING-playbook.md`，
> 评审标准见 `REVIEW-criteria.md`（§1.10 短语占用规则是最高频杀手）。本文是**操作模板**：每阶段给出
> 输入 / 动作 / 产出 / 已知坑，并给出可直接照抄的命令序列。
>
> 沉淀自 batch-3 / batch-4 / batch-5-01 实战（2026-11-08 ~ 2026-11-14，1100 词生成 → 807 批准 →
> 四语言 3139 行入库上线）。

## 0. 流水线总览

| 阶段 | 产出物 | 主要工具 | 谁做 |
|---|---|---|---|
| A 规格与预检 | GENERATION-SPEC-batch-N.md、exclusions.txt、precheck 脚本 | 手写 + 脚本 | 生成者 |
| B 英文造词 | batch-N-NN-\<theme\>-100.md（每文件 100 词） | 生成会话 + 验证脚本 | 生成者 |
| C novelty 评审 | review-batch-N-NN-claude.md（逐行判决+重评分） | api-sweep + 评审 agent | 评审者 |
| D CHECK 处置 | 表行落定 + addendum + 表头 tally 同步 | WebSearch/WebFetch | 协调者 |
| E 意译 de/fr/es | batch-N-NN-daily-{de,fr,es}.md（survivor-only 或全量预翻） | 翻译会话 | 翻译者 |
| F 语内评审 | review-batch-N-NN-{de,fr,es}-claude.md | 评审 agent | 评审者 |
| G 提取 | review-verdicts.json、survivors-*.json | scripts/batch/parse-reviews.py | 协调者 |
| H 入库 | 本地库 concept 家族（published） | scripts/batch/import-batch4-ml.mjs | 协调者 |
| I 元数据富化 | why_this_word × 4 语言、themes、评分、分类 | enrich-batch4.mjs、migrate-themes.mjs | 协调者 |
| J 同步 Turso | 生产库与本地一致 | sync-to-turso + push-concepts + sync-themes-ratings | 协调者 |
| K 验证/归档/总结 | e2e 绿、线上抽查、notapproved.db、WORDS-SUMMARY | scripts/test.mjs、build-notapproved-db.py | 协调者 |

**黄金顺序**：B→C 可与 E 并行（翻译不必等评审，但入库必须等 C+F）；**入库前提取必须先跑**；
**入 Turso 前本地必须先入库**；**why_this_word 必须在宣布"可玩"之前富化**。

## 1. 阶段 A — 规格与预检

- **规格文件** `GENERATION-SPEC-batch-N.md` 先行：每文件 100 词 = 75 名词 + 20 形容词(#76–95) + 5 动词(#96–100)；
  六分类白名单（Society & Philanthropy / Technology & AI / Environment / Work & Economy / Culture & Language / Health）；
  funny/novelty 自评 1–5（novelty 5 只留给"不见词根猜不出"的古典词根词）。
- **排除表** `batch-N-exclusions.txt`：此前所有词（含 REJECT）+ 跨 batch 主题近义词；生成后 0 命中才算过。
- **预检脚本**（precheck-batch-N.mjs）：成分比例、文件内/跨文件重复、字段完整性、related 自引用、悬挂引用、
  排除表命中、H1 含 `Theme NN: <label> (100`（migrate-themes 靠 H1 识别，格式不能变）。
- 坑：生成高发 typo——`Part of speech` 写成别的词、related 里引用自己、引用从未写出的词、中文泄漏进英文文件。

## 2. 阶段 B — 英文造词

- 命名 `batch-N-NN-<theme>-100.md`；条目模板固定 12 字段（### N. word → Proposed）。
- 造词规则：透明复合词可接受但要在 Explanation 里给出"加法之外的东西"；每词 pronunciation(IPA) 必填；
  Related words 只指向本文件或已入库词；Categories 1–2 个。
- 自评纪律：novelty 宁低勿高——评审会把半透明复合词压 1 档；`-craft/-lock/-lag/-gate` 等能产后缀先查占用。

## 3. 阶段 C — novelty 评审（EN）

- 先跑 `review-api-sweep.mjs`（UD 精确命中 + Wiktionary 存在性 → api-sweep-NN.tsv），再交评审 agent；
  评审 prompt 存 `review-prompt-batch-N-NN.txt`（**零填充命名**，`--files=01,02` 循环才不会漏）。
- 评审产出固定表：`| # | word | verdict | funny | novelty | reason |`；**表头 tally 必须等于逐行计数**
  （parse-reviews.py 会核对；CHECK 落表后表头别忘了同步——batch-4-01 踩过）。
- 证据分级：fetch 验证 > 多源一致 summary > 单源 summary；REJECT 必须给 URL 或明确标注 summary-conf。
- 典型死因（按频率）：①现成短语占用（§1.10）②商标/品牌/活动名 ③UD 同义项 ④词典已有词。
- **运行注意**：claude CLI 在 WebSearch 降级时会挂死（孤儿 claude.exe 要 `taskkill //F //IM claude.exe`）；
  换用并行 agent 会话更稳。

## 4. 阶段 D — CHECK 处置（协调者）

- CHECK = 评审拿不准，必须协调者 web 复核后落表：改表行 → 追加 addendum（写明证据）→ 同步表头 tally。
- 处置规则沿用评审自己的判定条款（"若 ≥2 同义用例 → REJECT，否则 APPROVE"这类要严格执行）。

## 5. 阶段 E — 意译（de/fr/es）

- **核心规则：意译，不直译**——用目标语自己的词根命名同一概念。直译出来的多半撞上目标语已有词。
- 两种模式：survivor-only（评审后翻，省工）或全量预翻（翻译先于评审跑）。推荐 survivor-only。
- 表格式：`| # | English | 译词 | Glosa | funny | novelty |`（# 沿用源文件行号）。
- **why_this_word 必须写**（不是可选项）：Antiquarium 四个词形游戏（fusion/flower/reverse/chain）靠它重建词形，
  只有 gloss 的行游戏点不亮——batch-4 第一版就漏了，后来 enrich-batch4.mjs 补了 2,172 条。
- 已知坑：**英列漂移**（手写双语表必犯）→ 每写完一个表立刻跑 `fix-and-validate-ml.py` 权威回写英列；
  **同形碰撞**（fr/es 独立造出同一个词、古典词根与 EN 同形）→ slug 用 `-2/-3` 后缀，join 一律走 concept_id 不走 slug；
  **假朋友**黑名单：es `callo`(闭嘴)/`gatilla`(扳机)/`portalera`(门房)/`callejano`(流浪)；de `Traumwetter`(好天气，已存在)；
  **评审后按 F 的判决过滤**：de 语内 REVISE/REJECT 的词形不上线（german_held_back 存档待改名）。

## 6. 阶段 F — 语内评审（de/fr/es）

- 格式同 EN 评审，但增加 DROP（英文被毙则该语行直接 DROP）。
- 语内证据源：DWDS/Duden 页面、de.wiktionary API、目标语 web 搜索；既有词碰撞（如 Elterntaxi、Sockenwaisenhaus）
  是主要死因。
- 语内 REVISE = 改名后可补录；REJECT = 换思路。全部存档（见 §11）。

## 7. 阶段 G — 提取（评审 → 结构化数据）

```bash
python scripts/batch/parse-reviews.py        # 17 份评审 → review-verdicts.json + tally 核对
```
- 再由它派生 survivors-*.json（`n|word|pos|funny|novelty|definition`），作为翻译表与入库器的唯一事实来源。
- 核对项：每文件表头 tally = 逐行计数；评审词名 = 源文件词名（0 错配）；funny/novelty 取"箭头后值"（重评分）。

## 8. 阶段 H — 入库（本地）

```bash
node scripts/batch/import-batch4-ml.mjs --dry   # 必先 dry：核对行数与 0 PROBLEMS
node scripts/batch/import-batch4-ml.mjs
```
- 规则：1 个 EN 词 = 1 个 concept + 4 语言行（唯一索引 concept_id×language）；status=`published`、badge=`new`、
  `input_type=batchNml`（可逆键：`UPDATE words SET status='in_review' WHERE input_type='batchNml'`）。
- localized slug（de 走 Duden ä→ae；fr/es 去音符）+ `-2/-3` 后缀解决同形；related_words 存 **slug JSON 数组**，
  只链已发布词；IPA 修正表在脚本里维护；分类白名单校验。
- 语内被毙的形不入库（de 04-09 因此是 718 而非 807）。

## 9. 阶段 I — 元数据富化

```bash
node scripts/enrich-batch4.mjs --target local --commit    # 非 EN 行补 explanation/why/grammar（concept join！）
node scripts/migrate-themes.mjs                           # 主题表 + theme_id（H1 驱动，四语言标签）
```
- **join 一律走 concept_id**——slug 会因 `-2` 后缀和改名而错位。
- funny/novelty 目标 100%：pilot 行继承同概念 EN 评审值；老行人工评；补完 `WHERE ... IS NULL` 应为 0。
- categories_json 深度规范化（六分类白名单）——不要用 `LIKE '%["%'` 找双重编码（会匹配所有行），直接全量
  归一化重写最稳。

## 10. 阶段 J — 同步 Turso（生产）

```bash
node scripts/batch/push-concepts-turso.mjs        # concept 行（insert-only，显式 id）
node local/sync-to-turso.mjs --dry-run && node local/sync-to-turso.mjs   # 词行（insert-only，按 slug）
node scripts/sync-themes-ratings-turso.mjs        # 主题行 + theme_id + 评分回填（UPDATE，按 slug）
```
- 三段各司其职；**线上是权威**——投票/评审/状态永不被覆盖；元数据 UPDATE 只碰 theme_id / funny / novelty /
  categories_json，且按 slug 匹配（两侧 slug 空间一致是前提，跑之前核对一遍）。

## 11. 阶段 K — 验证、归档、总结、发布

```bash
npx tsc --noEmit && npx vitest run                # 单测
(npx next dev &) && node scripts/test.mjs         # e2e（完事 taskkill 掉 dev server）
python scripts/batch/build-notapproved-db.py      # 未批准词归档（293+89 行，全带评审理由）
git add <具体文件> && git commit && git push origin master   # 触发 Vercel 部署
```
- 线上抽查清单：各语言详情页 200、家族四语言互链、跨语言 slug 重定向（307→兄弟词）、游戏有燃料、
  sitemap 收录新 URL。
- 归档库 `data/ai-neologism-notapproved.db`：`not_approved_en`（判决+理由全文）+ `german_held_back`（改名待补录）。
- 总结写 `wordstoreview/WORDS-SUMMARY-<date>.md`：总量、逐文件判决、REJECT 类型图谱、评分/主题/分类分布、遗留。
- commit 纪律：只 add 具体文件（工作区常有并行会话的半成品）；staged diff 密钥扫描；push 会触发部署——
  typecheck 不过不 push。

## 12. 已知坑总表（每条都真实踩过）

| 坑 | 规则 |
|---|---|
| 双语表英列漂移 | 每表写完立刻跑 fix-and-validate-ml.py 权威回写，mismatch=0 才算完 |
| slug join | 一律 concept_id join（-2 后缀 + 改名会让 slug join 错位） |
| `LIKE '%["%'` | 会匹配所有正常 JSON 数组——查双重编码用全量归一化，不用模式匹配 |
| 表头 tally 过期 | CHECK 落表后同步表头；parse-reviews.py 逐文件核对 |
| prompt 文件命名 | 必须零填充（batch-4-03.txt 而非 batch-4-3.txt），否则循环整批失败 |
| claude CLI 挂死 | WebSearch 降级时孤儿进程；taskkill 后换并行 agent |
| dev server 单实例 | Next 16 同目录拒开第二个；e2e 前后注意起停 |
| 意译漏 why_this_word | 游戏无燃料；翻译阶段就要写，漏了用 enrich 脚本补 |
| 目标语假朋友 | 见 §5 黑名单；coined 前查目标语词典 |
| 库连接路径 | 脚本 ROOT 用 `path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")`——层级算错会静默开错库 |
| 跨语言 slug 404 | WordPage 已做 307 重定向（同概念兄弟 → EN 回退）；新增语言记得确认该逻辑仍覆盖 |

## 13. 最短命令序列（下一批照抄）

```
 1. 写 GENERATION-SPEC-batch-N.md + exclusions
 2. 生成 batch-N-01..XX-100.md → precheck → 0 问题
 3. review-api-sweep.mjs → api-sweep-NN.tsv
 4. 评审 agent → review-batch-N-NN-claude.md（CHECK 由协调者落表）
 5. python scripts/batch/parse-reviews.py → review-verdicts.json（tally 全 OK）
 6. 翻译 de/fr/es（survivor-only）→ fix-and-validate-ml.py 全绿
 7. 语内评审（至少 DE）→ 语内 REVISE 不入库
 8. import-batch4-ml.mjs --dry → APPLY
 9. enrich（why_this_word）+ migrate-themes + 评分/分类补全
10. push-concepts-turso → sync-to-turso → sync-themes-ratings-turso
11. tsc + vitest + e2e 全绿 → 线上抽查 → build-notapproved-db.py → WORDS-SUMMARY
12. git add 具体文件 → commit → push → 部署后线上复查
```

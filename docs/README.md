# docs/ 索引 — 读这里就知道该打开哪个文件

> 本目录是**项目工作文档**，已纳入 git 跟踪（2026-11-14 起随仓库发布）——唯 `incidents/` 除外：
> 安全/bug 报告写明攻击面，公开仓库不公示，留在本地。
> 每个文件一行说明 + 什么时候读。新文档进来请按下面分类归位，并在此登记。
> 注意：`docs/REVIEW-criteria.md`、`docs/SOURCING-playbook.md`、`docs/VALIDATION-protocol.md`
> 的路径被代码/数据库 verification_json 里的文字引用着，**别改这三个文件名、别移位置**。

## 一、常驻规则与流程（活文档，经常读，放根目录）

| 文件 | 是什么 | 什么时候读 |
|---|---|---|
| `COINING-PIPELINE-playbook.md` | 造词→评审→翻译→提取→入库→同步→归档的**全流程操作模板**（11 阶段 + 12 坑表 + 命令序列） | 每开一个新 batch（batch-6+）先读它，照 §13 命令序列走 |
| `REVIEW-criteria.md` | **评审标准正典**：novelty 判决门槛、§1.10 短语占用规则、商标 Gate、评分校准 | 任何评审（EN 或语内）之前；判决拿不准时回查 |
| `REVIEW-novelty-search-rules.md` | novelty 搜索细则：源语言词根、复合/混成词的拆解检查（2026-11-04 起，取代 VALIDATION-protocol §3 的单语言规则） | 评审中遇到外来词根或 blend/compose 词形时 |
| `SOURCING-playbook.md` | 上游：可造词概念从哪来（slang 监视 / 学术社会学分层 + AI 造词 prompt 模板 + 每周例行） | 选下一批主题、找概念来源时 |
| `VALIDATION-protocol.md` | 验证协议正典：一个词如何"赚得"入库资格（全通道） | 对验证流程有疑问时；历史上 batch-2/3 的证据都引用它 |

## 二、reports/ — 批次与导出报告（一次性存档，按需查）

| 文件 | 是什么 |
|---|---|
| `reports/batch-report-pilot-25-2026-10-31.md` | pilot-25（25 词首轮多语言试点）的批次报告 |
| `reports/batch-report-batch-2-3-approved-2026-11-08.md` | batch-2 + batch-3 批准词的批次报告（入库于 2026-11-08） |
| `reports/export-report-batch-2-3-2026-11-08.md` | batch-2/3 导出核对报告（scripts/batch/export-approved-words.mjs 的产物） |

## 三、incidents/ — 事故与安全记录（一次性存档，按需查）

| 文件 | 是什么 |
|---|---|
| `incidents/BUG-REPORT-2026-11-01.md` | 全代码审查 + dev server HTTP 实测的 bug 报告（2026-11-01） |
| `incidents/SECURITY-REPORT-2026-11-08.md` | 第一轮安全报告（发现项清单） |
| `incidents/SECURITY-FIXES-2026-11-08.md` | 对应的修复记录 |
| `incidents/BUG-SECURITY-REPORT-2026-11-14.md` | 第二轮安全报告（N1–N10，修复提交 a93cde7 / 34e2ab8） |

## 四、specs/ — 需求与规格（历史）

| 文件 | 是什么 |
|---|---|
| `specs/REQUIREMENTS-03-novelty-gate-and-anti-abuse.md` | 需求 03：novelty 门、反滥用、凭据管理（2026-09-28，已实现的 v1 需求 + 缺口） |

## 五、相关但不在本目录

- `CONVENTIONS.md`（仓库根，**已跟踪**）：zh-CN 工作规约——新功能/页面必须遵守。
- `wordstoreview/`（gitignored）：全部批次源文件、评审文件、翻译表、exclusions、precheck、
  `review-verdicts.json` / `survivors-*.json`、`WORDS-SUMMARY-*.md`。造词流水线的"车间"在这里。
- `data/ai-neologism-notapproved.db`（gitignored）：未批准词归档库（293 EN + 89 德语暂缓）。
- `GENERATION-SPEC-batch-*.md`（在 wordstoreview/）：每批的生成规格。

## 维护规则

1. 新增文档先归类：**活文档**（会被反复读的规则/流程）放根目录；**一次性记录**（报告/事故/需求）进对应子目录。
2. 活文档改名/移动 = 破坏代码与 verification_json 里的路径引用（sources 页面、batch-coin.mjs、export-approved-words.mjs）——三思。
3. 每个新文件必须在本 README 登记一行。
4. docs/ 已跟踪（.gitignore 用 `/docs/**` + 白名单例外实现），**唯 `incidents/` 例外**（安全写-up 留本地，公开仓库不公示攻击面）；新增根级子目录时要往 .gitignore 的例外清单里补对应两行。

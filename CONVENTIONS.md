# 工作规则（Conventions）

本项目的开发工作规则。任何新功能、新页面、新端点都必须遵守。
设计决策的完整记录见 [features/](./features/README.md)（每功能一份六段式文档）；
本文件只管"怎么做"，是长期有效的纪律，不是某次改动的记录。

背景约束：网站是四语的（DE/EN/ES/FR），站长的原始需求是
**"以后网站加其他功能都要考虑多语言"** ——所以下面第一条规范对每个新功能都适用。

## 一、多语言开发规范（新功能必守）

1. **内容永远带语言维度。**
   设计新表/新字段时先问一句"这是不是内容？"
   是内容 → 加 `language` 列；属于某个社会现象 → 挂 `concept_id`（概念家族制，
   见 `src/lib/db.ts` 的 concepts 表与部分唯一索引）。
   纯 UI 状态、会话数据不需要。

2. **文案零硬编码。**
   任何用户可见的字符串一律走字典：`src/lib/i18n/en.ts` 定义 shape（`type Dictionary = typeof en`），
   `de.ts / es.ts / fr.ts` 补译。临时占位文案也要进字典——
   字典奇偶校验（编译期类型 + `tests/lib/i18n.test.ts` 的 key 深比较）会抓住漏网的。

3. **新页面三件套。**
   ① 页面组件写进 `src/components/pages/xxx-page.tsx`，接收 `locale`；
   ② 根路由薄壳：`src/app/xxx/page.tsx` 渲染 `<XxxPage locale="en"/>` 并导出 `generateMetadata`（带 hreflang）；
   ③ 本地化薄壳：`src/app/[locale]/xxx/page.tsx`（`generateStaticParams` 返回 de/es/fr，非法 locale 一律 `notFound()`）。
   同时把新路径登记进三处：`LOCALIZED_PATHS`（`src/middleware.ts`）、
   `LOCALIZED`（`src/app/sitemap.ts`）、以及 `src/lib/i18n/meta.ts` 里的 canonical 路径。

4. **链接一律 `localePath(locale, path)`。**
   永远不手拼 `/de/…`。"英语占根"这个特例只存在于 `src/lib/i18n/core.ts` 一处
   （`localePath`），其他任何文件都不得自行拼前缀。
   尚未本地化的页面（见下）用裸路径。

5. **读数据的查询必须能按语言过滤。**
   `src/lib/words.ts` 的 helper（countPublished / popularity / alphabetWithCounts /
   listByLetter / searchWords / getWord）都带 `language` 参数（undefined = 全部语言）。
   词条查询带语言守卫：A 语言的 URL 绝不渲染 B 语言的词条（404）。

6. **API 的语言参数。**
   内容型端点接受/返回 `language`，默认 `en`；响应体不得泄漏内部字段
   （`PublicWord` 的裁剪规则见 `src/lib/words.ts` 的 toPublic）。

### 尚未本地化、保持英文的页面

`/contribute`（表单与 API 文档）、`/search`、`/seeds`、`/sources`、`/review`、`/admin`，
以及 Coin-AI 向导与 word-form 的内部文案。
本地化站点（/[locale]）的导航只放公共阅读页；动作/管理工具留在英文根路径。
管线多语言化（阶段 3）落地后此清单要随之收缩。

## 二、i18n 实现技巧（已验证）

1. **字典奇偶双保险**：类型层 `type Dictionary = typeof en`（缺 key 编译挂）+
   运行时 keysOf 深比较测试（防侥幸）。
2. **长文翻译保链接流**：字典串内嵌 `[[label|href]]` 令牌，`splitLinks()`
   渲染成 `<Link>`——译文语序自由，链接不散架；带粗体导语的列表用 `{lead, text}` 结构。
3. **复数交给各语言**：字典值可以是 `(n) => string`
   （EN word/words、DE Wort/Wörter、ES palabra/palabras、FR mot/mots）。
4. **客户端外壳从 `usePathname` 推 locale**：根布局完全不动，admin/review 照常继承；
   `<html lang>` 由 `HtmlLangSync` 客户端纠正——SEO 权重放在服务端渲染的 hreflang 上。
5. **title 去重**：[locale] 首页用 `title: { absolute: … }`，
   否则布局模板会把品牌名拼成两遍。
6. **middleware 白名单重定向**：只重定向"该语言真实存在的页面"；
   `locale-pref` cookie 优先（手动选择不被强制跳转）；HEAD 放行；
   Googlebot 不发 Accept-Language，天然永远看到英文原版。
7. **家族唯一性用 partial unique index**：
   `(concept_id, language) WHERE status IN ('published','in_review')`——
   rejected 不占位；无 concept 的行因 NULL 天然不冲突。
8. **幂等自迁移双通道**：`ensureSchema` 启动自迁移（PRAGMA 守卫 ALTER + 批量回填），
   外加显式脚本 `scripts/migrate-multilingual.mjs --target local|turso` 带验证报告。
   两者必须保持同一步骤。

## 三、已知坑（都已被测试/检查兜住，新会话别再踩）

- Next.js 把 hreflang 渲染成**驼峰 `hrefLang=`**——HTML 属性本不区分大小写
  （页面是正确的），但字符串断言会挂：用 `/hreflang="x-default"/i` 匹配。
- `t[item.labelKey]` 的联合类型会把字典里的函数值也算进来 →
  用字面量联合（如 `NavLabelKey`）收窄键位类型。
- 相同 `published_at` 导致排序平手 → 列表断言先 `.sort()` 再比较。
- App Router 的 `params` / `searchParams` 是 Promise，必须 `await`（Next 16）。
- e2e 测重定向要用裸 `fetch`（`req()` harness 会把 Set-Cookie 收进 jar，
  污染后续用例的 cookie 状态）。
- 静态路由段优先于动态段：根路由与 `[locale]` 共存无冲突；
  `/en/…` 前缀不是路由，返回 404 是预期行为。

## 四、通用工程门禁

- **门禁顺序固定**：`tsc → vitest → eslint → e2e`，一步绿了才走下一步；
  eslint 的未使用 import 告警清零是"改完了"的信号灯（既有 17 个告警除外，
  见 tests/api/* 的历史 import）。
- **迁移**：脚本对本地与远端各跑一遍，再重跑一次验证幂等；
  迁移前后对线上 curl 抽查（首页 / 词列表 API / 搜索）确认无感知。
- **文档双轨**：会话里中文审阅，`features/` 英文落盘（date = commit day）；
  每个阶段完成时更新对应 feature 文档的 Acceptance criteria 勾选与 Verification。
- **验证习惯**：改完先在本站抽查四语页面实际渲染（curl 关键字符串），
  再看 dev server 日志有无错误。

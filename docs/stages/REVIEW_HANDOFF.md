# Stage Review Handoff

> 每个 Stage 完成后由主开发 Agent 填写。
> 只记录可验证事实，不写自我评价。

## Identity

- Stage ID：P0-SECURITY-01
- Review cycle：R1
- Agent Constitution version / commit：Governance V1（commit b75c634）
- Exam OS Constitution version / commit：Governance V1（commit b75c634）
- Stage Contract：P0-SECURITY-01「安全边界加固」（见 docs/stages/CURRENT_STAGE.md）
- Stage Contract version / commit：P0-SECURITY-01（随本 Stage 交卷 commit 一并提交）
- Base commit：b75c634
- Review target / HEAD commit：PROVIDED_EXTERNALLY_AFTER_COMMIT
- Branch：master
- Implementation Agent：DeepSeek（Deepseek-v4-pro）
- Handoff time：2026-08-18

## Scope

- 本 Stage 实际完成内容：
  - P0-SECURITY-01：DeepSeek API Key 全部移出浏览器。前端删除 `VITE_DEEPSEEK_API_KEY` 与对 `api.deepseek.com` 的直接 fetch，改为调用 Supabase Edge Function `breakdown`（服务端读取 `DEEPSEEK_API_KEY` secret）。前端 bundle 不再包含任何 DeepSeek 密钥或 endpoint 明文。
  - P0-SECURITY-02：删除匿名全量放行的 `FOR ALL USING (true)` / `WITH CHECK (true)` RLS，改用 Supabase Auth Anonymous Sign-In，以 `auth.uid()` 作为数据归属身份；删除设备 UUID 作为身份来源的 `getUserId`。用户表（user_profile / learning_record / ability_history）改为 owner-only 策略 `user_id = (auth.uid())::text`。
  - 共享内容表（content_library / content_skill）保持客户端可读（`FOR SELECT USING (true)`），但无任何 INSERT/UPDATE/DELETE 策略，客户端不可写。

- 明确不包含内容：
  - 不包含 DeepSeek Key 的自动轮换（轮换动作由 Product Owner 在 DeepSeek 控制台手工执行）。
  - 不包含内容表（content_library / content_skill）的写入口径。
  - 不包含 UI 功能新增、新页面、新学习流程。
  - 不包含 service_role 的使用（本 Stage 只使用 anon key + auth.uid()）。

- 用户可见变化：无（登录流程仍为无感匿名，用户不感知）。
- 修改文件：
  - docs/stages/CURRENT_STAGE.md
  - frontend/.env.example
  - frontend/src/hooks/useSession.ts
  - frontend/src/index.css
  - frontend/src/lib/db.ts
  - frontend/src/lib/deepseek.ts
  - frontend/src/lib/supabase.ts
  - frontend/src/main.tsx
- 新增文件：
  - supabase/functions/breakdown/index.ts
  - supabase/migrations/002_security_hardening.sql
- 删除文件：无（未删除任何既有文件；设备 UUID 逻辑为行级替换，非文件删除）

## Data and Interfaces

- 数据库 / migration：supabase/migrations/002_security_hardening.sql（DROP 旧 permissive policy → CREATE owner-only policy）
- API / Edge Function：supabase/functions/breakdown（POST，入参 `{sentence, context}`，出参 `{ok:true, breakdown:{main_clause, relation, natural_meaning}}` 或 `{ok:false, error:{code, recoverable}}`）
- 状态机：无变化
- 数据结构：无 schema 变更（沿用既有 5 张表，`user_id TEXT`，无 FK 到 auth.users）
- RLS / 权限：
  - user_profile：SELECT/INSERT/UPDATE owner-only
  - learning_record：SELECT/INSERT owner-only
  - ability_history：SELECT/INSERT owner-only
  - content_library / content_skill：SELECT public，无写策略
- 隐私：`auth.uid()` 取代设备 UUID；前端不再持久化任何可跨设备伪造的身份。
- Secret / Key：DEEPSEEK_API_KEY 仅存于 Supabase Edge Function Secrets；前端与 bundle 无密钥。
- 不可逆数据操作：迁移 002 的 DROP POLICY 为可重建操作（同文件内 CREATE POLICY 即重建）；未删除任何数据行。
- 是否影响已有用户数据：不删除、不改写已有数据行。旧设备-UUID 数据行会成为无主数据（其 `user_id` 不等于任何 `auth.uid()`），新策略下这些行对客户端不可见也不可写，但保留在库中，不自动清理（见 Known State → LEGACY_UNOWNED_DATA）。

## Runtime

- 本地运行方式：`cd frontend && npm install && npm run dev`（依赖 `.env` 中 VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY）
- 测试环境：Supabase 生产项目 `cwranuctsflunisapepx`（本地 dev + 线上 Edge Function 混合验证）
- 测试身份：两个真实匿名用户 USER_A / USER_B（各自独立 `auth.uid()`）
- 所需环境变量名称：
  - 前端：VITE_SUPABASE_URL、VITE_SUPABASE_ANON_KEY
  - Edge Function：DEEPSEEK_API_KEY（服务端 secret）
- 测试设备 / 浏览器：本地 Node 测试脚本（supabase-js v2）+ 浏览器 dev server
- 移动端：未专项测试（本 Stage 无移动端差异面）
- 桌面端：dev server 冒烟通过

> 禁止填写真实 API Key、Secret 或密码。

## Verification

### Automated

- typecheck：PASS（`npm run typecheck` / tsc --noEmit，0 error）
- lint：PASS（`npm run lint`，0 error）
- build：PASS（`npm run build` 产出成功；产物中 grep 不到 `deepseek` / `sk-` 密钥）
- tests：N/A（仓库无测试套件；本 Stage 未新增单测）
- migration verification：PASS（迁移 002 已在线上 SQL Editor 执行，Success）
- 其他：bundle 密钥泄漏扫描 PASS（0 命中 `sk-`、`deepseek`、`api.deepseek.com`）

### Manual

- 核心用户流程：匿名 sign-in → 读能力档案 → 写学习记录 → 请求 DeepSeek 长难句拆解 → 返回结果，端到端可用。
- 正确路径：USER_A 读/写自身数据正常；DeepSeek server-side 返回合法拆解结构。
- 错误路径：跨用户读/写/伪造被 RLS 静默拦截（0 行、无 error 抛出）；未认证请求被拦截。
- loading：浏览器启动时 `ensureAnonymousSession` 阻塞渲染直至会话建立。
- error：匿名 sign-in 失败时渲染 `.auth-error` 块 + 重试按钮（无静默降级）。
- fallback：前端拆解仍保留 mock fallback（仅当 Edge Function 调用失败时，不含密钥）。
- duplicate submit：沿用既有逻辑，无本 Stage 变更。
- refresh：`persistSession: true` + `autoRefreshToken: true`，刷新后会话保持。
- 中途退出：无本 Stage 变更。
- 网络异常：Edge Function 不可达时走重试一次 → mock fallback。
- 其他边界：`getAuthUserId()` 在无会话时 throw，调用方不会写入错误归属的数据。

### Evidence

- Runtime screenshot / recording：未留屏录（交互以 Node 脚本断言输出为准）。
- Browser / console：前端 build 无密钥；运行期 console 无 DeepSeek 密钥输出。
- DB / log：Node 测试脚本对每个 RLS 场景输出断言结果（PASS/FAIL）。
- 其他：隔离测试共 30/30 PASS（USER_A→USER_B 方向 21/21，USER_B→USER_A 方向 9/9），其中 DeepSeek server-side 调用返回合法拆解。

## Known State

- 已知问题：
  - LEGACY_UNOWNED_DATA：切换身份模型前，按旧设备 UUID 写入的历史行，其 `user_id` 不再匹配任何 `auth.uid()`。这些行保留在库中，客户端不可见不可写。**决策：KEEP（当前不删除、不迁移、不伪造 ownership），记为 NON_BLOCKING_DEBT，后续单独处理。**
- 未验证项：
  - DeepSeek Key 轮换由 Product Owner 手工执行，本 Agent 无法从 secret 值上独立确认「新旧 Key 是否不同」，仅能确认线上 secret 可用（server-side 调用成功）。
  - 移动端专项测试未做。
- Non-blocking debt：LEGACY_UNOWNED_DATA（KEEP，后续单独处理）。
- 需要 Product Owner 拍板：已拍板 —— LEGACY_UNOWNED_DATA 采用 KEEP。
- 回滚方式：`git revert <HEAD commit>`；或重跑一个「恢复 permissive policy」的迁移（不推荐，会造成安全回退）。

## Review Boundary

- Review range：`b75c634..<HEAD>`
- 允许检查受本 Stage 影响的旧调用链：YES
- 审查期间 HEAD 允许变化：NO

如果 HEAD 发生变化：
当前 Engineering QA 与 Product QA 全部失效，
进入新的 Review cycle。

## Engineering QA

- Reviewer：（待 Codex 双审分配）
- Reviewed commit：（待定）
- Review cycle：（待定）
- Verdict：PENDING / PASS / FAIL
- Blocking：
- Non-blocking：
- Unverified：

## Product / Constitution QA

- Reviewer：（待定）
- Reviewed commit：（待定）
- Review cycle：（待定）
- Verdict：PENDING / PASS / FAIL
- Blocking：
- Non-blocking：
- Unverified：

## Gate

只有：

- Implementation COMPLETE
- Engineering QA PASS
- Product QA PASS
- 两个 Reviewer 审的是同一 HEAD
- 审查以后代码没有实质变化

才能进入：

READY_FOR_OWNER_TEST

Product Owner 真人体验无阻断后：

STAGE_ACCEPTED

## Final Status

- Current status：IMPLEMENTATION_COMPLETE
- Accepted HEAD：
- Product Owner：
- Approval date：
- Notes：本 Agent 不声明 STAGE_ACCEPTED / PRODUCT_PASS / ENGINEERING_PASS；以上三项待 Codex 双审。

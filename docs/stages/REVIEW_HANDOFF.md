# Stage Review Handoff

> 每个 Stage 完成后由主开发 Agent 填写。
> 只记录可验证事实，不写自我评价。

## Identity

- Stage ID：P0-SECURITY-01
- Review cycle：R3（R2 被 Engineering QA FAIL；R3 修复 R2 的 5 个 Blocking，进入 R3 重新完整审）
- Agent Constitution version / commit：Governance V1（commit b75c634）
- Exam OS Constitution version / commit：Governance V1（commit b75c634）
- Stage Contract：P0-SECURITY-01「安全边界加固」（见 docs/stages/CURRENT_STAGE.md）
- Stage Contract version / commit：P0-SECURITY-01（随 Stage 一并提交）
- Base commit：5dde1628545b5ca9ad9728485d9b44cc3c38f583
- Review target / HEAD commit：PROVIDED_EXTERNALLY_AFTER_COMMIT
- Branch：master
- Implementation Agent：DeepSeek（Deepseek-v4-pro）
- Handoff time：2026-08-18

## Scope

- 本 Stage 实际完成内容：
  - P0-SECURITY-01：DeepSeek API Key 全部移出浏览器。前端删除 `VITE_DEEPSEEK_API_KEY` 与对 `api.deepseek.com` 的直接 fetch，改为调用 Supabase Edge Function `breakdown`（服务端读取 `DEEPSEEK_API_KEY` secret）。
  - P0-SECURITY-02：删除匿名全量放行 RLS，改用 Supabase Auth Anonymous Sign-In，以 `auth.uid()` 为数据归属身份；删除设备 UUID 身份来源。
  - R2 修复（针对 R1 双审的 5 Blocking + 2 Non-blocking）：
    1. breakdown 开启 JWT 验证（删除 `--no-verify-jwt`），函数内读取 Session JWT `sub`（auth.uid()），无 `sub` 的仅-anon-key 请求返回 401 UNAUTHENTICATED。
    2. ability_history INSERT 强制被引用 learning_record 归属同一 auth.uid()（migration 003）。
    3. 启动时服务端校验 Session（getUser），坏 Session 重新匿名认证；profile 关键写入失败不再静默进入学习。
    4. 删除 DeepSeek 失败后的 mock fallback，改为显式报错 + 重试。
    5. 启动立即渲染「正在准备学习环境」，Auth 12s 超时进入友好重试页（不再白屏）。
    6. breakdown 加输入上限（500/2000 字）、上游 15s 超时、按用户+句子 60s 去重缓存；前端 2 次有界重试 + 20s 超时。
    7. 补 `npm run typecheck`（tsc -b）脚本，使 typecheck 可复现。
  - R3 修复（针对 R2 Engineering QA 的 5 Blocking：ENG-R2-001..005）：
    1. ENG-R2-001 Auth 初始化 single-flight + 代际所有权：并发 ensure 共享一次尝试；超时/重试后的旧尝试被丢弃，late resolution 不得覆盖新身份（`lib/authInit.ts` 可测核心 + `resetAnonymousSessionInit()`）。
    2. ENG-R2-002 区分「网络瞬时失败」与「token 无效」：仅 AuthSessionMissingError / 401/403 判 invalid 才 signOut + 重认证；AuthRetryableFetchError / 5xx / 未知一律判 transient，保持原 UID 并抛可重试错误，绝不 signOut。
    3. ENG-R2-003 Onboarding `onComplete` 拒绝补 try/catch/finally；`startLearning` 内部 catch，保证按钮永不永久禁用。
    4. ENG-R2-004 关键写入真实阻塞：LearningShell 改为 await 写入结果，失败阻断推进/不增进度、显示非技术错误 + 重试；`insertLearningRecord`/`processAbilityEvidence` 用确定性 PK + 23505 实现幂等，重试不产生重复行。
    5. ENG-R2-005 breakdown 生命周期加固：服务端 in-flight single-flight + 全生命周期超时（fetch→body→parse→validate）+ `X-Cache` 观测头；客户端 raw fetch + AbortController（超时/卸载 abort）+ 仅可恢复错误的有界重试。幂等边界：IMPLEMENTED=instance-local in-flight single-flight；NOT_CLAIMED=cross-isolate/global exactly-once dedup；CONFLICT_FOUND=跨 isolate 去重需当前授权架构/范围之外的共享基础设施，故不新增 Redis/KV/新核心表/新基础设施。

- 明确不包含内容：
  - 不包含 DeepSeek Key 自动轮换（轮换由 Product Owner 在 DeepSeek 控制台手工执行）。
  - 不包含内容表写入口径、UI 新功能、新页面、新学习流程。
  - 不包含 service_role 使用（本 Stage 只使用 anon key + auth.uid()）。
  - 不包含匿名注册防滥用 CAPTCHA/Turnstile（记为 Non-blocking，后续单独处理）。

- 用户可见变化：无登录感（仍为无感匿名）；失败时新增明确的重试/不可用提示（不再伪装成功）。
- 修改文件：
  - docs/stages/CURRENT_STAGE.md
  - docs/stages/REVIEW_HANDOFF.md
  - frontend/.env.example
  - frontend/package.json
  - frontend/src/App.tsx
  - frontend/src/hooks/useSession.ts
  - frontend/src/index.css
  - frontend/src/lib/db.ts
  - frontend/src/lib/deepseek.ts
  - frontend/src/lib/supabase.ts
  - frontend/src/main.tsx
  - frontend/src/components/cards/ReadingBreakdownCard.tsx
  - frontend/src/components/onboarding/OnboardingFlow.tsx
  - frontend/src/components/LearningShell.tsx
- 新增文件：
  - supabase/functions/breakdown/index.ts
  - supabase/migrations/002_security_hardening.sql
  - supabase/migrations/003_ability_history_reference_check.sql
  - frontend/src/lib/authInit.ts
- 删除文件：无

## Data and Interfaces

- 数据库 / migration：
  - 002_security_hardening.sql：DROP 旧 permissive policy → CREATE owner-only policy。
  - 003_ability_history_reference_check.sql：ability_history INSERT 增加被引用 learning_record 的同用户归属校验。
- API / Edge Function：supabase/functions/breakdown（POST，JWT 验证开启；入参 `{sentence, context}`，出参 `{ok:true, breakdown}` 或 `{ok:false, error:{code, recoverable}}`；错误码含 UNAUTHENTICATED / MISSING_SECRET / INVALID_PAYLOAD / DEEPSEEK_TIMEOUT / DEEPSEEK_UPSTREAM_ERROR / EMPTY_RESPONSE / NON_JSON_RESPONSE / INTERNAL）
- 状态机：无 schema/状态机变更（沿用既有 5 表，`user_id TEXT`，无 FK 到 auth.users）
- RLS / 权限：
  - user_profile：SELECT/INSERT/UPDATE owner-only
  - learning_record：SELECT/INSERT owner-only
  - ability_history：SELECT owner-only；INSERT owner-only 且被引用 learning_record 同用户
  - content_library / content_skill：SELECT public，无写策略
- 隐私：`auth.uid()` 取代设备 UUID；前端不再持久化可跨设备伪造身份。
- Secret / Key：DEEPSEEK_API_KEY 仅存于 Supabase Edge Function Secrets；前端与 bundle 无密钥。
- 不可逆数据操作：migration 的 DROP POLICY 为可重建操作；未删除数据行。
- 是否影响已有用户数据：不删除、不改写既有数据行。旧设备-UUID 行成为无主数据（见 Known State → LEGACY_UNOWNED_DATA，决策 KEEP）。

## Runtime

- 本地运行方式：`cd frontend && npm install && npm run dev`（依赖 `.env` 的 VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY）
- 测试环境：Supabase 生产项目 `cwranuctsflunisapepx`（本地 dev + 线上 Edge Function 混合验证）
- 测试身份：两个真实匿名用户 USER_A / USER_B（各自独立 `auth.uid()`）+ 未认证客户端
- 所需环境变量名称：
  - 前端：VITE_SUPABASE_URL、VITE_SUPABASE_ANON_KEY
  - Edge Function：DEEPSEEK_API_KEY（服务端 secret）
- 测试设备 / 浏览器：Node 测试脚本（supabase-js v2）+ 浏览器 dev server
- 移动端：未专项测试
- 桌面端：dev server 冒烟通过

> 禁止填写真实 API Key、Secret 或密码。

## Verification

### Automated

- typecheck：PASS（`npm run typecheck` = `tsc -b`，0 error）
- lint：PASS（`npm run lint`，0 error；1 个 dev-only fast-refresh 警告，非阻塞）
- build：PASS（`npm run build`；产物 grep 不到 `deepseek` / `sk-` 密钥）
- tests：R3 auth 逻辑断言脚本 `_r3_authlogic.test.mjs` 19/19 PASS（single-flight、StrictMode 双挂载、代际所有权 late-resolution、transient-vs-invalid、classifySession 单测）
- migration verification：PASS（002、003 均已在线上 SQL Editor 执行，Success）
- 其他：bundle 密钥泄漏扫描 PASS（0 命中）；R3 线上断言脚本 `_r3_live.test.mjs` 14/14 PASS（RLS 双用户隔离、ability_history 跨用户引用 BLOCKED、内容只读、未认证拦截、db 幂等 23505 + 恰好 1 行、JWT 未认证 401 / 认证 200、无 mock fallback、超限 400）

### Manual

- 核心用户流程：匿名 sign-in → 读能力档案 → 写学习记录 → 请求 DeepSeek 拆解 → 返回结果，端到端可用。
- 正确路径：USER_A 读写自身数据正常；DeepSeek 认证调用返回合法拆解。
- 错误路径：跨用户读/写/伪造被 RLS 拦截；未认证（仅 anon key）调用 breakdown 返回 401；未认证读用户数据被拦截。
- loading：启动立即显示「正在准备学习环境」，不白屏。
- error：Auth 失败/超时进入明确 retry；profile 写入失败在 onboarding 显示「保存失败」并不进入学习；DeepSeek 失败显示「AI 暂时不可用」。
- fallback：无 mock 冒充（已删除）。
- duplicate submit：DeepSeek 调用有 60s 去重缓存 + 前端 2 次有界重试。
- refresh：persistSession + autoRefreshToken，刷新后会话保持。
- 中途退出 / 网络异常：网络异常时 Auth 与 DeepSeek 均进入明确错误态。

### Evidence

- Runtime screenshot / recording：未留屏录（以 Node 脚本断言输出为准）。
- Browser / console：前端 build 无密钥；运行期 console 无 DeepSeek 密钥。
- DB / log：Node 断言脚本输出逐项 PASS/FAIL。
- 其他：R2 线上验证 20/20 PASS（含未认证 breakdown 401、认证 breakdown 200、双向 RLS 隔离、ability_history 跨用户引用 BLOCKED、内容只读、未认证读用户数据 BLOCKED）。R3 线上验证 14/14 PASS（见 Automated）。

## Known State

- 已知问题：
  - LEGACY_UNOWNED_DATA：切换身份模型前的旧设备-UUID 历史行，`user_id` 不再匹配任何 `auth.uid()`。决策 KEEP（不删除/不迁移/不伪造 ownership），记为 Non-blocking debt，后续单独处理。
- 未验证项：
  - DeepSeek Key 轮换的「新旧 Key 是否不同」无法从 secret 值独立确认，仅确认线上 secret 可用。
  - 移动端专项测试未做。
  - 匿名注册防滥用 CAPTCHA/Turnstile 未启用（Non-blocking）。
  - breakdown 并发 single-flight（`X-Cache` 观测头）与全生命周期超时的线上验证需「重新部署 breakdown 函数」后方可执行（本 Agent 无 supabase CLI，无法自行部署；见 Final Status → Notes）。
  - Onboarding / LearningShell 失败状态转换的浏览器级 UI 断言（无浏览器 harness），逻辑以源码 + 可测核心断言为准。
- Non-blocking debt：LEGACY_UNOWNED_DATA（KEEP）；匿名防滥用措施（后续单独处理）。
- 需要 Product Owner 拍板：已拍板 —— LEGACY_UNOWNED_DATA 采用 KEEP。
- 回滚方式：`git revert <HEAD commit>`。

## Review Boundary

- Review range：`5dde1628545b5ca9ad9728485d9b44cc3c38f583..<HEAD>`
- 允许检查受本 Stage 影响的旧调用链：YES
- 审查期间 HEAD 允许变化：NO

如果 HEAD 发生变化：
当前 Engineering QA 与 Product QA 全部失效，
进入新的 Review cycle。

## Engineering QA

- Reviewer：（待 Codex 双审分配）
- Reviewed commit：（待定）
- Review cycle：R1 已 FAIL（4 Blocking + 2 Non-blocking）；R2 已 FAIL（5 Blocking：ENG-R2-001..005）；R3 待审
- Verdict：PENDING / PASS / FAIL
- Blocking：
- Non-blocking：
- Unverified：

## Product / Constitution QA

- Reviewer：（待定）
- Reviewed commit：（待定）
- Review cycle：R1 已 FAIL（1 Blocking）；R3 待审
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

- Current status：IMPLEMENTATION_COMPLETE（R3，待 commit / push / freeze HEAD）
- Accepted HEAD：
- Product Owner：
- Approval date：
- Notes：本 Agent 不声明 STAGE_ACCEPTED / PRODUCT_PASS / ENGINEERING_PASS；以上三项待 Codex R3 双审。breakdown 并发 single-flight 与全生命周期超时已实现，但线上验证需 Product Owner 在 Supabase Dashboard 重新部署 `breakdown` 函数后方可执行（本 Agent 无 supabase CLI）。

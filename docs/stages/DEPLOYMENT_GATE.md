# Deployment Gate — 安全模型上线交接（Handoff，非部署）

> 本文件是**上线交接说明**，供 Product Owner 在 Supabase 项目执行迁移、跑 DB 测试、做切换时使用。
> 本 Agent 无 supabase CLI / psql，不执行部署；以下为可验证事实与执行顺序，不含自我评价。

---

## 0. Frozen Reality（部署事实，R8 修正）

| 项 | 状态 |
| --- | --- |
| `004_atomic_learning_evidence.sql` | **NOT_DEPLOYED** |
| `005_security_model_hardening.sql` | **NOT_DEPLOYED** |

- **DEPLOY_ORDER = `004_THEN_005`**。不能反过来，不能只跑 005。
- 005 依赖 004：005 用 `CREATE OR REPLACE FUNCTION` 替换 004 建立的 `apply_learning_evidence`，列级权限依赖 001 的表结构；`004_THEN_005` 是硬依赖，不是可选项。

---

## 1. 变更清单（004 + 005 合起来做了什么）

- **004**（R6）：建立 `apply_learning_evidence` 原子 RPC（learning_record + ability_history + user_profile 单事务写入）；`ability_history` 加 `UNIQUE(learning_record_id, ability_key)`；`learning_record` 加 `skip_evidence` / `difficulty` 列；删除 learning_record / ability_history 的直写 INSERT policy。
- **005**（R7）：RPC 加固为 `SET search_path = ''` + 全 `public.*`/`auth.*` 限定 + 归属绑定重复查找；`EXECUTE` 仅授 `authenticated`（撤销 anon）；`user_profile` 对 `authenticated` 撤销表级 `INSERT, UPDATE`，改授列级：
  - `INSERT (user_id, exam_type, exam_batch, daily_time, updated_at)`
  - `UPDATE (exam_type, exam_batch, daily_time, updated_at)`

---

## 2. PHASE A — MIGRATION（执行 004 → 005）

这些 migration 是**纯 DDL**（无 psql meta-command），可用两种方式执行，**二选一**：

1. **Supabase CLI**（推荐，顺序由 migration 文件名保证）：
   ```bash
   supabase db push
   ```
2. **SQL Editor**（无 CLI 时）：
   - 先粘贴执行 `supabase/migrations/004_atomic_learning_evidence.sql`
   - 再粘贴执行 `supabase/migrations/005_security_model_hardening.sql`
   - 两条都成功，才进入 PHASE B。

> 005 全部语句幂等可重跑（`CREATE OR REPLACE` + `REVOKE`/`GRANT` 无副作用）。若中断可整段重跑。

---

## 3. PHASE B — DATABASE TESTS（psql，非 SQL Editor）

以下两个文件包含 psql meta-commands（`\set`、`\echo`），**必须用 psql-compatible runner 执行，不能复制到 SQL Editor**：

```bash
psql "$DATABASE_URL" -f supabase/tests/004_collision_matrix.sql
psql "$DATABASE_URL" -f supabase/tests/005_profile_integrity.sql
```

- 两者均已内嵌 `\set ON_ERROR_STOP on`：任一 assertion 失败 → 脚本停止 + 非零退出；`ALL PASS` 只在最后出现，不会假绿。
- 期望输出：`R6 collision matrix: ALL PASS` 与 `R7 profile integrity: ALL PASS`。

---

## 4. PHASE C — Coordinated Cutover（R8 修正）

正式执行 migration 之前，**matching frontend 必须先 build/test READY**，而不是 migration 后才开始构建。

| Step | 动作 |
| --- | --- |
| STEP 0 | 确认 exact approved HEAD（冻结，不中途改码） |
| STEP 1 | build + test matching frontend（`npm run build` + vitest/typecheck/lint） |
| STEP 2 | 准备 deployment window（确定可回滚窗口与负责人） |
| STEP 3 | 执行 migration **004** |
| STEP 4 | 执行 migration **005** |
| STEP 5 | 立即发布 matching frontend（或在同一 controlled cutover 内切换），**不留「新 DB 权限模型 + 旧 frontend 长时间服务」的窗口** |
| STEP 6 | 执行 RPC smoke test（见 §5） |
| STEP 7 | 执行 004 DB suite（psql） |
| STEP 8 | 执行 005 DB suite（psql） |
| STEP 9 | browser persistence smoke test（真实浏览器走一遍 onboarding → 学习写入 → 重试） |
| STEP 10 | monitor persistence errors（见 §6，至少观察一个稳定周期） |

---

## 5. RPC Smoke Test（具体，非模糊「测一下 RPC」）

以 authenticated 测试用户（真实 Anonymous Auth，非 service_role）完成：

1. `ensureAnonymousSession()` 成功，拿到 `auth.uid()`。
2. profile create 成功（首次 INSERT `user_id` + editable columns）。
3. `apply_learning_evidence(op, session, card, 'choice', true, '{"selectedOptionId":"a"}', false, 0.4)` 返回 `{status:'APPLIED_NEW', evidence_applied:true}`。
4. `learning_record` 恰好 1 行（按 operation id 计数 = 1）。
5. `ability_history` 与预期 evidence 路径一致（choice → sentence + reading 各 1 行）。
6. `user_profile` 的 `ability_sentence` / `ability_reading` 各变化恰好一次（非 0）。
7. 以**同一 operation id + 同一 payload** 重试 → 返回 `IDEMPOTENT_ALREADY_APPLIED`。
8. 重试后 `learning_record` / `ability_history` 行数不变、`user_profile` aggregate 不二次变化。

（004/005 DB suite 已覆盖上述 idempotency / atomicity 断言；此 smoke 是「真实客户端调用路径」的最小复核。）

---

## 6. Persistence Error Monitoring（cutover 后最低监控）

不要求新接监控 SaaS；用现有 Supabase Logs / browser console / 现有 deployment logs 观察以下信号：

- `AUTH_REQUIRED`（auth.uid() 为空 → 客户端未认证就写）
- `PROFILE_NOT_FOUND`（profile 缺失 → 建档路径或迁移顺序问题）
- `LEARNING_OPERATION_ID_COLLISION`（同 id 不同 payload → 客户端 id 生成异常）
- `ATOMIC_STATE_CONFLICT`（新 learning_record 已有 history 行 → 原子性异常）
- `permission denied` / SQLSTATE `42501`（列级/函数权限拒绝 → 客户端请求越权）
- RPC timeout（`SAVE_TIMEOUT_MS` 15s abort → 网络/DB 慢）
- save failure rate（学习写入失败率异常上升）
- unexpected PostgREST errors（非预期 4xx/5xx）

---

## 7. Rollback — Emergency Coordinated Rollback（R8 重定义）

**旧 multi-step persistence 已被淘汰，不是任何 rollback 的最终态。** rollback 绝不把「learning_record direct INSERT / ability_history direct INSERT / 整表 user_profile write / anon EXECUTE / unsafe search_path」当作正常最终状态恢复。

按 failure point 分情况：

| Case | 情形 | 处置 |
| --- | --- | --- |
| A | 004 尚未 commit | 无需 DB rollback；停止即可 |
| B | 004 成功、005 失败 | 停止 release；处理 005 失败；**不发布不匹配 frontend** |
| C | 004+005 成功、frontend release 失败 | 不切回 pre-RPC 旧 frontend；回到「最近一个与当前 DB schema/permissions 兼容的 RPC frontend」，或执行经批准的 coordinated DB downgrade |
| D | 必须 DB downgrade | **DB + frontend 作为一组操作**，不能只恢复几条 GRANT 就叫完整 rollback |

**若必须恢复安全性较低的旧状态**，必须明确标注：

```
SECURITY REGRESSION
仅允许短时 emergency 使用
需要立即关闭 / 修复
```

示例（**EMERGENCY ONLY**，且仅当必须回滚 005 的列级权限时才用，不包含 anon EXECUTE / unsafe search_path / PUBLIC EXECUTE 恢复）：

```sql
-- EMERGENCY ONLY — 恢复 authenticated 表级 INSERT/UPDATE（撤销列级授权）
GRANT INSERT, UPDATE ON public.user_profile TO authenticated;
```

> 上述片段会放宽 R7-B 的列级隔离，属于 SECURITY REGRESSION；只能短时应急，随后必须立即恢复 005 并修复根因。绝不恢复 `anon EXECUTE`、`PUBLIC EXECUTE`、`search_path = public, pg_temp`、learning_record/ability_history 直写。

---

## 8. Scenario 14 证据标签（R8 统一）

004 的 Scenario 14 证明的是：

> 第一次 operation 已 commit + 客户端后来以 same operation retry

这是 **`LOST_RESPONSE_EQUIVALENT_RETRY`**（等价语义），**不是**「REAL LOST RESPONSE / REAL NETWORK RESPONSE LOSS」。

此名称在 004 测试注释、测试输出、以及本文档中保持一致。

---

## 9. DB 测试环境限制（R8）

两份 DB 测试文件顶部与本文档一致要求：

```
DO NOT RUN ON PRODUCTION
RUN ONLY ON: DISPOSABLE TEST DATABASE or DEDICATED STAGING DATABASE
```

若当前只有生产 Supabase 项目：先建立安全 staging/test 环境，不能为了验收直接在生产跑 synthetic destructive integration suite。

---

## 10. 旧客户端切换影响（cutover）

| 客户端行为 | 切换后 | 处置 |
| --- | --- | --- |
| 直写 `user_profile.ability_*` / `confidence_*` | **42501 拒绝** | 预期内；前端已走 RPC |
| 直写 `user_profile.user_id`（UPDATE） | **42501 拒绝** | 预期内；身份只能 INSERT 一次性写入 |
| 仅 anon key（无 JWT）调 RPC | **42501 拒绝** | 预期内；须 Anonymous Auth |
| 走 RPC 学习写入 + `persistUserProfile` 建档/更新 | 正常 | 前端 `db.ts` 已改为 CREATE/UPDATE 分离 |

# Deployment Gate — 安全模型上线交接（Handoff，非部署）

> 本文件是**上线交接说明**，供 Product Owner 在 Supabase 项目执行迁移、跑 DB 测试、做切换时使用。
> 本 Agent 无 supabase CLI / psql，不执行部署；以下为可验证事实与执行顺序，不含自我评价。

---

## 0. Frozen Reality（部署事实）

| 项 | 状态 |
| --- | --- |
| `004_atomic_learning_evidence.sql` | **NOT_DEPLOYED** |
| `005_security_model_hardening.sql` | **NOT_DEPLOYED** |

- **DEPLOY_ORDER = `004_THEN_005`**。不能反过来，不能只跑 005。
- 005 依赖 004：005 用 `CREATE OR REPLACE FUNCTION` 替换 004 建立的 `apply_learning_evidence`，列级权限依赖 001 的表结构；`004_THEN_005` 是硬依赖，不是可选项。

---

## 1. 三个环境（Three Environments — R9 硬约束）

安全模型只允许在**恰好三个环境**中推进，每个环境有各自允许的操作与证据级别：

| 环境 | 允许执行 | 禁止执行 | 产出证据 |
| --- | --- | --- | --- |
| **LOCAL PRECHECK**（本机，本 Agent） | frontend build/test/typecheck/lint；SQL 静态审阅（源码 + ACL 形状） | 无 psql 时伪造 DB 执行 | `LOCAL_VERIFIED`（frontend）、`STATIC_VERIFIED`（SQL/ACL 静态） |
| **DEDICATED STAGING**（一次性/专用 Supabase 项目） | migration `004→005`；004 **破坏性** DB suite；005 静态 ACL suite；**REAL CALLER RUNTIME**（真实 Supabase Auth/JWT + PostgREST） | 无 | `REAL_DB_VERIFIED` |
| **PRODUCTION**（正式 Supabase 项目） | migration `004→005`（纯 DDL）；005 **只读**静态 ACL 校验（post-deploy 复核） | **破坏性 DB suite（004）永远不得在生产跑** | `REAL_DB_VERIFIED`（仅只读校验） |

- **`004→005` 在每个 DB 上各执行一次**（staging 一次，production 一次），不是「staging 验过一次就在 production 跳过」。
- 破坏性（含 synthetic INSERT/DELETE）的只有 004 DB suite；**005 已改为纯 catalog 只读**（R9），故 005 可在 production 做 post-deploy 校验，004 不可以。

---

## 2. 变更清单（004 + 005 合起来做了什么）

- **004**（R6）：建立 `apply_learning_evidence` 原子 RPC（learning_record + ability_history + user_profile 单事务写入）；`ability_history` 加 `UNIQUE(learning_record_id, ability_key)`；`learning_record` 加 `skip_evidence` / `difficulty` 列；删除 learning_record / ability_history 的直写 INSERT policy。
- **005**（R7）：RPC 加固为 `SET search_path = ''` + 全 `public.*`/`auth.*` 限定 + 归属绑定重复查找；`EXECUTE` 仅授 `authenticated`（撤销 anon）；`user_profile` 对 `authenticated` 撤销表级 `INSERT, UPDATE`，改授列级：
  - `INSERT (user_id, exam_type, exam_batch, daily_time, updated_at)`
  - `UPDATE (exam_type, exam_batch, daily_time, updated_at)`

---

## 3. LOCAL PRECHECK（已完成，本 Agent 范围）

| 项 | 命令 | 结果 |
| --- | --- | --- |
| frontend test | `npm run test` | 见 R9 报告 `LOCAL_REGRESSION` |
| frontend typecheck | `npm run typecheck` | 见 R9 报告 |
| frontend lint | `npm run lint` | 见 R9 报告 |
| frontend build | `npm run build` | 见 R9 报告 |
| SQL 静态审阅 | 人工/源码审阅 004/005 test + migration | 见 R9 报告 `SQL_STATIC_REVIEW` |

> LOCAL PRECHECK **不产出** `REAL_DB_VERIFIED`。无 psql / Postgres / Supabase credentials 时，DB 运行时证据一律挂起，等 staging 执行。

---

## 4. PHASE A — MIGRATION（staging 与 production 各自一次）

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

## 5. PHASE B — DATABASE TESTS（按环境区分破坏性 / 只读）

### 5.1 DEDICATED STAGING（破坏性 004 + 只读 005）

```bash
psql "$STAGING_DATABASE_URL" -f supabase/tests/004_collision_matrix.sql
psql "$STAGING_DATABASE_URL" -f supabase/tests/005_profile_integrity.sql
```

- 两份均已内嵌 `\set ON_ERROR_STOP on`：任一 assertion 失败 → 脚本停止 + 非零退出；`ALL PASS` 只在最后出现，不会假绿。
- 期望输出：`R6 collision matrix: ALL PASS` 与 `R7 profile integrity: ALL PASS`。
- 004 会打印一条 `R9 RUN_ID = <uuid>` 起始行（见 §11 残渣恢复）。

### 5.2 PRODUCTION（只读 005 校验，绝不跑 004）

```bash
psql "$PRODUCTION_DATABASE_URL" -f supabase/tests/005_profile_integrity.sql
```

- **004 是破坏性 suite，禁止在生产跑。** 生产只允许 005（纯 catalog 只读，无写入、无残渣）。
- 若生产校验 005 FAIL，代表 migration 未正确应用或 ACL 形状不符，**回滚/修复后再发布 frontend**。

---

## 6. PHASE C — REAL CALLER RUNTIME（仅 staging，真实 Auth/JWT）

> 这是 R9 的关键分层：004/005 的 DB 级断言（含 `SET LOCAL "request.jwt.claim.sub"` synthetic claim）**不是**真实授权请求证据。真实 caller 证据只能在 staging 用**真实 Supabase Auth/JWT + PostgREST** 产生。

在 staging 以**真实匿名 Auth 用户**（非 service_role、非 `SET ROLE`）走一遍：

1. `ensureAnonymousSession()` 成功，拿到真实 `auth.uid()`（来自 JWT，非手设 GUC）。
2. profile create 成功（首次 INSERT `user_id` + editable columns）。
3. `apply_learning_evidence(...)` 返回 `{status:'APPLIED_NEW', evidence_applied:true}`。
4. `learning_record` 恰好 1 行；`ability_history` 与 evidence 路径一致；`user_profile` aggregate 变化一次。
5. 同一 operation id 重试 → `IDEMPOTENT_ALREADY_APPLIED`。
6. 以无 JWT（仅 anon key）调用 RPC → **AUTH_REQUIRED / 42501**（真实运行时拒绝）。
7. 以 authenticated 直写 `user_profile.ability_sentence` → **42501**（列级拒绝）。
8. 以 authenticated 直写 `learning_record` → **42501**（RLS default-deny）。

> 只有这些在 staging 用真实 JWT 跑通，才允许把 `REAL_AUTH_RUNTIME_DEFERRED` 翻转为已验证。

---

## 7. PHASE D — PRODUCTION Coordinated Cutover

正式 production migration 之前，**matching frontend 必须先 build/test READY**，而不是 migration 后才开始构建。

| Step | 动作 |
| --- | --- |
| STEP 0 | 确认 exact approved HEAD（冻结，不中途改码） |
| STEP 1 | build + test matching frontend（`npm run build` + vitest/typecheck/lint） |
| STEP 2 | 准备 deployment window（确定可回滚窗口与负责人） |
| STEP 3 | 执行 production migration **004** |
| STEP 4 | 执行 production migration **005** |
| STEP 5 | 立即发布 matching frontend（不留「新 DB 权限模型 + 旧 frontend 长时间服务」窗口） |
| STEP 6 | 执行 production 只读 005 校验（§5.2） |
| STEP 7 | RPC smoke test（真实匿名用户，§8） |
| STEP 8 | monitor persistence errors（§9，至少一个稳定周期） |

---

## 8. RPC Smoke Test（具体，非模糊「测一下 RPC」）

以 authenticated 测试用户（真实 Anonymous Auth，非 service_role）完成：

1. `ensureAnonymousSession()` 成功，拿到 `auth.uid()`。
2. profile create 成功（首次 INSERT `user_id` + editable columns）。
3. `apply_learning_evidence(op, session, card, 'choice', true, '{"selectedOptionId":"a"}', false, 0.4)` 返回 `{status:'APPLIED_NEW', evidence_applied:true}`。
4. `learning_record` 恰好 1 行（按 operation id 计数 = 1）。
5. `ability_history` 与预期 evidence 路径一致（choice → sentence + reading 各 1 行）。
6. `user_profile` 的 `ability_sentence` / `ability_reading` 各变化恰好一次（非 0）。
7. 以**同一 operation id + 同一 payload** 重试 → 返回 `IDEMPOTENT_ALREADY_APPLIED`。
8. 重试后 `learning_record` / `ability_history` 行数不变、`user_profile` aggregate 不二次变化。

---

## 9. Persistence Error Monitoring（cutover 后最低监控）

用现有 Supabase Logs / browser console / deployment logs 观察：

- `AUTH_REQUIRED`（auth.uid() 为空 → 客户端未认证就写）
- `PROFILE_NOT_FOUND`（profile 缺失 → 建档路径或迁移顺序问题）
- `LEARNING_OPERATION_ID_COLLISION`（同 id 不同 payload → 客户端 id 生成异常）
- `ATOMIC_STATE_CONFLICT`（新 learning_record 已有 history 行 → 原子性异常）
- `permission denied` / SQLSTATE `42501`（列级/函数权限拒绝 → 客户端请求越权）
- RPC timeout（`SAVE_TIMEOUT_MS` 15s abort → 网络/DB 慢）
- save failure rate（学习写入失败率异常上升）
- unexpected PostgREST errors（非预期 4xx/5xx）

---

## 10. Rollback — Emergency Coordinated Rollback

**旧 multi-step persistence 已被淘汰，不是任何 rollback 的最终态。** rollback 绝不把「learning_record direct INSERT / ability_history direct INSERT / 整表 user_profile write / anon EXECUTE / unsafe search_path」当作正常最终状态恢复。

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

## 11. Residue / Recovery（R9 ENG-R8-006）

- 004 suite 每次运行**起始打印一行 `R9 RUN_ID = <uuid>`**。
- 004 的合成 `user_id` / operation id 全部 `gen_random_uuid()` 每次运行全新，残渣**不可能**与真实用户数据碰撞或混淆。
- `\set ON_ERROR_STOP on` 意味着：**中途 FAIL 会在 cleanup 之前 abort，cleanup 可能没跑**。这是如实文档化的，不是静默失败。
- **恢复手段（二选一）**：
  1. **丢弃 / 重置一次性 staging DB**（首选 —— 004 只在 staging 跑，重建 staging 最干净）。
  2. 按 RUN_ID 对应本次运行的合成 `user_id` 手动 DELETE（FK 顺序：`ability_history` → `learning_record` → `user_profile`）。
- **绝不在 production 产生残渣**：因为破坏性 004 永远不在 production 跑（§5.2）。

---

## 12. 证据标签（统一）

- **Scenario 14** = `LOST_RESPONSE_EQUIVALENT_RETRY`（等价语义），**不是**「REAL LOST RESPONSE / REAL NETWORK RESPONSE LOSS」。
- **004 的 auth context** = synthetic claim（`SET LOCAL "request.jwt.claim.sub"`），**不是**真实授权请求；真实 caller 证据见 §6。
- **005 的 ACL 断言** = catalog 静态形状（`has_*_privilege` / `pg_policies` / `pg_proc`），**不是**真实 PostgREST 授权行为。
- **Scenario 15** = 顺序共存，**不是**并发测试（`CONCURRENCY_RUNTIME = NOT_RUN`）。
- **Scenario 16** = 早失败（写前 PROFILE_NOT_FOUND），**不是**中途回滚（`MID_WRITE_ROLLBACK_RUNTIME = NOT_RUN`）。

---

## 13. 旧客户端切换影响（cutover）

| 客户端行为 | 切换后 | 处置 |
| --- | --- | --- |
| 直写 `user_profile.ability_*` / `confidence_*` | **42501 拒绝** | 预期内；前端已走 RPC |
| 直写 `user_profile.user_id`（UPDATE） | **42501 拒绝** | 预期内；身份只能 INSERT 一次性写入 |
| 仅 anon key（无 JWT）调 RPC | **42501 拒绝** | 预期内；须 Anonymous Auth |
| 走 RPC 学习写入 + `persistUserProfile` 建档/更新 | 正常 | 前端 `db.ts` 已改为 CREATE/UPDATE 分离 |

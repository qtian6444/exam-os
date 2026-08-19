# Deployment Gate — R7 安全模型加固上线交接（Handoff，非部署）

> 本文件是**上线交接说明**，供 Product Owner 在 Supabase SQL Editor 执行迁移与验证时使用。
> 本 Agent 无 supabase CLI / psql，不执行部署；以下为可验证事实与执行顺序，不含自我评价。

## 目标

把 R7 加固后的 SECURITY DEFINER 安全模型（migration 005）安全上线，并保证**旧客户端（R4 及更早）切到新模型时不产生静默损坏**。

## 变更清单（migration 005 做了什么）

- **R7-A1** `apply_learning_evidence` 重写为 `SET search_path = ''`，全部 `public.*` / `auth.*` 显式限定；重复操作查找改为**归属绑定**（`WHERE id = p_operation_id AND user_id = v_uid`）。
- **R7-A2** `EXECUTE` 从 `anon` 撤销，仅授予 `authenticated`。
- **R7-B** `user_profile` 对 `authenticated` 撤销表级 `INSERT, UPDATE`，改授列级：
  - `INSERT (user_id, exam_type, exam_batch, daily_time, updated_at)`
  - `UPDATE (exam_type, exam_batch, daily_time, updated_at)`
  - 效果：`ability_*` / `confidence_*` / `id` / `created_at` 不再客户端可写；`user_id` 仅可 INSERT 不可 UPDATE。

## 执行顺序（必须严格）

1. 确认 001 → 004 已全部应用（本线上项目已应用至 004）。
2. 执行 `supabase/migrations/005_security_model_hardening.sql`（SQL Editor 一次性粘贴运行）。
3. 005 全部语句**幂等可重跑**：`CREATE OR REPLACE FUNCTION` 可覆盖；`REVOKE`/`GRANT` 重复执行无副作用（缺失权限的 `REVOKE` 仅告警不报错）。若执行中断，可整段重跑。

## 验证（上线后必跑）

- `supabase/tests/004_collision_matrix.sql` → 期望 `R6 collision matrix: ALL PASS`（已内嵌 `\set ON_ERROR_STOP on`，任何 FAIL 以非零退出，不会假绿）。
- `supabase/tests/005_profile_integrity.sql` → 期望 `R7 profile integrity: ALL PASS`（10 项 A..J）。
- 前端 `npm run typecheck` / `npm run lint` / `npm run build` / vitest 已本地通过（见 R7 报告）。

## 旧客户端切换影响（cutover）

| 客户端行为 | 切换前 | 切换后 | 处置 |
| --- | --- | --- | --- |
| 直写 `user_profile.ability_*` / `confidence_*`（旧多步写入路径） | 可写 | **42501 拒绝** | 预期内；前端已改走 RPC，无需旧路径 |
| 直写 `user_profile.user_id`（身份篡改） | 可写 | **42501 拒绝** | 预期内；身份只能由 INSERT 一次性写入 `auth.uid()` |
| 仅 anon key（无 JWT）调用 RPC | 可到达函数体（AUTH_REQUIRED） | **42501 拒绝**（EXECUTE 已撤） | 预期内；客户端须走 Anonymous Auth 拿 JWT |
| 走 RPC 学习写入 + upsert 建档 | 正常 | 正常 | 前端 `db.ts` 无需改动 |

- **数据迁移**：无需。005 不改任何数据行、不加新表、不加 FK。
- **不可逆性**：005 全部为可重建的 DDL/权限变更；无数据删除。

## 回滚方式

若上线后发现问题，按以下顺序回滚（SQL Editor 执行）：

```sql
-- 1. 恢复 004 版函数定义（search_path = public, pg_temp，无归属绑定查找）
--    直接重跑 supabase/migrations/004_atomic_learning_evidence.sql 的
--    CREATE OR REPLACE FUNCTION ... 整段即可（005 只用 CREATE OR REPLACE，
--    无 DROP，不会丢函数）。

-- 2. 恢复 anon 的 EXECUTE
GRANT EXECUTE ON FUNCTION apply_learning_evidence(
  uuid, text, text, text, boolean, jsonb, boolean, real
) TO anon;

-- 3. 恢复 authenticated 表级 INSERT/UPDATE（撤销列级授权）
GRANT INSERT, UPDATE ON public.user_profile TO authenticated;
```

回滚后重跑 004 版函数，旧客户端多步写入路径即恢复（但不建议长期保留）。

## 风险提示

- 若存在**本仓库之外**的旧客户端仍直写 `ability_*`，上线 005 后其写入会失败。上线前请确认无此类外部写入方（当前仓库 `frontend/src/lib/db.ts` 已全部走 RPC + `upsertUserProfile` USER_EDITABLE 列）。
- 本迁移不涉及 `service_role`、不引入 set_config GUC、不新增核心表、不改学习算法权重（详见 R7 报告 SPEC_CONFLICT 状态）。

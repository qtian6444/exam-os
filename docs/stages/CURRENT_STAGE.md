# Exam OS Current Stage

Stage ID: P0-DEMO-V2-01
Stage Name: V2 演示可信层（题源 → 行为证据 → 下一步）
Status: ACTIVE
Priority: P0

---

## 0. 前任 Stage 最终状态记录（P0-SECURITY-01）

> 以下为 P0-SECURITY-01「安全边界加固」的最终状态，依据仓库真实验收证据记录，
> 不伪造 COMPLETE / ACCEPTED。

- 最终状态：`IMPLEMENTATION_COMPLETE`（R4），**未 STAGE_ACCEPTED**。
- 判定依据：`docs/stages/REVIEW_HANDOFF.md`（R4 待 Codex 双审）。
- 真实未验证项（不得当作已完成）：
  - migration `004_atomic_learning_evidence.sql` 线上部署：**BLOCKED**（需 Product Owner 在 Supabase SQL Editor 执行）。
  - RPC `apply_learning_evidence` 线上 DB 集成验证：**NOT_RUN**。
  - breakdown 并发 single-flight 线上验证：**NOT_RUN**（需重新部署 breakdown 函数）。
  - `dedup_test.ts` Deno 测试：**NOT_RUN**。
- 已通过证据：typecheck / lint / build / vitest（47/47）/ 线上 RLS 双用户隔离与未认证拦截脚本断言 PASS。
- 遗留 debt（KEEP，不阻断本 Stage）：`LEGACY_UNOWNED_DATA`、匿名防滥用 CAPTCHA。
- 约束：本 Stage **不得删除、回滚、混入** P0-SECURITY-01 的任何代码修改（迁移、RLS、Auth、Edge Function、RPC）。

---

## 1. 本 Stage 唯一目标

在不改变 Learning Engine、账号协议或数据库协议的前提下，将 V1.0 Pro
收束为可录制、可解释的 V2 演示体验：

```text
游客一键进入
→ 看到可追溯题源
→ 先行动、获得反馈、重试或揭示
→ 看到本次真实行为证据
→ 看到基于该证据的下一步建议
```

本 Stage 不是完整 V2 Decision Engine、掌握度系统或复习调度器的实现。

### Product Owner 授权（2026-09-17）

- 优先服务于明日的黑客松演示、PPT 与录屏。
- 游客体验是默认演示路径；永久账号仅保留为内测入口。
- 题源基于 Product Owner 提供的真题解析资料；不得表述为教育部官方校准或官方难度标准。
- 所有本轮结果均是本次 session 的行为证据，不宣称长期能力定论或掌握结论。

---

## 2. 前任 Stage 记录：P0-LEARNING-INTERACTION-01

将当前「解析型页面」（用户被动看拆解、看题）改造成「用户必须主动操作的训练型页面」。

每条训练题必须满足：

```
用户先做至少一个主动动作（选 / 排 / 判 / 组）
→ 即时反馈（对错 + 局部原因 + 下一步）
→ 展示作答证据 / 正确解析
→ 继续下一题
```

ReadingBreakdown 从「默认主流程」退为「支架状态」（对齐 C06），不再作为默认解析页。

---

## 3. 参考边界

### Duolingo 只参考

- 单动作任务
- 用户主动操作
- 即时反馈
- 题型丰富性
- 低难度逐步提升
- 移动端训练节奏

### 听劫只参考

- 专业训练空间
- 听前预判
- 作答后展示证据
- 信息层级
- 训练过程呈现

### 不得照搬

- 两个产品的品牌视觉
- 角色
- 商业机制
- 完整产品结构

---

## 4. 允许修改

- 游客入口的展示优先级与内测标识（不改 Auth 流程）
- Choice / Reorder 卡片的题源追溯展示
- 会话级行为证据汇总、下一步学习建议与完成页 UI
- Dashboard 的确定性文案（不改能力模型或数据读取）
- 对应前端测试、类型与必要样式

---

## 5. 禁止修改

- 数据库结构、`db.ts`、`saveExecutor.ts`、RPC、RLS、migrations
- Auth 登录/创建账号/永久账号发放逻辑
- 能力模型、学习证据保存协议、复习调度与掌握度阈值
- DeepSeek 服务端安全边界
- 任意难度分级、能力分段、复习间隔的“官方化”表达

> 以上禁止项即 R9 冻结层 + 学习证据协议 + DeepSeek 服务端边界。
> 若开发中确需触碰上述任一冻结项，立即停止并输出 `SPEC_CONFLICT`，不自行绕过。

---

## 6. 验收标准（Definition of Done）

只有以下全部满足，Implementation Agent 才能输出 `IMPLEMENTATION_COMPLETE`：

### 演示目标

- 游客可以一键进入默认演示路径，永久账号明确标识为内测。
- 默认训练流程保持「用户主动操作 → 即时反馈 → 重试/揭示 → 继续」。
- 每张默认卡展示可追溯题源：考试、套题、位置和项目资料状态。
- 完成页只总结本次真实行为（完成数、真实 elapsed、首次正确/重试/揭示），不制造能力提升或掌握结论。
- 下一步建议只由本次可见 evidence 推导，说明它不是复习调度或长期诊断。
- 移动端保持一题一个主要动作。

### 冻结层与协议

- `db.ts` / `saveExecutor.ts` / RPC / RLS / migrations / Auth / 能力模型 / 学习证据保存协议 / DeepSeek 服务端边界 **无 diff**。
- 最终学习证据仍走现有 `applyLearningEvidence` 链路，`p_user_answer` 数据结构不变，不新增持久化字段、不改 JSON 协议。
- 每张原始卡片最多写一次证据；本轮会话摘要只在前端内存中组织，不新增持久化字段。

### 边界合规

- 不引入 Duolingo / 听劫 的品牌视觉、角色、商业机制、完整产品结构（只取交互原则）。
- 不引入真实 LLM / 新 API 依赖；反馈与下一步建议仍为规则 + 行为事实驱动，不虚构 AI 分析。
- `PROJECT_MATERIAL_VERIFIED` 只能表示已与 Product Owner 提供的资料核对，不等于教育部官方认证。

### 验证

- typecheck 通过
- lint 通过
- build 通过
- 现有 tests 通过
- 新增会话 evidence / 题源可见 / 游客 CTA 的前端测试通过

---

## 7. Git 与交卷

完成开发与测试后：

1. 确认 git diff 只包含本 Stage 授权范围（`frontend/src/components/**`、`frontend/src/features/**`、`frontend/src/types/**`、`frontend/src/data/mock.ts`、必要样式与测试），不含任何冻结层文件。
2. 填写 `docs/stages/REVIEW_HANDOFF.md`（或按协议输出交接）。
3. 返回 `IMPLEMENTATION_COMPLETE` + 修改文件清单 + typecheck/lint/build/test 结果 + 冻结层无 diff 证据。

不要宣布 `STAGE_ACCEPTED` / `PRODUCT_PASS` / `ENGINEERING_PASS`，等待外部 Codex 双审。

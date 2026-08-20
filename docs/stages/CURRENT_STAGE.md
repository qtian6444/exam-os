# Exam OS Current Stage

Stage ID: P0-LEARNING-INTERACTION-01
Stage Name: 训练交互纠偏（解析型页面 → 训练型页面）
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

## 2. 参考边界

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

## 3. 允许修改

- ReadingBreakdown 默认流程
- Reorder 题型交互与默认难度
- Choice 题型呈现
- 默认训练题队列
- 训练页面前端展示
- 对应前端测试和必要样式

---

## 4. 禁止修改

- 数据库结构
- `db.ts`
- `saveExecutor.ts`
- RPC
- RLS
- migrations
- Auth
- 能力模型
- 学习证据保存协议
- DeepSeek 服务端安全边界

> 以上禁止项即 R9 冻结层 + 学习证据协议 + DeepSeek 服务端边界。
> 若开发中确需触碰上述任一冻结项，立即停止并输出 `SPEC_CONFLICT`，不自行绕过。

---

## 5. 验收标准（Definition of Done）

只有以下全部满足，Implementation Agent 才能输出 `IMPLEMENTATION_COMPLETE`：

### 交互目标

- 默认训练流程为「用户主动操作型」：每题要求至少一个主动动作后才能推进；ReadingBreakdown 不再作为默认主流程（退为支架，C06）。
- 作答后即时反馈：对错 + 局部原因 + 下一步，来源为「用户答案 vs 正确答案的真实差异 + 题型规则 + 五维能力映射」，不虚构、不空洞（C16）。
- 错误不形成通关墙（C11）：首次错误可重试；达到当前规则最大尝试后揭示答案并允许继续。
- 移动端一题一个主要动作，低摩擦（C15）。
- 强化/验证无安全可用同类型题时，走 `PENDING_VALIDATION` 兜底并允许继续，不随机凑题。

### 冻结层与协议

- `db.ts` / `saveExecutor.ts` / RPC / RLS / migrations / Auth / 能力模型 / 学习证据保存协议 / DeepSeek 服务端边界 **无 diff**。
- 最终学习证据仍走现有 `applyLearningEvidence` 链路，`p_user_answer` 数据结构不变，不新增持久化字段、不改 JSON 协议。
- 每张原始卡片最多写一次证据；重试 / 提示过程只存前端状态，不单独落库。

### 边界合规

- 不引入 Duolingo / 听劫 的品牌视觉、角色、商业机制、完整产品结构（只取交互原则）。
- 不引入真实 LLM / 新 API 依赖；反馈仍为规则 + 差异驱动，不虚构 AI 分析。

### 验证

- typecheck 通过
- lint 通过
- build 通过
- 现有 tests 通过
- 新增针对交互的前端测试通过（Choice 提交 / Reorder 判题 / 反馈面板 / 重试与揭示流程）

---

## 6. Git 与交卷

完成开发与测试后：

1. 确认 git diff 只包含本 Stage 授权范围（`frontend/src/components/**`、`frontend/src/features/**`、`frontend/src/lib/feedback*`、`frontend/src/data/mock.ts`、必要样式与测试），不含任何冻结层文件。
2. 填写 `docs/stages/REVIEW_HANDOFF.md`（或按协议输出交接）。
3. 返回 `IMPLEMENTATION_COMPLETE` + 修改文件清单 + typecheck/lint/build/test 结果 + 冻结层无 diff 证据。

不要宣布 `STAGE_ACCEPTED` / `PRODUCT_PASS` / `ENGINEERING_PASS`，等待外部 Codex 双审。

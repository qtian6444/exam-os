# Exam OS Current Stage

Stage ID: P0-SECURITY-01
Stage Name: Security Boundary Hardening
Status: ACTIVE
Priority: P0

## 1. 本 Stage 唯一目标

只解决两个已经由 Product Owner 锁定的安全阻断问题：

### P0-SECURITY-01
DeepSeek API Key 当前存在进入浏览器前端的风险。

目标：

任何真实 DeepSeek API Secret 都不得：
- 出现在 VITE_ 前端环境变量
- 进入浏览器 bundle
- 出现在浏览器源码
- 出现在浏览器 Network 请求 Authorization 中
- 出现在前端日志
- 出现在 Git
- 出现在 REVIEW_HANDOFF
- 出现在任何用户可读取 artifact

DeepSeek API 调用必须迁移到服务端安全边界。

优先使用现有 Supabase Edge Functions 架构。

如果现有 Edge Function 已经存在合适 owner：
复用现有 owner。

如果没有：
只创建实现该安全边界所必需的最小 Edge Function。

DeepSeek Secret 使用 Supabase 服务端 Secret / Edge Function 环境变量读取。

前端只能请求我们自己的服务端函数。

前端不得直接携带 DeepSeek Secret 调用 DeepSeek API。

---

### P0-SECURITY-02
Supabase 当前匿名 FOR ALL USING(true) / WITH CHECK(true) RLS 必须删除。

目标：

任何用户都不能读取、修改或伪造其他用户的核心学习数据。

正式用户数据权限身份不得继续依赖客户端自己生成并提交的 device UUID。

使用 Supabase Auth Anonymous Sign-In 建立免登录用户身份。

产品体验仍然保持：

打开 Exam OS
→ 无需邮箱
→ 无需密码
→ 无需手机号
→ 无需人工登录
→ 自动建立匿名 Auth Session
→ 正常进入学习

Anonymous Auth 的 auth.uid() 作为真正的数据所有权身份。

device UUID 如果当前代码仍有其他用途，可以暂时保留用于：
- device metadata
- debugging
- analytics

但：

device UUID 不得再作为数据库授权身份。

---

## 2. 本 Stage 明确不做什么

禁止夹带：

- Onboarding V2
- FIRST_SESSION V2
- Learning Game Shell
- Audio Capability
- AudioCard
- Vocabulary Context
- Reading Support
- ReadingBreakdown产品流程改造
- Reorder两次尝试
- Agent V0
- content_library正式内容迁移
- UI重设计
- Partner重设计
- 目录大清理
- archive清理
- CI体系重构
- 性能优化
- 其他产品功能

除非某个极小修改是完成本 Stage 安全目标不可避免的依赖。

如果发现其他问题：

只记录：

NON_BLOCKING_SUGGESTION

不要实施。

---

## 3. DeepSeek API 安全边界

开始前先审计当前真实调用链：

frontend
→ DeepSeek调用代码
→ 当前API
→ 当前Edge Functions

确认当前真实风险后再改。

最终必须达到：

Frontend
↓
Supabase Edge Function
↓
服务器端读取 DeepSeek Secret
↓
DeepSeek API
↓
Edge Function验证/规范化响应
↓
Frontend

禁止：

Frontend
↓
DeepSeek API

---

## 4. DeepSeek Secret 规则

代码中不得出现真实 Secret。

不得把真实 Secret：

- 写进源码
- 写进 .env.example
- 写进 commit
- 写进文档
- 写进 console
- 写进 error response
- 写进日志
- 回传浏览器

.env.example 只能包含变量名，例如：

DEEPSEEK_API_KEY=

不得填写真实值。

如果审计确认当前真实 DeepSeek API Key 曾经通过：

VITE_DEEPSEEK_API_KEY

或其他前端方式加载进入浏览器：

则必须把这个 Key 视为已经暴露。

旧 Key 不能继续作为最终生产 Key。

如果 Key rotation 需要 Product Owner 在 DeepSeek 控制台执行：

输出：

OWNER_ACTION_REQUIRED

只告诉 Product Owner：
需要在哪个页面重新生成 / rotate Key。

禁止要求 Product Owner 把真实 Key 发到聊天中。

新 Key 应直接进入 Supabase Secret 管理。

---

## 5. Anonymous Auth

Exam OS 当前仍然保持免登录体验。

首次打开应用：

如果已有有效 Supabase Auth Session：
复用。

如果没有：
自动执行 Anonymous Sign-In。

成功后获得：

auth.uid()

这个 UID 成为用户数据真正 owner。

失败时：

不得退回不安全的公开数据库写入。

禁止：

“Auth失败 → 为了让产品继续跑 → 临时关闭RLS / 使用公开写入”。

失败必须进入明确 error / retry 状态。

不得 silent failure。

---

## 6. 数据所有权

继续保持当前 5 张核心表。

不得增加第 6 张核心表。

当前 5 表：

1. user_profile
2. content_library
3. content_skill
4. learning_record
5. ability_history

先审计当前真实字段。

不要凭记忆假设 user_id / profile_id 的名字。

如果现有字段能够可靠绑定 auth.uid()：
复用。

如果用户数据表缺少真正的 Auth Owner 字段：

允许通过最小 migration 增加必要 ownership 字段。

禁止借此重新设计整个 schema。

---

## 7. RLS 最终权限目标

### user_profile

用户只能：

SELECT 自己
INSERT 自己
UPDATE 自己

不得读取或修改其他用户 profile。

客户端不需要的 DELETE 权限不要开放。

---

### learning_record

学习记录原则上是用户自己的 append-oriented 数据。

客户端只开放当前真实产品链路需要的最小权限。

至少必须保证：

用户只能读取自己的 learning_record。
用户只能创建属于自己的 learning_record。

不得通过修改请求中的 user_id / profile_id 写入别人名下。

如果当前产品不需要 UPDATE / DELETE：
不要开放。

---

### ability_history

用户只能读取自己的 ability_history。
用户只能创建属于自己的 ability_history。

如果当前产品不需要 UPDATE / DELETE：
不要开放。

---

### content_library

这是共享学习内容。

普通学习用户：

允许读取正式可用内容。

不得从浏览器直接：
INSERT
UPDATE
DELETE

---

### content_skill

这是共享内容能力标签。

普通学习用户：

允许读取。

不得从浏览器直接：
INSERT
UPDATE
DELETE

---

## 8. 禁止继续使用宽松策略

最终 migration 中不得继续存在以下核心用户数据策略：

FOR ALL
USING (true)
WITH CHECK (true)

不得用：

“先留着方便测试”

作为理由保留。

也不得新增另一条 permissive policy 把安全限制重新绕开。

必须检查旧 policy 是否真正删除。

---

## 9. Edge Function 数据权限

Edge Function 不得因为运行在服务器端就自动绕过用户数据隔离。

对于用户自己的：

user_profile
learning_record
ability_history

优先使用：

用户 JWT
+
RLS

验证 ownership。

如果某个 Edge Function 确实需要 elevated secret/service权限：

必须说明为什么需要。

并且必须在服务端根据已经验证的用户身份重新检查 ownership。

不得相信客户端传来的：

user_id
profile_id
device_id

就直接用高权限写数据库。

---

## 10. 旧数据

当前数据库已有真实 E2E 测试记录。

本 Stage：

不得为了方便直接删除旧数据。

如果新增 auth ownership 后旧记录无法自动对应新的 auth.uid()：

保留旧记录。

让旧的无 owner 测试数据默认不可被普通用户读取。

在 REVIEW_HANDOFF 中说明：

LEGACY_UNOWNED_DATA

不要擅自删除或伪造 ownership。

---

## 11. 必须测试两个独立用户

本 Stage 不能只测试：

“我自己还能不能写数据”。

必须真实创建两个独立 Anonymous Auth Session：

USER_A
USER_B

验证：

USER_A：
可以创建自己的 profile / learning record / ability history。

USER_A：
可以读取自己的数据。

USER_B：
可以创建自己的数据。

USER_B：
可以读取自己的数据。

然后必须尝试：

USER_A 读取 USER_B 数据
→ 必须失败 / 返回空

USER_A 修改 USER_B 数据
→ 必须失败

USER_A 伪造 USER_B owner id 创建记录
→ 必须失败

USER_B 对 USER_A 做同样测试
→ 必须失败

未登录请求访问用户核心数据
→ 必须失败

这是本 Stage Blocking Acceptance Test。

---

## 12. Content 权限测试

Authenticated Anonymous User：

读取 content_library
→ 应按设计成功

读取 content_skill
→ 应按设计成功

浏览器直接尝试修改 content_library
→ 必须失败

浏览器直接尝试修改 content_skill
→ 必须失败

---

## 13. DeepSeek Key 验证

必须真实检查：

frontend source
browser bundle
browser Network
browser console
git diff
git tracked files

确认：

不存在真实 DeepSeek API Secret。

浏览器调用学习AI能力时：

只能看到请求我们的服务端 Edge Function。

不得看到：

Authorization: Bearer <DEEPSEEK_SECRET>

发往 DeepSeek API。

---

## 14. DeepSeek功能回归

安全迁移后必须确认现有需要 DeepSeek 的能力仍然可以真实工作。

至少验证当前已经存在的：

ReadingBreakdown / getBreakdown 对应真实链路

能够：

Frontend
→ Edge Function
→ DeepSeek
→ 返回合法结果
→ 前端正常展示

本 Stage只验证它还能工作。

不要借机重做 ReadingBreakdown 产品流程。

---

## 15. Auth UX 回归

安全改造不得增加：

登录页面
邮箱输入
手机号输入
密码输入
注册弹窗

首次用户仍然应该：

打开
→ 自动获得匿名session
→ 正常进入现有流程

用户不需要理解：

Supabase
JWT
Anonymous Auth
RLS
auth.uid()

这些都是内部实现。

---

## 16. 必须测试的失败状态

至少测试：

1. Anonymous Sign-In失败
2. Session过期 / 无效
3. Edge Function无法访问DeepSeek
4. DeepSeek API超时
5. DeepSeek返回错误
6. Edge Function Secret不存在
7. 数据库拒绝RLS写入
8. 用户修改客户端owner id
9. USER_A尝试读取USER_B
10. USER_A尝试修改USER_B
11. 页面refresh后session恢复
12. 快速重复提交

禁止 silent failure。

禁止为了通过测试关闭安全控制。

---

## 17. Migration规则

所有RLS / schema调整必须：

通过正式 Supabase migration 进入 repo。

不得只在 Supabase Dashboard 手改完却不留下 migration。

如果确实需要 Dashboard 操作：

代码 / migration仍必须保持可复现真源。

不得进行破坏性数据删除。

---

## 18. Definition of Done

只有以下全部完成，Implementation Agent 才能输出：

IMPLEMENTATION_COMPLETE

### Secret

- 前端不再直接调用 DeepSeek API
- 前端不再读取 DeepSeek Secret
- VITE_DEEPSEEK_API_KEY 等真实Secret入口已移除
- DeepSeek Secret只存在服务端安全环境
- 浏览器bundle无Secret
- Network无Secret
- Git无Secret
- 如果旧Key曾进入浏览器，已完成rotation或明确等待Owner完成rotation

### Auth

- 免登录Anonymous Auth正常工作
- auth.uid()成为用户数据安全身份
- device UUID不再承担授权职责

### RLS

- 删除用户核心数据的匿名全开放policy
- USER_A / USER_B数据真正隔离
- 未登录访问用户数据失败
- 共享content可读
- 普通客户端不能改共享content
- 无额外 permissive policy 绕过规则

### Regression

- 当前应用可以启动
- 当前核心流程没有因为安全改造完全中断
- 现有DeepSeek能力通过服务端链路工作
- refresh后session正常恢复

### Verification

- typecheck通过
- lint通过
- build通过
- 当前已有tests通过
- 新安全边界有针对性测试
- 两用户RLS隔离真实验证通过

### Documentation

- 更新必要工程文档
- 填写 docs/stages/REVIEW_HANDOFF.md
- 所有事实有实际证据
- 不写自我评价

---

## 19. Git与交卷

完成全部开发和测试后：

1. 填写 REVIEW_HANDOFF.md
2. 确认 git diff 只包含本 Security Stage
3. commit
4. push
5. 冻结 HEAD

然后返回：

IMPLEMENTATION_COMPLETE

并提供：

Stage ID:
P0-SECURITY-01

Base commit:

HEAD commit:

Branch:

DeepSeek Key migration:
PASS / FAIL

Key rotation:
DONE / OWNER_ACTION_REQUIRED / NOT_REQUIRED

Anonymous Auth:
PASS / FAIL

RLS isolation:
PASS / FAIL

USER_A → USER_B isolation:
PASS / FAIL

USER_B → USER_A isolation:
PASS / FAIL

Unauthenticated access:
BLOCKED / NOT_BLOCKED

Shared content read:
PASS / FAIL

Shared content client write:
BLOCKED / NOT_BLOCKED

DeepSeek server-side call:
PASS / FAIL

typecheck:
PASS / FAIL

lint:
PASS / FAIL

build:
PASS / FAIL

tests:
PASS / FAIL

Unverified:
...

Commit:
...

Push:
SUCCESS / FAIL

不要宣布：
STAGE_ACCEPTED
PRODUCT_PASS
ENGINEERING_PASS

等待外部 Codex 双审。

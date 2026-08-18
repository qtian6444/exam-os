# Stage Review Handoff

> 每个 Stage 完成后由主开发 Agent 填写。
> 只记录可验证事实，不写自我评价。

## Identity

- Stage ID：
- Review cycle：
- Agent Constitution version / commit：
- Exam OS Constitution version / commit：
- Stage Contract：
- Stage Contract version / commit：
- Base commit：
- Review target / HEAD commit：
- Branch：
- Implementation Agent：
- Handoff time：

## Scope

- 本 Stage 实际完成内容：
- 明确不包含内容：
- 用户可见变化：
- 修改文件：
- 新增文件：
- 删除文件：

## Data and Interfaces

- 数据库 / migration：
- API / Edge Function：
- 状态机：
- 数据结构：
- RLS / 权限：
- 隐私：
- Secret / Key：
- 不可逆数据操作：
- 是否影响已有用户数据：

## Runtime

- 本地运行方式：
- 测试环境：
- 测试身份：
- 所需环境变量名称：
- 测试设备 / 浏览器：
- 移动端：
- 桌面端：

> 禁止填写真实 API Key、Secret 或密码。

## Verification

### Automated

- typecheck：
- lint：
- build：
- tests：
- migration verification：
- 其他：

### Manual

- 核心用户流程：
- 正确路径：
- 错误路径：
- loading：
- error：
- fallback：
- duplicate submit：
- refresh：
- 中途退出：
- 网络异常：
- 其他边界：

### Evidence

- Runtime screenshot / recording：
- Browser / console：
- DB / log：
- 其他：

## Known State

- 已知问题：
- 未验证项：
- Non-blocking debt：
- 需要 Product Owner 拍板：
- 回滚方式：

## Review Boundary

- Review range：`<BASE>..<HEAD>`
- 允许检查受本 Stage 影响的旧调用链：YES
- 审查期间 HEAD 允许变化：NO

如果 HEAD 发生变化：
当前 Engineering QA 与 Product QA 全部失效，
进入新的 Review cycle。

## Engineering QA

- Reviewer：
- Reviewed commit：
- Review cycle：
- Verdict：PENDING / PASS / FAIL
- Blocking：
- Non-blocking：
- Unverified：

## Product / Constitution QA

- Reviewer：
- Reviewed commit：
- Review cycle：
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

- Current status：
- Accepted HEAD：
- Product Owner：
- Approval date：
- Notes：

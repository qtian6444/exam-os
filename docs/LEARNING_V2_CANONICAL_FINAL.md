# EXAM OS — LEARNING V2 CANONICAL FINAL

**Version:** Learning V2 Canonical Final
**Scope:** Exam OS Product Logic / Learning Core / AI Decision / Evidence / Obstacle / Intervention / Validation / Memory / CET Evidence / Learning Data Contract
**Current Entry Exam:** CET-4 / CET-6
**Status:** CANONICAL FINAL
**原则：** 本文收束此前已经确认的高质量阶段结论，不引入新的学习理论，不因为追求篇幅简短而删除已有高质量内容。

---

# 第一部分｜Exam OS 到底是什么

## 1. 产品定义

Exam OS 是一个 **AI 学习决策操作系统**。

当前以大学英语四六级作为第一落地场景，但 Exam OS 的产品本质不是一个“四六级工具集合”。

它真正解决的问题不是：

> 用户缺少一个背单词工具、真题工具、听力工具、错题工具或 AI 问答工具。

用户真正缺少的是：

> 在一个明确考试目标和有限学习时间下，持续判断“我现在最应该做什么”的能力。

用户每天面对的真实问题包括：

- 现在应该学什么；
- 为什么现在应该学这个；
- 应该继续做题还是先处理刚才的错误；
- 当前真正卡在哪里；
- 是词义问题、句子理解问题、证据匹配问题，还是干扰项问题；
- 现在需要什么程度的帮助；
- 刚刚“听懂了”到底算不算学会；
- 哪些东西需要以后重新提取；
- 哪些东西已经值得做迁移验证；
- 什么情况下应该停止继续教学；
- 什么情况下应该进入下一项任务；
- 在今天剩余的时间里，什么最值得做。

因此 Exam OS 的核心能力不是“提供更多学习功能”。

而是：

> **持续根据用户的真实学习行为，为用户做下一步学习决策。**

Exam OS 最核心的问题始终是：

> **Next Best Learning Action 是什么？**

---

# 第二部分｜为什么叫 OS

普通学习产品通常呈现为：

```text
单词
真题
听力
阅读
错题
AI
学习计划
```

这些功能即使全部装进同一个 APP，本质上仍然可能只是一个工具集合。

因为用户打开产品之后，仍然需要自己完成最困难的一步：

> **我现在到底应该点哪个？**

Exam OS 要屏蔽这层复杂性。

系统内部当然可以存在：

```text
真题
词汇
阅读
听力
Memory
Review
Evidence
AI Tutor
Scheduler
Skill
Obstacle
Validation
```

但这些属于系统能力。

不应该把系统内部复杂度重新暴露给用户。

用户主要面对的是：

> **此刻最值得完成的一个学习动作。**

Exam OS 之所以是 OS，来自三个统一。

---

## 2.1 一个统一目标

```text
考试目标
```

所有学习行为最终都服务于真实考试目标。

单词、阅读、听力、复习、记忆、真题都不是彼此独立的产品。

它们只是考试目标下可以被系统调用的学习能力。

---

## 2.2 一套统一 Learning State

系统持续理解：

```text
用户接触过什么
用户刚刚做了什么
哪里存在真实失败
哪里只是可能存在障碍
什么只是刚刚理解
什么是在帮助下完成
什么已经能够无帮助完成
什么已经出现 Transfer Evidence
什么需要重新 Retrieval
什么目前 Evidence 不足
```

因此不同学习模块不能各自拥有一套互相矛盾的用户状态。

---

## 2.3 一个统一 Decision Engine

Decision Engine 根据：

```text
考试目标
当前可用时间
Current Content
Current Action
历史行为
Recent Evidence
Obstacle Hypotheses
Memory State
Scaffold History
Available Content
User Context
```

持续决定：

```text
现在学什么
现在做什么
是否需要 Probe
是否需要 Intervention
选择什么 Intervention
需要多强的 Scaffold
什么时候撤掉 Scaffold
是否应该 Validation
是否需要 Transfer
是否需要 Retrieval
是否应该直接 Continue
```

这就是 Exam OS 与：

> “把很多学习功能放进一个 APP”

之间的根本区别。

---

# 第三部分｜Learning V2 产品宪法

## C01 — AI 有决策能力，用户有选择权

AI 必须真正承担学习决策。

如果用户最终仍然每天自己选择：

```text
背词
做题
听力
阅读
复习
错题
```

那么 Exam OS 就失去了最重要的产品价值。

AI 可以决定：

```text
当前最值得学什么
选择哪个 Content
选择哪个 Skill Target
是否需要 Probe
选择哪种 Intervention
选择什么 Scaffold
是否撤掉 Scaffold
是否需要 Validation
是否需要 Transfer
是否需要 Retrieval
下一项是什么
```

与此同时，用户始终可以：

```text
跳过
暂停
退出
重新尝试
要求解释
更换方式
拒绝当前建议
继续当前任务
```

因此：

> **AI 有决策能力，用户有选择权。**

用户 Override 是合法的用户行为。

它本身也可以成为 Behavioral Evidence。

用户没有按照 AI Decision 行动，不等于：

> 用户操作错误。

---

## C02 — AI = Partner

Exam OS 中 AI 的身份是：

> **Learning Partner。**

它持续理解：

```text
用户正在做什么
用户刚刚发生了什么
当前 Evidence 能说明什么
哪里可能存在 Obstacle
需要什么帮助
下一步什么最值得做
```

AI 不应该退化成：

```text
聊天机器人
知识百科
题目解释器
命令执行器
每一道题都强行说很多话的老师
```

Partner 的价值不是占据用户注意力。

而是在合适的时候做正确的事情。

---

## C03 — Rule / Fact / AI Intelligence 分层

Exam OS 必须区分三类东西。

### Rule

确定性的产品规则和系统边界。

例如：

```text
一次错误不能直接建立稳定诊断
Reveal 不能等于 Mastered
CET recurrence 必须来自真实 CET
Generated Content 不能冒充 CET_REAL
Evidence 不足时 UNKNOWN 合法
```

### Fact

数据库事实和可信 Source Fact。

例如：

```text
用户刚才选择了 B
这一题真实答案是 C
某句英语真实出现在 CET 原文
用户用了 S2 Scaffold
```

### AI Intelligence

LLM 可以负责：

```text
语言理解
软判断
Obstacle Hypothesis
教学表达
解释
Paraphrase Candidate
Intervention wording
候选关系发现
```

但：

```text
AI Inference ≠ Fact
```

LLM 不能把自己的判断写成 Content Truth。

---

## C04 — Content 聚焦，Interaction 多样

Choice、Drag、Audio、Highlight、Chat、Tap、Swipe、Reorder 等都可以存在。

但它们只是：

```text
Interaction Carrier
```

Learning Core 不能依赖某一种 Card。

也不能因为某种 Card 已经开发出来，就要求所有学习内容都经过这张 Card。

---

## C05 — User Action First

默认学习逻辑：

```text
Content
→ User Action
→ Evidence
→ Obstacle
→ Intervention
```

系统优先观察真实行为。

没有必要 Evidence 时，不默认进行深度教学和过度诊断。

---

## C06 — ReadingBreakdown 只是 Support

ReadingBreakdown 不是阅读主流程。

它只在真实障碍需要时提供局部支持。

它可以处理：

```text
main clause
clause relation
logic
context meaning
reference
```

原则是：

> **Minimum Necessary Local Support。**

不能默认把整篇 Passage 做逐句精讲。

---

## C07 — 正式英语内容保持 CET 真实性

正式高风险学习和 Validation 优先使用真实 CET。

Content Source 必须区分：

```text
CET_REAL
TRUSTED_TEACHING
GENERATED
```

GENERATED 可以用于教学支架。

但不能冒充：

```text
CET_REAL
```

---

## C08 — Frequency 与 CET Recurrence 分离

高频词表可以参与教学排序。

但不能增加：

```text
CET recurrence
```

真实 CET recurrence 只能由真实 CET occurrence 建立。

---

## C09 — Language Learning 主线

语言学习优先保持：

```text
真实 CET Context
→ 当前场景理解
→ Meaning
→ Memory Support
→ 回真实任务
→ Validation
```

系统不是先建立一个巨大的脱离真题的语言知识库，再让用户以后使用。

而是尽量围绕真实语言行为学习。

---

## C10 — Memory Hook ≠ Etymology

AI 可以生成：

```text
语义联想
画面
对比
micro-story
声音联想
word-part cue
```

这些都可以帮助记忆。

但 AI 自己创造的记忆线索不能被描述成真实：

```text
词源
语言学历史
官方构词来源
```

---

## C11 — Error 不能形成学习墙

用户错误之后，目标不是不断阻止用户继续。

基本思想：

```text
Wrong
→ 必要 Probe / Support
→ Retry / Reveal
→ Return
→ Continue
→ 后续 Validation
```

错误应该成为 Evidence。

不是惩罚。

---

## C12 — Low Confidence 不做过度诊断

一次错误不能证明稳定能力缺陷。

没有足够 Evidence 时：

```text
UNKNOWN
```

是合法状态。

Obstacle 可以保持：

```text
Hypothesis
```

而不是强行给用户贴标签。

---

## C13 — 时间必须是真实 elapsed time

不能伪造：

```text
学习时间
专注时间
节省时间
```

所有可见时间指标必须来自真实记录。

---

## C14 — Gamefeel 来自动作和反馈

学习体验的即时感来自：

```text
动作
反馈
Partner
视觉反馈
音频反馈
真实 progression
```

不是靠堆小游戏。

---

## C15 — Mobile Low Friction

一个 Learning Item 默认突出一个 Primary Action。

不要同时向用户暴露大量平级选择。

---

## C16 — 所有 Visible Metrics 必须有 Evidence

包括：

```text
能力
掌握度
准确率
进步
预测
时间
学习覆盖
复习状态
```

Evidence 不足：

```text
UNKNOWN
N/A
```

比假数字更正确。

---

## C17 — Single Authoritative Owner

每一个业务事实必须有唯一 authoritative owner。

不能在多个地方重复保存同一个事实，再猜哪一份最新。

---

## C18 — Rejected Route 不得复活

已经明确否决的 Learning Route：

不能换一个名字重新进入系统。

---

## C19 — Implementation Agent 无权修改 Frozen Principle

DeepSeek 或其他 Implementation Agent 遇到实现冲突：

必须提出：

```text
SPEC_CONFLICT
```

不能为了开发方便自行改变 Learning V2。

---

## C20 — Conflict Stop

产品规范与实现约束无法同时成立：

```text
STOP
→ SPEC_CONFLICT
→ 裁决
→ 再开发
```

---

## C21 — Runtime Validation

静态代码正确：

不等于产品成立。

Learning V2 最终必须经过真实：

```text
Runtime
Browser
User Flow
Persistence
Decision
```

验证。

---

# 第四部分｜人和 AI 到底各自决定什么

## 4.1 AI 的权力

AI 可以负责：

```text
现在最值得学什么
应该选择什么 Content
现在应该继续还是切换
是否需要 Probe
当前最可能的 Obstacle 是什么
是否可以在不确定 Diagnosis 下给予低风险帮助
应该使用哪种 Intervention
使用哪一级 Scaffold
什么时候撤掉 Scaffold
什么时候进行 Validation
什么时候做 Transfer
什么时候做 Retrieval
```

AI 的价值就是：

> **减少用户大量低价值学习决策。**

---

## 4.2 用户的权力

用户负责真实行动：

```text
回答
选择
操作
尝试
跳过
暂停
请求帮助
请求解释
拒绝 AI 建议
退出
```

用户不需要每天自己设计完整学习系统。

同时 AI 不能剥夺用户主动权。

---

## 4.3 Override

用户 Override 是合法行为。

例如用户：

```text
拒绝当前帮助
要求更详细解释
直接继续做题
跳过当前 Retrieval
```

这些行为都可以成为新的 Behavioral Evidence。

但系统不能把：

```text
AI Decision 被拒绝
```

等同于：

```text
用户做错了
```

---

## 4.4 Decision 与传统 Plan 的区别

Exam OS 核心术语是：

```text
Decision
```

而不是静态：

```text
Plan
```

传统 Plan 常见：

```text
今天背50个词
做2篇阅读
听20分钟听力
```

Exam OS Decision 则根据刚刚发生的 Evidence 动态改变。

例如：

原本准备继续做题。

用户出现真实 `READ_EVIDENCE_PARAPHRASE` Evidence。

系统可以即时决定：

```text
先处理这一障碍
→ Validation
→ 再继续
```

学习路径因此是动态的。

---

# 第五部分｜用户真正看到的 Learning Experience

## 5.1 打开 Exam OS

系统利用已有信息：

```text
考试目标
剩余时间
当前 Learning State
Recent Evidence
Pending Validation
Memory Retrieval Need
Available Content
```

产生当前 Decision。

首页的核心价值是：

> **告诉用户现在做什么。**

用户不需要首先选择：

```text
单词 Tab
阅读 Tab
听力 Tab
错题 Tab
AI Tab
```

---

## 5.2 First Session

第一次使用不能先完成大型问卷。

只收集当前 Decision 真正需要的最低信息。

例如：

```text
考试目标
可投入时间
必要 Accessibility / Modality Preference
```

然后尽快进入真实学习行为。

First Session 的核心目标之一：

> **尽快获得真实 Evidence。**

系统不应长期依赖用户自述来猜能力。

---

## 5.3 一次完整 Learning Session

正常 Learning Session 的基本秩序：

```text
System Decision
↓
Real Content
↓
User Attempt
↓
Behavioral Evidence
↓
判断是否存在真实阻碍
↓
必要时 Probe
↓
Obstacle Hypothesis
↓
Minimum Intervention
↓
Return to Original Task
↓
Validation
↓
必要时 Transfer / Retrieval
↓
Evidence Record
↓
Next Decision
```

这不是固定流水线。

系统只执行当前必要步骤。

---

## 5.4 CONTINUE 是正式学习动作

用户已经能够继续真实任务：

系统应该：

```text
CONTINUE
```

AI 不能为了证明自己“很智能”而不断插入教学。

学习动作越多不等于学习越好。

---

## 5.5 AI 什么时候应该解释自己的 Decision

AI 不需要为每一个 Decision 都展示一段理由。

否则 Exam OS 会重新退化成：

> 每一步都讲话的 Chatbot。

AI 理由适合在这些场景显式展示：

```text
用户主动询问
当前教学本身需要解释
当前 Decision 明显违背用户直觉
```

例如用户想继续背词，系统决定先 Retrieval。

此时可以解释：

> 这个词刚刚只是即时正确，现在需要换一个情境确认是否还能提取。

解释是帮助理解 Decision。

不是所有 Decision 的默认 UI。

---

## 5.6 Positive Feedback

正反馈必须来自真实获得。

可以告诉用户：

```text
刚刚独立完成了什么
刚刚跨过了什么真实障碍
今天完成了多少真实任务
哪些内容从 Assisted → Unassisted
哪些内容出现了新的 Transfer Evidence
哪些能力获得了新的真实 Evidence
```

禁止为了激励用户制造：

```text
Fake Mastery
Fake Progress
Fake Score
Fake Saved Time
```

Exam OS 的正反馈来自：

> **真实 Learning Evidence。**

---

# 第六部分｜Learning V2 唯一核心循环

## 6.1 Canonical Learning Core

Learning V2 唯一核心循环：

```text
Content
→ User Action
→ Behavioral Evidence
→ Obstacle Hypothesis
→ Minimum Probe
→ Intervention
→ Return to Original Task
→ Validation
→ Transfer / Retrieval
→ Evidence Record
→ Next Best Action
```

最短表达：

> **内容 → 行为 → 障碍 → 干预 → 验证 → 记忆**

所有 Learning Feature 必须回答：

> 它在这条链里解决什么问题？

无法回答：

就不能仅仅因为“像学习产品”而进入 Learning Core。

---

# 第七部分｜五个最基本 Learning Objects

## 7.1 Skill

Skill 表示长期发展的能力维度。

例如：

```text
阅读证据匹配能力
语境词义能力
阅读推断能力
听觉识别能力
```

---

## 7.2 Obstacle

Obstacle 表示：

> 当前用户为什么无法顺利完成这个任务。

Obstacle 是当前问题。

---

## 7.3 Evidence

Evidence 表示：

> 用户真正发生过的行为。

例如：

```text
用户选择了什么
是否正确
用了多少 Scaffold
是否查看提示
是否可以无提示完成
是否在不同 Context 再次成功
是否跨 Session 再次成功
```

---

## 7.4 Intervention

Intervention 表示：

> 为跨过当前障碍而提供的帮助。

---

## 7.5 Validation

Validation 回答：

> 帮助结束以后，用户现在自己能不能完成？

因此：

```text
Skill ≠ Obstacle
Obstacle ≠ Evidence
Evidence ≠ Intervention
Intervention ≠ Validation
```

这是 Learning V2 的基础边界。

---

# 第八部分｜Reading Obstacle

## 8.1 Canonical Reading Obstacles

```text
READ_BASE_LANGUAGE
READ_CONTEXT_MEANING
READ_SENTENCE_RELATION
READ_LOCAL_INTEGRATION
READ_EVIDENCE_PARAPHRASE
READ_DISTRACTOR
READ_INFERENCE
READ_GLOBAL
```

### READ_BASE_LANGUAGE

基础词汇或语法不足以支持理解。

### READ_CONTEXT_MEANING

认识词，但无法判断它在当前 Context 中的 Meaning。

### READ_SENTENCE_RELATION

局部词基本认识，但句内/句间逻辑没有建立。

### READ_LOCAL_INTEGRATION

无法把附近多个信息组合成一个完整意思。

### READ_EVIDENCE_PARAPHRASE

无法建立：

```text
原文表达
↔
题干 / 选项表达
```

的证据映射。

### READ_DISTRACTOR

基本理解文章，但无法判断干扰项为什么错。

### READ_INFERENCE

无法根据真实 Evidence 进行合理必要推导。

### READ_GLOBAL

主旨、结构、作者态度或整体关系存在困难。

---

## 8.2 Skill 与 Obstacle 禁止混 Namespace

例如：

```text
READ_EVIDENCE_PARAPHRASE
```

表示当前 Obstacle。

不能直接等价成长期 Skill State。

---

# 第九部分｜Diagnosis 与 Minimum Probe

## 9.1 Diagnosis Evidence Priority

主要依据：

```text
Behavior
>
Task Result
>
Probe
>
Self-report
```

Self-report 是辅助 Evidence。

---

## 9.2 一次错误不建立稳定诊断

用户答错一道题：

首先只能说明：

> 当前任务失败。

不能马上写：

```text
用户不会推断
用户阅读差
用户词汇差
```

---

## 9.3 ObstacleHypothesis

Obstacle 首先可以以 Hypothesis 存在。

概念上至少需要表达：

```text
ObstacleHypothesis {
  code
  confidence
  supporting_evidence_ids
  contradicting_evidence_ids
  scope
  status
}
```

目的不是为了堆字段。

而是确保系统能够回答：

```text
为什么产生这个判断
哪些 Evidence 支持
有没有相反 Evidence
当前 Confidence 是多少
这个判断针对什么 Scope
这个判断现在处于什么状态
```

Evidence 不足时：

继续保持 Hypothesis。

---

## 9.4 Minimum Probe

Probe 的目的不是增加考试量。

而是：

> **使用最小额外行为，区分当前几个合理的 Obstacle Candidate。**

例如用户一道阅读题答错。

可能原因：

```text
不认识关键词
```

也可能：

```text
理解原文
但没有识别题干和原文 Paraphrase
```

此时系统可以先提供一个非常小的动作：

> 这里的表达更接近 A 还是 B？

通过新的行为 Evidence 再决定是否需要 Intervention。

---

# 第十部分｜Scaffold 与 Intervention

## 10.1 Scaffold Levels

```text
S0 — No Scaffold
S1 — Light Hint
S2 — Local Evidence
S3 — Explanation
S4 — Deep Support
S5 — Reveal
```

---

## 10.2 Scaffold 不机械升级

不存在固定：

```text
S0
→ S1
→ S2
→ S3
→ S4
→ S5
```

Decision Engine 应选择：

> **当前最低必要 Scaffold。**

---

## 10.3 Intervention Policy

Intervention 优先满足：

```text
Minimum
Local
Relevant
Withdrawable
Validatable
```

---

## 10.4 典型 Intervention

包括：

```text
Context Meaning Hint
Local Evidence Highlight
Sentence Relation Explanation
Paraphrase Mapping
Distractor Contrast
Inference Bridge
Global Structure Support
Audio Replay / Segment
Memory Hook
```

---

## 10.5 Teaching Under Uncertainty

Diagnosis 尚不稳定时：

允许进行低风险教学。

但不能：

```text
低 Confidence Obstacle
→ 永久用户标签
```

---

## 10.6 Intervention Event

系统需要在语义上能够记录：

> 系统到底对用户做过什么帮助。

Canonical Concept：

```text
InterventionEvent {
  intervention_id
  user_id
  content_id
  semantic_type
  scaffold_level
  source
  trigger_evidence_ids
  occurred_at
}
```

它不代表必须新增一张数据库表。

真正重要的边界是：

```text
Intervention occurred
≠
Intervention worked
```

Intervention 是否有效：

必须由后续 Validation Evidence 判断。

---

# 第十一部分｜Intervention 后必须回到真实任务

## 11.1 Return to Original Task

Teaching 不是终点。

Intervention 后应尽可能：

> 回到用户刚才真正失败的任务。

基本过程：

```text
Failure
→ Intervention
→ Scaffold Withdrawal
→ Original Task
```

系统最终关心的不是：

> 用户有没有看过解释。

而是：

> 用户撤掉帮助以后是否能够自己完成。

---

## 11.2 Reveal 不是完成

S5 Reveal 后：

```text
PENDING_VALIDATION
```

不能：

```text
Reveal
→ MASTERED
```

看见答案不等于学会。

---

# 第十二部分｜Learning State

Canonical Learning State：

```text
Encountered
Recognized
Understood
Assisted Success
Immediate Unassisted
Transfer Success
Delayed Retrieval Success
Retention Evidence
```

这些状态表示：

> Evidence 支持程度逐步增强。

并不是要求每个知识点机械经历所有状态。

同时：

```text
PENDING_VALIDATION
```

用于表示：

> 已经发生了足够强的 Support / Reveal，但真实独立能力尚未验证。

---

# 第十三部分｜Evidence Strength

## 13.1 Strong Positive Evidence

强正 Evidence 优先来自：

```text
Delayed
+
Unscaffolded
+
Different / New Context
+
Correct
```

---

## 13.2 Medium Positive Evidence

例如：

```text
Unscaffolded
+
Same Context
+
Correct
```

---

## 13.3 Weak Positive Evidence

例如：

```text
Immediate
Hinted
Assisted
Recognition
```

这些主要证明：

> 当前理解或辅助成功。

不能证明稳定 Retention。

---

## 13.4 Strong Negative Evidence

用户之前已经出现可靠：

```text
Unscaffolded Success
```

之后真正：

```text
Delayed Retrieval
```

失败。

这是较强负 Evidence。

---

## 13.5 Weak Negative Evidence

第一次面对陌生内容失败：

只是弱负 Evidence。

不能过度解释。

---

# 第十四部分｜Validation

## 14.1 Immediate Comprehension ≠ Mastery

用户说：

> 懂了。

或者刚看完解释答对：

主要证明即时理解。

不能直接变成长期掌握。

---

## 14.2 Validation Type

Validation 需要区分验证的目标。

当前正式类型：

```text
COMPREHENSION
IMMEDIATE_UNASSISTED
DEFERRED_RETRIEVAL
CROSS_SESSION_RETRIEVAL
TRANSFER
DELAYED_RETENTION
```

---

## 14.3 Validation Timing

同时还要区分时间关系：

```text
IMMEDIATE
DEFERRED
CROSS_SESSION
DELAYED_RETENTION
```

Validation Type 与 Validation Timing：

不是一件事。

一个验证既有：

> 验证什么。

也有：

> 什么时候验证。

---

## 14.4 IMMEDIATE

Intervention 后附近的即时验证。

---

## 14.5 DEFERRED

同一个 Session 中经过其他真实内容以后重新验证。

---

## 14.6 CROSS_SESSION

进入另一个 Learning Session 后再次验证。

---

## 14.7 DELAYED_RETENTION

满足有意义的延迟条件以后：

进行无提示 Retrieval。

---

## 14.8 Cross Session ≠ Delayed Retention

仅仅：

> 换了一个 Session。

不能自动证明长期记住。

---

# 第十五部分｜Recognition / Retrieval / Transfer

## 15.1 Recognition ≠ Retrieval

用户看到答案能够认出来：

不等于：

> 没有答案时能够主动提取。

因此：

```text
Recognition ≠ Retrieval
```

---

## 15.2 Transfer

Transfer 应尽量来自：

```text
Different Item
或
Different Context
```

刚刚被完整解释的同一句重新答对：

不是 Transfer。

---

# 第十六部分｜Memory

## 16.1 MemoryTarget

MemoryTarget 必须是能够：

```text
独立提取
独立遗忘
独立验证
```

的学习单元。

例如：

```text
LEXICAL_ITEM
PHRASE_CHUNK
PARAPHRASE_RELATION
AUDITORY_FORM
OTHER_RETRIEVABLE_UNIT
```

---

## 16.2 默认不能直接作为 MemoryTarget

```text
整篇 Passage
Obstacle
抽象 Skill
```

默认不应该直接作为 MemoryTarget。

---

## 16.3 MemoryState

MemoryState 可以从 Evidence 推导：

```text
visual_strength
auditory_strength
meaning_strength
form_meaning_strength
transfer_evidence
delayed_retrieval_evidence
last_scaffold_level
confidence
```

MemoryState 是：

```text
Derived State
```

不能覆盖 Raw Evidence。

---

# 第十七部分｜Review Scheduler

## 17.1 三方职责

```text
Scheduler
→ WHEN

Decision Agent
→ WHAT / WHERE / MODALITY

Intervention Engine
→ HOW
```

这三个职责不能混成同一个不可解释黑盒。

---

## 17.2 Review Priority

当前允许相对 Priority：

```text
VERY_SOON
SOON
NORMAL
LATER
```

---

## 17.3 不制造固定“科学周期”

没有 Exam OS 自己真实用户校准之前：

不把：

```text
2小时
1天
3天
7天
```

等固定间隔写成产品真理。

其他记忆算法也一样。

未经真实校准的参数：

只能是 Model Candidate。

不能作为系统事实。

---

# 第十八部分｜AI Decision Engine

## 18.1 Decision Engine 是产品核心

AI 核心价值不是：

```text
聊天
生成内容
生成固定计划
```

而是：

> **持续选择 Next Best Learning Action。**

---

## 18.2 Decision Input

Canonical Input：

```ts
LearningDecisionInput {
  session
  current_content
  current_action
  recent_evidence
  obstacle_hypotheses
  memory_state
  scaffold_history
  available_content
  user_context
}
```

其中 `user_context` 可以承载当前 Decision 真正需要的：

```text
考试目标
可用时间
用户状态
Accessibility
必要 Preference
```

缺失信息：

```text
UNKNOWN
```

---

## 18.3 Decision Output

Canonical Output：

```ts
NextLearningAction {
  action_type
  target_id
  skill
  obstacle_candidate
  obstacle_confidence
  modality
  scaffold
  reason
  validation_goal
  memory_intent
  content_source
  expected_evidence
}
```

这里表达的是：

> Decision Engine 在语义上需要能够说明什么。

不意味着所有字段必须直接暴露给用户，也不等于现有数据库必须一比一建列。

---

## 18.4 Canonical Action Type

```text
ATTEMPT
PROBE
INTERVENE
VALIDATE
TRANSFER
RETRIEVE
CONTINUE
```

这些是：

```text
Learning Action
```

不是：

```text
Card Type
```

---

## 18.5 Decision Priority

当前基本价值顺序：

```text
unfinished real task
↓
failure evidence
↓
probe / minimum intervention
↓
comprehension
↓
scaffold withdrawal
↓
unassisted original-task validation
↓
transfer
↓
retrieval
↓
continue
```

它不是固定 State Machine。

---

## 18.6 默认 Attempt

第一次真实 Attempt 默认：

```text
S0
```

除非：

```text
用户主动要求帮助
Accessibility 需要
历史强 Evidence 明确支持预先 Scaffold
```

---

## 18.7 CONTINUE

用户已经能够继续：

系统应 Continue。

不能把不必要的教学当作智能。

---

# 第十九部分｜Canonical Evidence Event

`learning_record` 的核心职责是 Raw Event Ledger。

Canonical Evidence Event 需要在语义上能够表达：

```text
EvidenceEvent {
  evidence_id
  user_id
  session_id

  content_id
  item_id

  event_type
  result

  scaffold_level
  assistance_type

  evidence_source
  content_source
  modality
  context_relation
  retrieval_timing

  response_latency_ms
  elapsed_time_ms

  attempt_index
  previous_exposure

  answer_payload

  occurred_at

  trigger_id
  intervention_id
}
```

核心不是“字段越多越好”。

而是不能把：

```text
完全无提示独立正确
```

和：

```text
看完答案以后正确
```

存成同一种 Evidence。

否则 Learning V2 无法判断真实学习状态。

Canonical `event_type`：

```text
ATTEMPT
PROBE_RESPONSE
INTERVENTION_RESPONSE
VALIDATION_RESPONSE
RETRIEVAL_RESPONSE
```

Legacy：

```text
CHECK
card_type
```

不能重新成为 Learning Semantic Core。

---

# 第二十部分｜Vocabulary Learning

## 20.1 单词不是孤立词表入口

基本路径：

```text
真实 CET Context
→ 当前 Context Meaning
→ User Attempt
→ Minimum Support
→ Meaning Verification
→ Memory Hook
→ Return to CET Context
→ Later Retrieval
```

---

## 20.2 Meaning 是 Context Meaning

一个词存在多个词典义时：

Learning Target 优先：

> 它在当前真实 CET 句子中的意思。

不能机械使用词典第一义。

---

## 20.3 Memory Hook

可以使用：

```text
语义联想
对比
画面
micro-story
声音联想
word-part cue
```

但必须保持：

```text
Memory Hook ≠ Etymology
```

---

# 第二十一部分｜Reading Paraphrase

## 21.1 Paraphrase 是一等 Learning Object

CET Reading 的一个高价值学习障碍是：

> 用户认识题干和原文大部分单词，却看不出来它们表达的是同一个信息。

因此：

```text
READ_EVIDENCE_PARAPHRASE
```

是正式 Obstacle。

---

## 21.2 Paraphrase Scope

真实 P4 已证明至少要支持：

```text
WORD
PHRASE
CLAUSE
SENTENCE
PROPOSITION
```

例如：

```text
experienced
↔
seasoned
```

可以是较局部 Relation。

而：

```text
make a difference
↔
helps midcareer individuals find a new job
```

只能在特定 Context 成立。

它属于：

```text
PROPOSITION
```

不能写成全局词典同义。

---

## 21.3 CET Paraphrase 不是同义词词典

CET 中大量存在：

```text
结构变化
语态变化
词性变化
信息压缩
信息展开
整句重写
上下文概括
```

所以 P4 不能退化成：

```text
word A = word B
```

---

# 第二十二部分｜Atomic + Composite Relation

## SPEC-P4-001 — Scope

Paraphrase 必须保留：

```text
relation_scope
```

至少支持：

```text
WORD
PHRASE
CLAUSE
SENTENCE
PROPOSITION
```

---

## SPEC-P4-002 — Atomic + Composite

必须同时支持：

```text
ATOMIC_RELATION
+
COMPOSITE_RELATION
```

例如真实 CET：

```text
Many employers regard
the phone interview
as the first step
of the official recruiting process.

↕

Many companies treat
phone screening
as the official first round
of the hiring process.
```

可以分解出：

```text
employers ↔ companies
regard X as ↔ treat X as
phone interview ↔ phone screening
first step ↔ first round
recruiting process ↔ hiring process
```

但必须同时保存：

> 整句 Composite Relation。

因为用户真正需要识别的是整句意义转换。

---

# 第二十三部分｜Multiple Evidence Spans

## SPEC-P4-003

一个 Question 可以由：

```text
1..N EvidenceSpan
```

共同支撑。

真实 CET 已经出现：

一个题干结论来自原段多个句子。

因此禁止把模型简化成：

```text
question.evidence_sentence: string
```

正式关系：

```text
Question
→ 1..N EvidenceSpan
```

---

# 第二十四部分｜Context Preservation

## SPEC-P4-004

Paraphrase Relation 概念上至少需要保存：

```text
source_expression
target_expression
scope
context_id
question_id
source_span_ids
provenance
```

目的不是堆 Schema。

而是防止：

```text
当前文章里成立的关系
```

被错误升级成：

```text
全英语通用同义关系
```

---

# 第二十五部分｜Distractor

Distractor 是正式 Analysis Object。

当前已经形成的候选分析类型：

```text
OUT_OF_SCOPE
PARTIAL_MATCH
ABSOLUTE_OVERSTATEMENT
CAUSE_EFFECT_REVERSAL
SUBJECT_SWAP
TIME_SCOPE_ERROR
UNSUPPORTED_INFERENCE
```

这些属于：

```text
Analysis Layer
```

不是：

```text
CET Source Fact
```

AI 或编辑分析出来的 Distractor Pattern：

必须保持自己的 provenance。

---

# 第二十六部分｜Audio Learning

## 26.1 Visual Evidence ≠ Auditory Evidence

用户看见：

```text
beneficial
```

认识它。

不能证明：

> 在连续语流中听见它也能识别。

因此：

```text
Visual Evidence
≠
Auditory Evidence
```

---

## 26.2 Audio Intervention

可以根据 Evidence 使用：

```text
Replay
Segment
Slower Playback
Caption
Partial Transcript
Sound Contrast
```

这些都是 Intervention。

没有一个是所有用户都必须经历的固定流程。

---

## 26.3 Caption-Assisted Success

用户依赖 Caption 才成功：

应该属于：

```text
Assisted Success
```

不能直接写成：

```text
Auditory Mastery
```

---

## 26.4 Stronger Auditory Evidence

较强 Auditory Evidence 应尽量来自：

```text
Unscaffolded
+
有效听觉 Context
+
Different Voice / Context
+
Correct
```

不把它机械做成硬公式。

它表达的是 Evidence Strength 原则。

---

## 26.5 禁止固定 Audio Routine

不能把以下内容写成 Exam OS 永久规则：

```text
必须听两遍
固定 450ms Pause
必须 Shadowing
固定 Caption Withdrawal Sequence
```

Decision 根据用户当前 Evidence 选择。

---

# 第二十七部分｜Active Reconstruction

用户不能长期只接受解释。

理解以后，可以进行主动重构：

```text
reorder phrase
reconstruct sentence
select paraphrase
recall meaning
locate evidence
short answer
```

目标：

```text
Recognition
→ Retrieval
```

然后尽可能回到真实 CET 任务验证。

---

# 第二十八部分｜Choice / Breakdown / Chunk

在适合场景可以：

```text
Choice
→ Breakdown
→ Chunk Reconstruction
→ Return to CET
```

### Choice

深度教学前先获得最小理解 Evidence。

### Breakdown

处理当前真实语言障碍。

### Chunk

理解后主动重构。

但这只是候选 Micro-sequence。

旧版固定：

```text
Choice
→ Breakdown
→ Reorder
```

作为全局流程：

正式废弃。

---

# 第二十九部分｜CET Content Truth

## 29.1 Content Source

```text
CET_REAL
TRUSTED_TEACHING
GENERATED
```

---

## 29.2 High-Risk Validation

高风险正式 Validation：

优先：

```text
CET_REAL
```

GENERATED 可以帮助学习。

但不能制造：

```text
CET frequency
CET recurrence
SOURCE_VERIFIED answer
SOURCE_VERIFIED paraphrase
```

---

# 第三十部分｜P4 CET Evidence Contract

## 30.1 P4 的真实目标

P4 不是普通四六级词表。

P4 要形成真实 CET Evidence Network：

```text
Exam
→ Set
→ Section
→ Passage
→ Question
→ Correct Answer
→ Evidence Span
→ Paraphrase Relation
→ Distractor Pattern
→ Lexical Occurrence
→ Skill Mapping
→ Provenance
→ Cross-year Recurrence
```

P4 的价值之一：

> 使用真实 CET 数据验证 Learning V2 后半部分是否真的能够承载考试事实和考试关系。

P4 可以补强：

```text
CET Evidence
Paraphrase
Provenance
Recurrence
Data Contract
```

但不能重新发明：

```text
Exam OS 产品定义
AI / Human Boundary
Learning Core
Evidence Learning Philosophy
```

---

# 第三十一部分｜Canonical CET Content Objects

## 31.1 CETExam

概念责任：

```text
CETExam {
  exam_id
  level
  date
  set
  source_quality
  source_ref
}
```

---

## 31.2 CETPassage

```text
CETPassage {
  passage_id
  exam_id
  section
  type
  title
  original_text
  transcript
  audio_ref
}
```

Derived Annotation：

不能覆盖 Raw Source Text。

---

## 31.3 CETQuestion

```text
CETQuestion {
  question_id
  passage_id
  number
  text
  options
  correct_answer
  answer_provenance
  source_locator
}
```

---

## 31.4 CETEvidenceSpan

```text
CETEvidenceSpan {
  evidence_span_id
  question_id
  passage_id
  source_text
  relation
  provenance
  confidence
  source_locator
}
```

一个 Question：

允许关联多个 EvidenceSpan。

---

## 31.5 CETLexicalOccurrence

```text
CETLexicalOccurrence {
  lexical_item
  exam_id
  passage_id
  question_id
  original_sentence
  role
  meaning_in_context
  source_locator
}
```

---

## 31.6 ParaphraseRelation

概念上至少表达：

```text
source_expression
target_expression
scope
context_id
question_id
source_span_ids
provenance
relation_type
```

---

# 第三十二部分｜Source Quality 与 Provenance

## 32.1 Source Quality

正式状态：

```text
FULL
PARTIAL_HIGH
PARTIAL
```

加工审查阶段允许：

```text
FULL_CANDIDATE
```

等待完整性检查。

文件名不能自动证明：

```text
FULL
```

---

## 32.2 不使用万能 Confidence

至少独立保存：

```text
source_quality
source_text_status
relation_status
recurrence_status
```

因为这些回答的是不同问题。

---

## 32.3 Raw CET Source 是内容事实最高真源

权威关系：

```text
Raw CET Source
>
Derived Ledger
Editorial Analysis
AI Analysis
```

加工 Ledger 只是项目工作状态。

不能覆盖考试原文。

---

## 32.4 Source Text 与 Relation 分离

原文确实存在：

可以：

```text
source_text_status = SOURCE_VERIFIED
```

但某种：

```text
A ↔ B
```

Paraphrase 关系是编辑或 AI 分析得出时：

Relation 仍然只能保持：

```text
EDITORIAL_CANDIDATE
AI_CANDIDATE
```

不能因为 Source Text Verified：

自动让 Relation Verified。

---

## 32.5 Answer Provenance

```text
SOURCE_VERIFIED
EDITORIAL_CANDIDATE
AI_CANDIDATE
UNKNOWN
```

---

## 32.6 Evidence Relation

```text
DIRECT_SUPPORT
PARAPHRASE_SUPPORT
INFERENCE_SUPPORT
```

---

## 32.7 Paraphrase Provenance

```text
CET_DIRECT
EDITORIAL
AI_CANDIDATE
```

核心原则：

> 原文真实性、答案真实性、证据关系、Paraphrase 分析必须分别管理。

不能全部压成一个：

```text
confidence = 0.9
```

---

# 第三十三部分｜CET Recurrence

## 33.1 真题复现必须真实发生

建立：

```text
SOURCE_VERIFIED recurrence
```

必须至少存在：

```text
真实 CET Occurrence A
+
真实 CET Occurrence B
```

并且两者分别经过 Source Verification。

---

## 33.2 以下不能增加真实 Recurrence

```text
词汇书
高频表
AI General Knowledge
Editorial “高频词”
同一 Source 的多个复制文件
```

这些可以形成教学参考。

不能形成 CET 历史事实。

---

# 第三十四部分｜Learning Data 四层

## L1 — Raw Evidence

用户真正发生的学习行为。

---

## L2 — Inferred Learning State

从 Raw Evidence 派生：

```text
Obstacle Hypothesis
Skill State
Memory State
```

---

## L3 — Decision

系统基于：

```text
L1
+
L2
+
L4
```

产生 Next Learning Action。

---

## L4 — Content Truth

例如：

```text
CET 原文
Question
Correct Answer
真实 occurrence
```

LLM Inference 不能变成 L4。

---

# 第三十五部分｜五张 Core Table

当前冻结：

```text
user_profile
content_library
content_skill
learning_record
ability_history
```

---

## 35.1 user_profile

保存：

```text
稳定用户事实
考试目标
必要设置
高层 Profile
```

不能因为一次错误：

写入长期负面标签。

---

## 35.2 content_library

负责：

```text
Content Truth
可识别 Content Entity
```

---

## 35.3 content_skill

负责：

```text
Content ↔ Skill Mapping
```

---

## 35.4 learning_record

负责：

```text
Raw Learning Event Ledger
```

---

## 35.5 ability_history

负责：

```text
Derived Skill / Ability Aggregate History
```

---

# 第三十六部分｜Memory 与 Ability 数据边界

例如：

> `pay off` 这个表达记住了吗？

这是：

```text
Memory Question
```

不是：

```text
Global Reading Ability
```

因此：

```text
MemoryState
≠
ability_history
```

MemoryState 优先从：

```text
learning_record
```

Raw Evidence 派生。

---

# 第三十七部分｜Obstacle 数据边界

Obstacle 是：

```text
runtime derived
session transient
derived state
```

均可能。

但它不能为了保存方便：

被塞进 Skill Namespace。

```text
Obstacle
≠
Skill
```

必须长期保持。

---

# 第三十八部分｜CET Auxiliary Graph

五张 Core Table：

不代表数据库永远只能存在五张表。

P4 已真实发现：

```text
Question → Multiple EvidenceSpan
Composite → Atomic Relations
Relation → Context
Independent Provenance
```

这些结构未来可能需要：

```text
Content Auxiliary Storage
```

但：

> 当前没有自动授权新的 Core Table。

---

## 38.1 Physical Mapping

DeepSeek 处理 Canonical Object 时：

只允许三种正式结果：

```text
A — REUSE
B — MINIMAL_EXTENSION
C — SPEC_CONFLICT
```

---

## 38.2 禁止为了逃避 Conflict 做语义滥用

禁止：

```text
随意复用错误字段
复杂关系塞进字符串
用 opaque JSON 掩盖独立 lifecycle
偷偷改变现有字段语义
自行增加 Core Table
```

---

## 38.3 SPEC_CONFLICT_CET_EVIDENCE_GRAPH

现有结构无法安全承载 P4 Evidence Graph：

DeepSeek 必须提出：

```text
SPEC_CONFLICT_CET_EVIDENCE_GRAPH
```

并提供至少这些裁决证据：

```text
实际 query patterns
关系 cardinality
provenance lifecycle
JSONB / 当前结构的具体缺陷
migration cost
```

之后才决定：

是否批准 normalized Content Auxiliary Storage。

Implementation Agent 不能自行批准。

---

# 第三十九部分｜Data Integrity

## 39.1 Raw Evidence 不可伪造

真实 Learning Event 写入以后：

不能为了 AI 推断方便覆盖历史。

Derived State 可以重算。

Raw Event 是 Evidence。

---

## 39.2 Persistence Failure 不推进 Learning State

如果一个真实 Learning Event 没有成功保存：

产品不能表现为：

```text
已完成
已掌握
已推进
```

基本产品语义：

```text
Persistence Failure
→ No Learning Advance
```

Retry 应针对同一个 logical operation。

具体数据库事务实现属于 Engineering Contract。

不在 Learning V2 内规定具体 RPC。

---

## 39.3 Decision 必须可审计

系统应该能够回答：

```text
做了什么 Decision
基于哪些 Evidence
当前 Obstacle Hypothesis 是什么
用户最终做了什么
发生了什么 Validation
```

可审计：

不是要求用户每一步看到这些内部信息。

而是系统不能成为完全不可追溯黑盒。

---

# 第四十部分｜Research Boundary

研究可以帮助：

> 确定设计边界和候选机制。

不能直接把实验参数变成 Exam OS 产品真理。

当前不能写死：

```text
450ms Pause
固定两遍听力
固定 Shadowing
固定 6 次 Exposure
固定 <20% Threshold
固定 2/4/6 次规则
固定复习周期
未经 CET 用户数据校准的 FSRS 参数
```

包括未来可能使用的记忆参数：

```text
D
S
R
```

在经过真实 Exam OS 用户数据验证以前：

只能视为：

```text
Model Candidate
```

不是 Truth。

---

# 第四十一部分｜LLM Boundary

LLM 可以：

```text
解释语言
建立软 Obstacle Hypothesis
生成 Intervention wording
提出 Paraphrase Candidate
生成教学支持
生成低风险 Memory Hook
提供 Decision Reason
```

LLM 不能：

```text
创造 CET Source Fact
创造真实 CET recurrence
伪造 SOURCE_VERIFIED Answer
把 UNKNOWN 填成确定事实
改变 Core Table Ownership
修改 Frozen Product Principle
绕过 Security / Data Integrity
```

---

# 第四十二部分｜Rejected V1 Routes

以下路线正式废弃：

```text
Fixed FIRST_SESSION
Fixed Choice → Breakdown → Reorder
ReadingBreakdown Default
Card as Business Core
Reorder as Mandatory Stage
Generic Fixed Audio Routine
Fake Contextual Vocabulary
Static CET Progression
Single-event Mastery
Fake Elapsed Time
Fake Progress Percentage
```

工程基础能力可以复用。

旧 Learning Logic：

不得复活。

---

# 第四十三部分｜完整 Learning Example

用户打开 Exam OS。

当前 Decision：

```text
ATTEMPT
→ 一道真实 CET Reading Item
```

用户第一次：

```text
S0
```

作答。

结果：

```text
WRONG
```

系统首先记录：

```text
ATTEMPT WRONG
```

但此刻不直接写：

```text
READ_INFERENCE
```

因为一次错误不足以证明 Obstacle。

系统认为当前合理 Candidate：

```text
READ_CONTEXT_MEANING
READ_EVIDENCE_PARAPHRASE
```

于是：

```text
PROBE
```

用户完成一个最小 Meaning / Evidence Probe。

新的行为显示：

> 用户能够理解原文基本意思，却无法把题干表达与原文 Evidence 对应。

于是：

```text
ObstacleHypothesis
= READ_EVIDENCE_PARAPHRASE
```

Confidence 上升。

系统决定：

```text
INTERVENE
S2
```

只展示局部相关 Evidence Span。

用户仍然失败。

随后：

```text
INTERVENE
S3
```

展示必要的 Paraphrase Mapping。

用户理解。

此刻可以得到：

```text
Understood
Assisted Success
```

但不能：

```text
Mastered
```

然后系统撤掉 Scaffold。

回到 Original Task。

用户独立正确：

```text
Immediate Unassisted
```

以后另一条真实 CET Item 出现同类表达变化。

用户无帮助完成：

```text
Transfer Success
```

新的 Session 中：

Scheduler 判断这个 MemoryTarget 需要 Retrieval。

用户无提示正确：

```text
CROSS_SESSION_RETRIEVAL Evidence
```

这仍然不自动意味着：

```text
DELAYED_RETENTION
```

满足真实延迟条件以后：

再次无提示 Retrieval 成功。

此时才获得更强：

```text
Retention Evidence
```

然后 Decision Engine 基于新的全部 Evidence：

决定下一步。

这就是 Learning V2。

---

# 第四十四部分｜Learning V2 Acceptance

Learning V2 正式 Runtime 至少必须证明：

1. 用户能够快速进入真实 Content。  
2. 用户不需要先手工选择大量学习模块。  
3. AI 能根据 Evidence 产生 Next Best Learning Action。  
4. AI 真正拥有学习决策能力。  
5. 用户始终拥有选择权。  
6. Override 不会被解释成用户操作错误。  
7. 用户真实行为可以成为 Evidence。  
8. 一次错误不能形成稳定 Diagnosis。  
9. Obstacle 与 Skill 分离。  
10. Evidence 与 Inference 分离。  
11. UNKNOWN 能够安全存在。  
12. 系统能够执行 Minimum Probe。  
13. 系统能够选择 Minimum Intervention。  
14. S0–S5 Scaffold 可以根据需要选择。  
15. Scaffold 不机械逐级执行。  
16. Intervention 可以撤除。  
17. Intervention 后能够回到 Original Task。  
18. Intervention occurred 不等于 Intervention worked。  
19. Reveal 不能写 Mastery。  
20. Reveal 后进入 Pending Validation。  
21. Immediate Understanding 不等于 Retention。  
22. Recognition 不等于 Retrieval。  
23. Transfer 使用 Different Item / Context。  
24. Cross-session 不自动等于 Delayed Retention。  
25. MemoryTarget 与 Skill 分离。  
26. MemoryState 不由 ability_history 冒充。  
27. Visual Evidence 与 Auditory Evidence 分离。  
28. Caption-assisted Success 不等于 Auditory Mastery。  
29. CET_REAL / TRUSTED_TEACHING / GENERATED 分离。  
30. GENERATED 不能创造真实 CET Fact。  
31. CET recurrence 只能来自真实 CET occurrence。  
32. Card 不控制 Learning State Machine。  
33. Decision Agent 输出 Learning Action，不输出 UI Card 作为业务逻辑。  
34. CONTINUE 能作为正式 Learning Action。  
35. AI 不需要在每一步强制输出解释。  
36. Positive Feedback 必须来自真实 Evidence。  
37. Visible Progress 必须有真实 Evidence。  
38. learning_record 保持 Raw Event Ledger 语义。  
39. Raw Evidence 记录 Success 时能够区分 Scaffold 条件。  
40. ObstacleHypothesis 能保留 Evidence 与 Confidence。  
41. Validation Type 与 Validation Timing 分离。  
42. P4 Paraphrase 支持 WORD / PHRASE / CLAUSE / SENTENCE / PROPOSITION Scope。  
43. P4 支持 Atomic Relation。  
44. P4 支持 Composite Relation。  
45. Question 支持 Multiple Evidence Spans。  
46. Paraphrase Relation 保留 Context。  
47. Source Text 与 Relation Provenance 分离。  
48. Answer Provenance 独立管理。  
49. Raw CET Source 保持内容最高真源。  
50. L1 Raw Evidence / L2 Derived State / L3 Decision / L4 Content Truth 分层。  
51. 五张 Core Table Ownership 不被偷换。  
52. 新 Auxiliary Storage 需要正式架构裁决。  
53. SPEC_CONFLICT 时 Implementation Agent 不自行改变原则。  
54. Persistence Failure 时 Learning State 不推进。  
55. Decision 可以审计。  
56. Fake Time / Fake Progress / Fake Mastery 不出现。  
57. Rejected V1 Learning Route 不复活。  
58. 最终真实 Runtime / Browser Product Validation 通过。

---

# 第四十五部分｜Final Canonical Statement

Exam OS Learning V2 判断的核心从来不是：

> **这个 Card 做完了吗？**

也不是：

> **今天预设计划完成了吗？**

它持续回答的是：

> 用户当前正在完成什么真实任务？

> 用户刚刚的行为真正说明了什么？

> 当前到底存在什么学习障碍，或者我们现在是否还不知道？

> 是否需要一个更小的 Probe 来获得 Evidence？

> 现在最小、最合适的 Intervention 是什么？

> 需要什么级别的 Scaffold？

> Scaffold 撤掉以后，用户能否自己完成？

> 这个成功能否迁移到不同 Item / Context？

> 以后用户还能不能重新 Retrieval？

> 当前 Evidence 到底支持“刚理解”“辅助成功”“独立完成”“迁移成功”还是更强的 Retention Evidence？

> 基于所有真实 Evidence，下一步最值得做什么？

Learning V2 的唯一核心保持：

```text
Content
→ User Action
→ Behavioral Evidence
→ Obstacle Hypothesis
→ Minimum Probe
→ Intervention
→ Return to Original Task
→ Validation
→ Transfer / Retrieval
→ Evidence Record
→ Next Best Action
```

因此：

> **Exam OS 的学习单位不是 Card。**

> **Exam OS 的核心资产不是一套固定学习流程。**

> **Exam OS 的核心能力是理解用户真实学习状态，并持续作出下一步学习决策。**

P4 的职责则保持：

> **用真实 CET 数据填充并验证 CET Evidence Network。**

P4 可以继续验证和补强：

```text
CET Evidence
Paraphrase
Evidence Span
Distractor
Provenance
Recurrence
Data Contract
```

但 P4 不负责重新定义：

```text
Exam OS 是什么
为什么是 OS
AI 与人的权力边界
Learning Core
Evidence Philosophy
Intervention / Validation Philosophy
```

后续 P4 全量加工中：

只有真实 CET 数据证明现有 CET/Data Contract 无法承载时，才产生新的：

```text
P4 → Learning V2 Delta
```

没有新的真实 Evidence：

就不扩。

**Learning V2 最终判断标准保持一句话：**

> **当前学习障碍是否获得了足够 Evidence、适当 Intervention 与有效 Validation，并据此产生了正确的 Next Best Learning Action**

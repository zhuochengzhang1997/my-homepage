---
title: "Build the Domain Layer, Not Another Agent Runtime"
shortTitle: "The Domain Layer"
kind: "Industry analysis"
subtitle: "Generic runtimes are becoming infrastructure. Durable advantage lies in the domain layer: context, tools, permissions, evaluation, and operational memory."
date: 2026-05-31
description: "Why most companies should treat agent runtimes as infrastructure and invest their differentiation in the domain-specific layer above them."
ogSlug: the-domain-layer
order: 6
---

As agent platforms mature, most companies should stop treating the generic agent runtime as the primary place to differentiate. The durable engineering work is moving upward: into domain context, tool interfaces, permission boundaries, evaluation, approval, audit, and the mechanisms that turn repeated execution into reusable operational knowledge.

This does not mean companies should “outsource AI.” It means they should be precise about which layer is becoming infrastructure and which layer remains specific to their business. A generic agent runtime must increasingly handle planning, tool execution, context management, long-running tasks, failure recovery, memory, sandboxing, tracing, and human intervention. Those capabilities are expensive to build well because they are tightly coupled to the underlying models and because reliability improves through large volumes of real execution data. For most teams, rebuilding that layer from scratch is unlikely to create a durable advantage. The stronger opportunity is to take a capable runtime and place it inside a controlled, domain-specific operating environment.

## 1. The question is not whether to build agents

The more useful question is **which part of the agent stack should be owned internally**. An agent is not simply a language model with tools. It is a persistent decision loop:

```text
Observe
↓
Interpret State
↓
Plan / Decide
↓
Act Through Tools
↓
Observe the Result
↓
Revise / Continue / Stop
↓
Feedback
```

A production runtime has to decide how to continue after partial failure, when to stop exploring, how to compress context, which memory to retrieve, how to recover from tool errors, when to ask for human approval, and how to evaluate whether a task is actually complete. These are legitimate research problems. A team studying agent architecture may reasonably build them from first principles.

But a company whose goal is to improve engineering, operations, research, or customer workflows faces a different optimization problem. It does not need to win at generic runtime design. It needs to make a strong agent productive inside its own environment. That distinction becomes more important as the runtime itself turns into platform infrastructure.

## 2. Generic agent infrastructure is becoming harder to differentiate on

Several structural forces push the generic layer toward large model and platform providers. First, **model behavior and runtime behavior are increasingly coupled**. Tool-use policy, stopping behavior, context compression, memory retrieval, error recovery, and long-horizon planning all depend on how the model behaves under real workloads. A provider that can tune the model and the runtime together has an architectural advantage over a team that only sees the model through an API.

Second, mature agent products can accumulate a much larger **execution-data flywheel**. Real trajectories reveal which tool calls fail, which recovery strategies work, which context is useful, when users intervene, and which completion criteria are misleading. A small internal framework rarely sees enough heterogeneous tasks to learn at the same rate.

Third, the safety surface expands rapidly once an agent can create side effects. Code execution, database writes, configuration changes, file edits, API calls, and external communication introduce requirements for sandboxing, scoped permissions, approval, audit, rollback, and anomaly handling. The generic runtime is therefore becoming less like an application library and more like an operating environment.

| Layer                         | Typical capability                                                                                           | Likely strategic owner   |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------ |
| Generic agent runtime         | Planning loop, tool execution, context management, sandbox, tracing, long-task orchestration, generic memory | Model / agent platform   |
| Enterprise control boundary   | Identity, access policy, data classification, approval, audit, rollback                                      | Enterprise               |
| Domain operation layer        | Business objects, engineering tools, workflow semantics, task constraints, acceptance rules                  | Enterprise / domain team |
| Evaluation and learning layer | Task-specific evaluators, failure taxonomy, reusable lessons, skills, escalation rules                       | Enterprise / domain team |

The practical boundary is not “external versus internal.” It is **commodity capability versus domain-specific control**.

## 3. Logs are not the same as learning

One reason teams underestimate runtime complexity is that they confuse persistence with learning. A coding agent may produce a long trace containing file reads, terminal commands, failed edits, test failures, retries, and rollbacks. Storing the trajectory is useful for audit and debugging. But a stored trajectory is still only a record of what happened. The system becomes more capable only when experience is transformed into something reusable.

```text
Execution Trace
↓
Identify Repeated Pattern
↓
Extract Lesson / Constraint / Skill
↓
Review and Validate
↓
Promote to Reusable Operational Knowledge
↓
Retrieve in Future Tasks
```

A reusable lesson might say that target tests should be understood before changing implementation, that a task should not be declared complete without a meaningful diff, that a failed verification should narrow the search before a broad refactor, or that high-risk configuration changes require regression testing. This step, from trajectory to reusable capability, is far more difficult than storing logs. It requires memory curation, deduplication, scope control, contradiction handling, and a mechanism for deciding which experiences deserve promotion. That is why memory and skill systems are not a small add-on to a runtime. They are part of the runtime’s long-term behavior.

For an individual enterprise, however, the highest-value memory is often not generic. It is **domain memory**: what failed in this codebase, which process condition invalidated a method, which exception requires escalation, which test is authoritative, and which internal convention changes the correct action. That knowledge should remain close to the enterprise domain layer even if the generic memory machinery is provided externally.

## 4. Enterprise value is multiplicative across layers

A strong runtime by itself does not create a strong enterprise agent system. A useful approximation is:

$$
V_{\mathrm{enterprise}} \approx R \times D \times T \times G \times E \times L
$$

where $R$ is runtime capability, $D$ is domain-context fidelity, $T$ is reliable tool access, $G$ is governance and permission control, $E$ is evaluation quality, and $L$ is the rate at which reviewed experience becomes reusable knowledge.

The multiplicative form captures an important systems property. A capable runtime with poor domain context can act confidently on the wrong interpretation. Excellent tools without scoped authority create unacceptable risk. Strong generation without evaluation produces plausible but untrustworthy output. Good execution without learning repeats the same mistakes. This is also why rebuilding the runtime can be a poor allocation of engineering effort. If the external runtime is already strong, marginal investment in $R$ may create less value than improving $D$, $T$, $G$, $E$, or $L$.

The strategic question becomes: **Which layer constrains the end-to-end workflow today?** For many enterprises, the answer is no longer the generic agent loop.

## 5. Security does not imply a weaker internal agent

Sensitive data is one of the strongest arguments teams make for building everything themselves. Semiconductor companies are the clearest case because design databases, process data, model parameters, PDKs, verification artifacts, and failure analyses are unusually sensitive. But data sensitivity does not logically imply that the generic agent runtime must be internally reinvented. A more mature architecture separates capability from access.

```text
Mature Agent Runtime
↓
Enterprise Identity + Security Boundary
↓
Scoped Data / Tool Access
↓
Domain Rules + Evaluation
↓
Human Approval for High-Risk Actions
↓
Auditable Execution
↓
Verified Result
```

The enterprise decides what the agent can see, which tools it can invoke, which actions are read-only, which require approval, which environments are isolated, and what evidence must be preserved. This approach does not remove risk. It makes the risk explicit and governable.

The weaker alternative is to equate “built internally” with “safe.” A less capable internal runtime can still have poor permissions, insufficient audit, weak evaluation, and incorrect actions. Security comes from architecture and governance, not from the psychological comfort of owning every layer. The better principle is: **use the strongest capability that can be placed inside an enforceable boundary.**

## 6. Capability lag can become a strategic cost

There is another cost to rebuilding generic infrastructure: **capability lag**. Suppose an internal framework requires months to add reliable long-task recovery, memory curation, sandboxing, or approval controls. During the same period, a mature external runtime may continue improving across those dimensions because it is supported by a larger engineering team and a broader task distribution. The organization then pays twice: once to build the internal framework, and again through the opportunity cost of operating with a weaker agent.

A simple decision model is:

$$
\mathrm{Net\ Build\ Value} = \mathrm{Differentiation\ Gain} - \mathrm{Build\ Cost} - \mathrm{Maintenance\ Cost} - \mathrm{Capability\ Lag}
$$

For truly domain-specific infrastructure, the differentiation term can dominate. For a generic runtime, it may not. This matters because the gap is not only about task speed. A stronger agent can increase experiment throughput, code iteration, debugging velocity, documentation quality, design-space exploration, and the rate at which organizational knowledge is converted into action. A persistent runtime gap can therefore become a **learning-rate gap** between organizations.

## 7. What enterprises should build

If the generic runtime is increasingly externalized, the internal engineering agenda does not become smaller. It becomes more domain-specific. The enterprise should build the substrate that makes an agent useful and governable in its own environment.

| Enterprise-owned layer | What it should contain                                                                 | Why it matters                                           |
| ---------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Data interfaces        | Approved sources, business semantics, classification, redaction, freshness, provenance | Determines what reality the agent is allowed to observe. |
| Domain tool layer      | Narrow tools, typed inputs, explicit outputs, safe failure states, write boundaries    | Turns reasoning into controlled action.                  |
| Workflow constraints   | Required steps, allowed variables, completion rules, escalation conditions             | Keeps the agent inside a validated operating region.     |
| Evaluation system      | Tests, rubrics, physical or business checks, historical replay, failure taxonomy       | Determines whether an output is actually acceptable.     |
| Operational memory     | Lessons, skills, counterexamples, checklists, retired procedures, scope conditions     | Allows reviewed experience to improve future work.       |
| Approval and audit     | Human decision rights, traceability, rollback, action history                          | Preserves accountability for consequential actions.      |

This is the domain operation layer. It is also where much of the durable moat sits because it depends on proprietary tools, internal semantics, expert judgment, historical failures, and organizational responsibility.

## 8. Semiconductor engineering makes the boundary especially clear

Semiconductor workflows are a useful test case because both sides of the architecture matter. The generic runtime needs to be good at coding, tool use, long-horizon execution, recovery, memory, and interaction. But none of those capabilities tells the agent which model parameters may be changed, what physical trend is acceptable, which dataset version is authoritative, whether a PDK artifact may leave a secure environment, what constitutes signoff, or when a result requires expert escalation. Those rules belong to the domain layer.

A production architecture is therefore more likely to look like:

```text
Mature Agent Runtime
↓
Semiconductor Domain Context
↓
Approved EDA / Simulation / Data Tools
↓
Physical + Procedural Constraints
↓
Verification / Signoff / QA
↓
Human Approval for High-Consequence Decisions
↓
Auditable Run Record
↓
Reviewed Lessons
↓
Reusable Skills
```

The runtime can be shared infrastructure. The operating model cannot. This distinction is particularly important in high-risk engineering domains because the enterprise advantage comes from encoding expert methods, constraints, evaluators, and data boundaries, not from recreating a generic planning loop.

## 9. Agent engineering will move from framework engineering to adaptation engineering

The likely transition is not from “building agents” to “not building agents.” It is from one kind of engineering to another. Teams will spend less effort recreating generic orchestration and more effort on integrating internal tools and state; defining identity and permission boundaries; designing approval and escalation paths; creating reliable evaluators; building domain memory and skill promotion pipelines; monitoring failures and drift; and making workflows reproducible and auditable.

This is a more difficult form of engineering than drawing a larger orchestration graph, because it requires domain knowledge and operational responsibility. It is also more defensible. The long-term opportunity is not another generic wrapper around a model. It is an **agent-ready substrate** for a real domain: a structured combination of data, tools, rules, evaluators, security, and reusable expertise that a capable runtime can operate against safely.

## Conclusion

As agent runtimes mature, the default architecture for most companies should change. The generic runtime increasingly belongs to the infrastructure layer. Enterprises should consume it where the capability, security model, and deployment boundary are acceptable, rather than reflexively recreating it. The layers that should remain deeply internal are the ones that encode how the organization actually works: authoritative data, domain semantics, tool contracts, workflow constraints, evaluation criteria, approval rights, audit, and the process by which reviewed experience becomes reusable knowledge.

The architecture can be summarized as:

$$
\mathrm{Mature\ Runtime} + \mathrm{Domain\ Substrate} + \mathrm{Governance} + \mathrm{Evaluation} + \mathrm{Learning} \;\rightarrow\; \mathrm{Reliable\ Enterprise\ Agent}
$$

The practical question is therefore not **“Can the organization build its own agent framework?”** It is **“Which parts of this system create durable advantage, and which parts are becoming infrastructure?”** For most enterprises, the competitive answer will increasingly be found above the runtime.

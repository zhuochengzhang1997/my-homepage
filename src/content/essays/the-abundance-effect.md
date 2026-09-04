---
title: "The Abundance Effect: Why AI Efficiency Can Increase Demand and Move Bottlenecks"
shortTitle: "The Abundance Effect"
kind: "Industry analysis"
subtitle: "When AI makes a task cheaper, more of that task becomes worth doing. Efficiency can expand demand and move the bottleneck instead of removing it."
date: 2026-08-31
description: "Why cheaper AI capability can release latent demand, increase total activity, and shift scarcity to verification, infrastructure, and coordination."
ogSlug: the-abundance-effect
order: 2
---

AI efficiency does not necessarily reduce total work. In many domains, it lowers the cost of capability enough to activate demand that previously never entered the market. The result is not simply automation, but a broader expansion of what becomes economically worth doing.

## 1. The fixed-demand assumption

Most discussions of AI automation begin with an implicit subtraction model. If a company currently handles one million customer-support interactions and AI can automate 70 percent of them, it is tempting to conclude that only 30 percent of the original workload remains. If software engineers become several times more productive, fewer engineers should be required to produce the same software. If model inference becomes ten times more efficient, total compute demand should fall accordingly.

These conclusions are internally consistent only if demand is fixed. That assumption is often wrong. Demand for many services depends on their price, latency, friction, availability, required expertise, and expected quality. When those constraints fall, work that was previously uneconomic can become worth doing. Questions that users would not wait on hold to ask are suddenly worth asking when an AI assistant can answer instantly. Internal tools that would never justify a dedicated engineering team become viable when software can be produced cheaply. Design spaces that engineers could not afford to explore become tractable when simulation and optimization are automated.

The important variable is therefore not only how much existing work AI can replace. It is how much additional work appears once the cost of performing that work changes. This distinction explains why automation can increase activity even while reducing the cost of each individual task.

## 2. Efficiency changes the feasibility boundary

A task is worth performing only when its expected value exceeds the total cost of completing it. Let $V$ denote the expected value of the task and $C$ its full execution cost. The basic feasibility condition is:

$$
V > C
$$

The important point is that $C$ includes far more than money. A useful decomposition is:

$$
C = C_{\mathrm{money}} + C_{\mathrm{time}} + C_{\mathrm{latency}} + C_{\mathrm{coordination}} + C_{\mathrm{expertise}} + C_{\mathrm{risk}} + C_{\mathrm{review}}
$$

Many forms of demand remain invisible because they sit just outside this feasibility boundary: they would be useful, but not useful enough to justify the combined cost of execution and review. AI changes the boundary by reducing one or more terms in $C$. A customer may want clarification on a minor product issue, but not enough to navigate a phone tree and wait for an agent. An engineering team may benefit from a custom internal dashboard, but not enough to allocate several developer-weeks to build it. A semiconductor team may want to run more corner simulations or analyze more experimental splits, but not enough to consume scarce expert hours on every case.

Once AI reduces the cost of cognition, generation, or analysis, some of these tasks cross from uneconomic to economic. The shift is more important than simple task substitution: AI changes which tasks are worth performing at all. This is why the most important effect of automation may not be the displacement of existing work, but the activation of previously suppressed demand.

## 3. Why AI is unusually susceptible to Jevons-style effects

The economic logic is closely related to the Jevons paradox. Improvements in steam-engine efficiency did not simply reduce coal consumption; they lowered the cost of using steam power, expanded the number of viable applications, and contributed to greater total consumption.

The same mechanism can appear whenever efficiency reduces resource use per task but also expands the number of tasks worth performing. Let $\eta$ denote efficiency, $Q(\eta)$ the resulting task volume, and $r_0/\eta$ the resource required per task. Aggregate resource use can be written as:

$$
R(\eta) = Q(\eta)\frac{r_0}{\eta}
$$

Efficiency by itself pushes $R$ down. Demand expansion pushes it up. If task volume grows faster than efficiency improves, aggregate resource use rises even though every individual task becomes cheaper:

$$
\frac{d\ln Q}{d\ln \eta} > 1 \quad \Rightarrow \quad \frac{d\ln R}{d\ln \eta} > 0
$$

This is the condition behind a strong Jevons-style rebound. It is not a universal law; it depends on how elastic demand is to the falling cost of capability. AI is particularly exposed to this effect because intelligence is not a narrow-purpose commodity. It is a general-purpose input to writing, coding, design, customer service, research, simulation, search, education, decision support, and increasingly tool-using workflows.

Lowering the cost of one model call does not merely make an existing call cheaper. It can increase the number of users, the number of tasks per user, the number of iterations per task, the depth of reasoning, the number of agents participating in a workflow, and the number of modalities being processed. Aggregate compute therefore depends on a multiplicative system, not on the efficiency of a single inference step. A compact approximation is:

$$
C_{\mathrm{total}} \approx U \times T \times A \times C_a
$$

where $U$ is the number of users, $T$ is tasks per user, $A$ is model or tool actions per task, and $C_a$ is compute per action. Better models, chips, and inference systems may reduce $C_a$, while adoption, agentic workflows, deeper reasoning, retries, and multimodality increase $U$, $T$, and especially $A$. Per-action compute can therefore fall while total compute continues to rise.

This is already visible in the transition from single-turn assistants to agentic workflows. A user request that once produced one model response may now trigger planning, search, retrieval, database queries, code execution, verification, retries, and multiple model calls. What appears to the user as one action can become dozens of machine actions in the background. Efficiency makes each action cheaper; autonomy increases the number of actions the system is willing to take.

## 4. The DeepSeek lesson was about demand, not only efficiency

The market reaction to DeepSeek in early 2025 exposed the difference between two economic models. One model treats demand for AI capability as fixed: if comparable intelligence can be produced with less compute, then less compute should be required in aggregate. The other treats demand as endogenous. Lower-cost intelligence becomes available to more companies, more products, and more users. Existing users invoke it more frequently. Applications can afford longer context, deeper reasoning, more iterations, and more background automation. Tasks that previously had no viable return on investment begin to make economic sense. Under this model, efficiency can increase total resource demand rather than reduce it.

The subsequent growth of inference workloads and AI infrastructure investment does not prove that any single model caused aggregate GPU demand to rise. Many forces are operating simultaneously, including reasoning models, multimodal systems, enterprise adoption, agentic applications, and sovereign AI investment. The more useful conclusion is narrower: improvements in unit efficiency and growth in total compute demand are entirely compatible. That point matters because it generalizes beyond GPUs. The same reasoning can apply to software production, simulation, customer service, scientific analysis, and other forms of machine-mediated work.

## 5. Competition reinvests productivity gains

Latent demand is not the only mechanism that prevents efficiency gains from turning directly into less work. Competition matters as well. Suppose AI makes a software organization several times more productive. In principle, the company could preserve the same output with a much smaller team and convert the productivity gain into lower cost. But it could also keep a similar level of resources and use the gain to ship more features, run more experiments, support more customers, and shorten iteration cycles.

If one competitor chooses the second path, others face pressure to follow. This produces a Red Queen effect: when every participant receives faster tools, the performance baseline itself moves. A firm that converts all AI productivity into headcount reduction may find that competitors use the same technology to increase product velocity instead. Productivity gains are therefore often reinvested into output.

This is why estimates such as “AI makes an engineer five times more productive” cannot be translated mechanically into “the industry will need one-fifth as many engineers.” The more relevant question is what the competitive standard becomes once every organization has access to greater cognitive throughput.

## 6. Abundance becomes the new baseline

Efficiency can also create demand by changing expectations. Capabilities that begin as premium features often become baseline requirements once their marginal cost falls far enough. Twenty-four-hour support was once expensive. If AI makes instant assistance inexpensive, users begin to ask why every product cannot answer questions at any time. Quarterly software releases can appear slow once development and testing cycles accelerate. A limited simulation campaign may become difficult to justify once automated exploration can cover many more corners, geometries, and candidate configurations.

The sequence is not simply “lower cost, then satisfy the same demand.” A more realistic dynamic is:

$$
C \downarrow \;\rightarrow\; Q_{\mathrm{latent}}\uparrow \;\rightarrow\; \text{behavior changes} \;\rightarrow\; \text{baseline expectations}\uparrow \;\rightarrow\; Q_{\mathrm{new}}\uparrow
$$

Lower cost first releases latent demand, but repeated use then changes behavior and raises the baseline. That higher baseline creates demand that did not previously exist in the same form. Yesterday’s optional capability becomes tomorrow’s expected minimum. This mechanism makes demand expansion persistent: once customers, engineers, and organizations adapt to a higher level of service, returning to the previous baseline becomes difficult.

## 7. AI moves bottlenecks rather than eliminating them

The most strategically important consequence is not that every layer of work expands indefinitely. It is that scarcity migrates. When AI removes one bottleneck, the next constraint becomes more visible. In customer support, the bottleneck may move from the number of human agents to escalation quality, knowledge governance, exception handling, and accountability. In software engineering, code generation may become cheap while architecture, review, testing, security, integration, and long-term maintenance become more important. In EDA, automated exploration may generate far more candidate designs than engineers could previously consider, and the limiting factor then shifts toward verification, signoff, model fidelity, compute infrastructure, and confidence in the result. In AI for science, hypothesis generation can become abundant while physical experiments, fabrication, measurement throughput, and closed-loop validation remain scarce.

The recurring pattern can be summarized as:

$$
B_{\mathrm{old}} \;\xrightarrow{\text{automation}}\; \text{Abundance} \;\rightarrow\; B_{\mathrm{new}}
$$

where $B_{\mathrm{old}}$ is the constraint AI relaxes and $B_{\mathrm{new}}$ is the next scarce resource exposed by that success. The highest-value opportunities often appear at the right side of this sequence. This is one reason the infrastructure around AI may become more important as generation itself becomes cheaper. Systems need to determine which outputs are correct, which actions are authorized, which results are reproducible, and which decisions can be trusted. Verification, orchestration, provenance, governance, and judgment become more valuable precisely because generation becomes abundant.

## 8. The effect has limits

Jevons-style expansion is not universal. Some tasks have structurally fixed demand. Payroll may need to run once per pay period regardless of how cheap the computation becomes. A regulatory filing may be required once, not one hundred times. Certain compliance checks are bounded by policy rather than by cost.

Other forms of saturation also constrain demand. Human attention is finite: AI can make content generation nearly free without creating additional hours in the day for people to consume it. Physical systems impose harder limits: AI may generate thousands of promising material, drug, device, or process candidates, but laboratory equipment, fabrication capacity, experimental cycle time, and measurement throughput do not scale at the same rate. Economics can also cap value capture. Usage may expand while supply expands even faster, pushing prices and margins down. Growth in total activity does not automatically imply growth in industry profit.

The useful question is therefore not whether AI will always create more demand. It is whether a domain contains a large pool of valuable activity that is currently suppressed by cost, latency, coordination, or scarce expertise. Where that pool is large, demand expansion can overwhelm the direct savings from efficiency.

## 9. What this changes for product and infrastructure strategy

A conventional automation thesis starts with cost reduction: a process currently requires one hundred people; software can reduce that requirement to twenty; the difference becomes customer ROI. That remains a valid market. But a more important class of opportunities may emerge from a different question:

**If a capability becomes one hundred times cheaper, will the world want to use it one thousand times more?**

If the answer is yes, the market is not primarily a labor-substitution market. It is an abundance market. Abundance markets create second-order infrastructure needs. Someone must filter, verify, coordinate, govern, and trace the much larger volume of machine-generated work. This is likely to matter across software development, agent infrastructure, EDA, scientific research, customer operations, and other domains where output can scale much faster than human review capacity. The strategic opportunity is therefore often not in the task AI first automates. It is in the new scarcity that appears after automation succeeds.

## 10. What to watch over the next several years

Several developments would provide evidence for or against this thesis. First, unit inference cost should continue to decline while aggregate inference demand continues to grow. Reasoning, long context, multimodal models, and agentic workflows will determine whether task volume and complexity outpace efficiency gains.

Second, internet traffic should continue shifting from human-triggered interactions toward machine-generated activity. A single human intention can produce many API calls, database queries, authentication events, searches, logs, and tool executions. This would increase the importance of networking, identity, security, observability, and data infrastructure designed for machine workloads.

Third, coding agents should expand the software surface area rather than merely reduce typing time. Organizations may build more internal tools, automations, and highly customized applications because their previous development economics no longer apply. The bottleneck would then move from code production toward architecture, verification, and maintenance.

Fourth, AI-assisted EDA should increase the amount of simulation and verification performed. Automated exploration can make larger design spaces economically reachable, but the resulting candidates still require trusted evaluation. Verification and signoff may become more valuable, not less.

Finally, AI for science should increasingly expose the gap between digital generation and physical validation. As candidate generation becomes cheap, experimental throughput and closed-loop systems that connect simulation, fabrication, measurement, and learning should become more strategically important.

These are empirical claims, not laws. They should be tested against actual workload growth, unit economics, capital spending, organizational behavior, and the location of emerging bottlenecks.

## Conclusion

The most important effect of AI efficiency may not be that society performs the same set of tasks with fewer resources. It may be that a much larger set of tasks becomes worth performing at all. Lower costs release latent demand. Competition reinvests productivity gains. Users adapt to higher service levels. New capabilities become baseline expectations. The system expands until a different constraint becomes scarce.

AI therefore does not simply remove work. It changes the economic boundary of useful work and moves bottlenecks across the system. The argument can be compressed into one chain:

$$
\text{Efficiency}\uparrow \;\rightarrow\; \text{Unit Cost}\downarrow \;\rightarrow\; \text{Feasible Task Set}\uparrow \;\rightarrow\; \text{Activity}\uparrow \;\rightarrow\; \text{Bottleneck Migration}
$$

For companies, investors, and builders, the practical question is not only where AI can reduce cost. It is where lower-cost intelligence will expand the feasible task set, create abundance, and make a different constraint scarce.

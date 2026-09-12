---
title: "Beyond Transformer and Mamba: A Case for Layered Memory"
shortTitle: "Layered Memory"
kind: "Industry analysis"
subtitle: "No single mechanism can preserve exact history and compress endless streams at low cost. Intelligent systems need different kinds of memory for different timescales."
date: 2026-05-31
description: "Why future systems may combine attention, recurrent state, episodic storage, retrieval, and consolidation instead of choosing one memory architecture."
ogSlug: beyond-transformer-and-mamba
order: 8
---

The important question is not whether Mamba replaces the Transformer. It is whether future intelligent systems can combine two different memory capabilities: high-fidelity access to recent or exact history, and low-cost compression of long-running state. For Physical AI, that distinction is likely to matter more than the choice of a single sequence operator.

Transformer and Mamba are often framed as competing architectures. That framing is useful for benchmarking kernels and model families, but it can obscure the deeper systems problem. Attention is good at keeping history available for precise re-access. Mamba and related state-space models are good at continuously updating a compact internal state without letting memory grow with every new observation. These are not interchangeable functions. They solve different memory problems.

For static text, code, contracts, and audit logs, exact retrieval can be essential. A model may need to recover a variable name, a number, a clause, or a prior action with very little distortion. For robots, autonomous vehicles, industrial systems, and other forms of Physical AI, the input is different: a continuous stream of video, audio, touch, position, force, machine state, and environmental change. Most of that stream should not remain in high-resolution working memory forever. The architecture question therefore shifts from **which model remembers better** to **which information deserves which kind of memory**.

## 1. Attention and state-space models embody different memory contracts

Transformer attention treats prior representations as something that can remain available for later lookup. At generation time, the current query can re-access historical key-value representations and selectively recover what matters now. A useful mental model is an archive kept within reach: the system can return to earlier pages when the current task requires them. That is especially valuable when correctness depends on exact historical access. Long documents, codebases, contracts, debugging traces, and agent action histories often contain details that should not be reconstructed from a compressed summary if the original evidence is available.

The cost is that history remains expensive. Even with KV caching, the stored history continues to grow as the sequence grows. A simplified memory relationship is:

$$
M_{\mathrm{attention}}(L) \propto L
$$

where $L$ is the retained sequence length. The important point is not the constant factor. It is that more retained history means more state to store and move.

Mamba makes a different trade-off. Instead of preserving every historical token representation for arbitrary re-access, it maintains a recurrent state that is continuously updated:

$$
h_t = \bar{A}_t h_{t-1} + \bar{B}_t x_t
$$

Here, $x_t$ is the current input, $h_{t-1}$ is the accumulated state, $\bar{A}_t$ controls how much prior state is retained, and $\bar{B}_t$ controls how strongly the new input is written into state. Selective state updates matter: the system can learn that some inputs should strongly change state while others should have little long-term effect. This creates a different memory contract:

$$
M_{\mathrm{state}}(L) \approx \mathrm{constant\ with\ respect\ to\ history\ length}
$$

The system does not keep the full archive in working memory. It maintains a compact representation of what it currently believes matters.

| Memory property                    | Transformer attention                                            | Mamba / SSM                                              |
| ---------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------- |
| How history is represented         | Historical token representations remain available for attention. | History is compressed into a continuously updated state. |
| Arbitrary historical lookup        | Strong.                                                          | Limited by what survived compression.                    |
| Exact copying and citation         | Well suited when the relevant history is retained.               | More exposed to information loss.                        |
| Memory growth with sequence length | Grows with retained history.                                     | State size need not grow with history length.            |
| Streaming operation                | Increasing historical state must remain accessible.              | Naturally expressed as online state updates.             |
| Primary strength                   | High-fidelity re-access.                                         | Efficient long-running state tracking.                   |

The difference is therefore not simply one of efficiency. It is a difference in what the architecture promises to preserve.

## 2. Compression and random access cannot both be free

A fixed-size state must compress. As a stream becomes longer, more history is forced into the same representational budget. The model may preserve topics, trends, task state, or a small set of salient variables, but it cannot guarantee lossless retention of every earlier detail.

Consider a long technical document in which a device identifier appears near the beginning. Much later, the system is asked to reproduce that identifier exactly. An attention-based system can re-access the relevant historical representation if it remains in context. A purely compressed recurrent state must have preserved that exact identifier throughout every subsequent update. That is a much stronger requirement. This leads to a useful distinction:

> **Selective memory is not the same capability as random access.**

A high-quality summary and an exact archive are both useful, but they serve different purposes. One minimizes the cost of carrying history forward. The other minimizes the risk of losing detail that may later become important. For long-running intelligent systems, the right question is therefore not which one wins. It is where each should sit in the memory hierarchy.

## 3. A larger context window is not a complete memory architecture

One response to long-horizon tasks is simply to expand context. That works when the main requirement is to keep more evidence directly accessible. But Physical AI faces a different scale problem. A robot or autonomous system can receive high-frequency multimodal input continuously for hours, days, or months. Nearby video frames are highly redundant. Small sensory fluctuations may be irrelevant. Some state variables evolve slowly. Rare events may remain important long after the raw stream becomes operationally useless.

Treating all of this information as one ever-growing context is conceptually inefficient even before considering implementation cost. A more realistic system needs multiple retention policies.

```text
Recent high-resolution information
↓
Local Attention / Working Memory
↓
Continuous task and world state
↓
Mamba / SSM / Recurrent State
↓
Important discrete events
↓
Episodic Memory
↓
Complete raw evidence
↓
External Archive / Retrieval
↓
Stable general knowledge
↓
Model Parameters / Consolidated Knowledge
```

This is the point at which Transformer and Mamba stop looking like rival architectures and start looking like components in a larger memory system. Attention preserves recent detail. State-space recurrence maintains compact continuity. Episodic memory protects rare events from being averaged away. External storage preserves evidence that is too expensive to keep online but too important to discard. Training or periodic consolidation can move sufficiently stable regularities into model parameters. The system is no longer just a model with a context window. It becomes a **memory operating system**.

## 4. Sliding-window attention solves recency, not memory

Local or sliding-window attention is an obvious first step toward this architecture.

```text
Current input
↓
Attend only to the most recent W tokens / time window
```

This preserves high-resolution access to recent history while preventing the active KV cache from growing without bound. But it creates a new question: what happens when information leaves the window? If the answer is simply “it disappears,” the system has bounded context but not long-term memory. It still cannot distinguish between an irrelevant visual detail and an old constraint that remains operationally binding.

A more explicit routing scheme is:

```text
Recent information → Local Attention for precise access
Older history → Mamba / SSM for compressed continuous state
Critical events → Episodic Memory for durable retention
Complete evidence → External Archive for later retrieval
Stable regularities → Model Parameters through consolidation
```

This architecture makes forgetting selective rather than accidental. The important design variable is no longer only window size $W$. It is the policy that decides what happens when information moves across memory tiers.

## 5. Physical AI makes memory hierarchy unavoidable

Physical AI is a particularly strong use case for layered memory because the physical world operates across multiple timescales. A manipulation system may need millimeter-level geometric detail for the next few seconds. It may need to remember for minutes that a door is open, a tool has already been picked up, or a task has reached a particular stage. It may need to retain for months that a specific machine once exhibited a rare failure mode. And it may need forensic access to raw video or sensor logs after an incident. These are different memory requirements.

| Memory tier      | Primary function                                                | Possible system mechanism                           |
| ---------------- | --------------------------------------------------------------- | --------------------------------------------------- |
| Sensory buffer   | Preserve rich recent perceptual detail.                         | High-resolution short-lived cache.                  |
| Working memory   | Maintain information required by the immediate task.            | Local / sliding-window attention.                   |
| Continuous state | Track slowly evolving world and task variables.                 | Mamba, SSM, recurrent state.                        |
| Episodic memory  | Preserve rare or important events.                              | Sparse event store with retrieval.                  |
| Semantic memory  | Represent stable reusable regularities.                         | Model parameters or validated knowledge structures. |
| External archive | Preserve complete evidence for replay, audit, or investigation. | Logs, files, databases, object storage, RAG.        |

A robot that tries to preserve every camera frame in active model memory wastes resources. A robot that compresses everything into one recurrent vector risks losing exactly the event that later becomes safety-critical. The architecture must therefore allocate information according to **precision requirement, retention horizon, access frequency, and consequence of forgetting**. A useful abstraction is:

$$
\mathrm{Memory\ Placement} = f(\mathrm{Precision},\ \mathrm{Horizon},\ \mathrm{Access\ Frequency},\ \mathrm{Forgetting\ Cost})
$$

This is not a claim that one specific implementation is optimal. It is a way to frame the systems problem that a single context-length number cannot express.

## 6. The hard problem is deciding what deserves promotion

Once a layered architecture exists, the difficult part becomes memory policy. The system must continuously decide:

1. Is this information important enough to remain in high-resolution working memory?
2. Should this observation modify the persistent recurrent state?
3. Is this event important enough to preserve as an episode?
4. Should the original raw evidence be archived for future replay?
5. Does the current task require recovering an older high-fidelity record?
6. Has a repeated pattern become stable enough to consolidate into a more durable form of knowledge?

This is a routing problem across memory tiers.

```text
Continuous Experience
↓
Online Filtering
↓
Ignore transient noise / Update recurrent state
Keep recent context / Promote critical events
↓
Episodic Memory
↓
Offline Replay
↓
Validate repeated patterns
↓
Consolidation
↓
Durable knowledge / policy
```

Short-term experience first becomes retrievable memory; only after repeated evidence and validation should it become a more stable capability. That distinction is important for long-running agents and robots. A single unusual event should not necessarily rewrite the system's general model of the world. But it may deserve durable retention until later evidence determines whether it represents a real pattern. In other words, **memory promotion should be governed by evidence, not merely recency**.

## 7. Different workloads need different memory mixtures

Once the architecture is viewed as a memory system rather than a sequence-model contest, the likely outcome is not one universal model. Different workloads impose different fidelity and persistence requirements.

| Workload                                         | Dominant memory requirement                                                   | Likely architectural emphasis                                                  |
| ------------------------------------------------ | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Documents, code, contracts, audit logs           | Exact historical lookup and citation.                                         | Full / sparse attention + external retrieval.                                  |
| Long-running assistants                          | Recent conversational precision plus persistent preferences and commitments.  | Local attention + long-term summarized state + episodic memory + RAG.          |
| Robotics, autonomous driving, industrial systems | Continuous streaming state under memory, latency, and power constraints.      | Mamba / SSM + local attention + event-triggered external storage.              |
| High-fidelity video or digital twins             | Persistent world state plus recovery of detailed visual or physical evidence. | Latent world state + high-fidelity decoding / retrieval + selective attention. |

The point is not that these combinations are fixed recipes. It is that the optimal architecture follows the memory contract of the task. Transformer attention, Mamba, linear attention, sparse attention, retrieval, event memory, and external storage may coexist because each solves a different cost-versus-fidelity problem.

## 8. The architectural unit is moving from the model to the memory system

Large models are often described as:

```text
Model
+
Large Context Window
```

A long-running intelligent system is more likely to require:

```text
Model
+
Memory Management System
+
Multiple storage tiers
+
Dynamic routing between tiers
+
Replay and consolidation
```

That is a meaningful shift in what should be optimized. A benchmark that measures only how many tokens fit into context cannot show whether the system remembers the right thing, forgets the right thing, preserves evidence when needed, or retrieves old information at the correct fidelity. For Physical AI, these questions become operational. Memory affects latency, power, safety, recoverability, and the ability to maintain a coherent world state over long horizons.

The relevant system metric is therefore not simply context length. It is the quality of memory allocation over time. One way to summarize the design objective is:

$$
\mathrm{Memory\ Utility} \approx \frac{\mathrm{Relevant\ Information\ Preserved}}{\mathrm{Online\ Memory\ Cost} + \mathrm{Retrieval\ Cost} + \mathrm{Cost\ of\ Forgetting}}
$$

The equation is conceptual rather than a literal benchmark. Its purpose is to make the trade-off explicit: retaining everything is expensive; compressing everything is lossy; retrieving everything later is slow; forgetting the wrong thing can be catastrophic.

## Conclusion

Transformer and Mamba represent two useful but incomplete answers to the same question: how should an intelligent system carry its past forward? Attention favors high-fidelity access. State-space recurrence favors continuous compression. Neither alone provides the complete memory behavior required by a system that operates continuously in the physical world.

The more plausible architecture is hierarchical:

```text
High-fidelity recent memory
↓
Compressed continuous state
↓
Sparse durable episodes
↓
Retrievable external evidence
↓
Validated long-term consolidation
```

The difficult engineering problem then moves above the sequence operator. The system must decide what to retain, what to compress, what to promote, what to archive, what to retrieve, and what to forget. That is why the long-term competition may be less about whether Transformer or Mamba becomes the single winning architecture, and more about which systems build the most effective **memory hierarchy and routing policy** around them.

For Physical AI, the practical question is not **“How large can the context window become?”** It is **“Can the system preserve the right information, at the right fidelity, for the right amount of time, at a cost that remains compatible with continuous operation?”**

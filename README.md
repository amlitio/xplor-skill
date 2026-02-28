# 🚀 xplor — Production Agent Skill System for Real Work

**xplor** is a modular AI agent skill framework designed to run deterministic, auditable, low-token workflows for real operational automation.

It transforms LLM agents from chat assistants into production execution systems.

---

## ⚡ What Problem xplor Solves

Most AI agents fail in production because they:

- hallucinate decisions
- lack workflow control
- become expensive at scale
- cannot be audited
- break under real documents and operations

**xplor introduces structured execution instead of prompt chaos.**

---

## 🧠 Core Idea

AI decides **what** should happen.

xplor controls **how** it safely happens.

| Layer | Responsibility |
|------|---------------|
| Agent | Reasoning |
| Skills | Deterministic execution |
| Workflow | State control |
| Database | Audit & truth |

---

## 🏗 Architecture


AI Agent (Claude / GPT)
│
▼
Skill Selection Layer
│
┌──────┼────────┐
│ │ │
Extract Validate Rate
│ │ │
└── Workflow State Machine ──┘
│
▼
Audit + Database
│
External Systems


---

## ✅ Key Features

### Modular Skill System
- Plug-and-play agent capabilities
- Dynamically loaded skills
- YAML-defined permissions
- Replaceable execution modules

---

### Workflow State Machine

Production-safe execution pipeline:


pending_extract
→ pending_validate
→ pending_rate
→ pending_post
→ completed


No uncontrolled agent behavior.

---

### Low Token Architecture

xplor minimizes AI cost by:

- moving logic outside prompts
- structured execution
- AI invoked only when required

Target automation cost:

**< 3% of operational revenue**

---

### Full Auditability

Every execution records:

- inputs
- outputs
- decisions
- exceptions
- execution history

Enterprise-ready transparency.

---

## 🚀 Quick Start

### Clone Repository

```bash
git clone https://github.com/amlitio/xplor-skill.git
cd xplor


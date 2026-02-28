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

```
AI Agent (Claude / GPT)
        │
        ▼
 Skill Selection Layer
        │
 ┌──────┼────────┐
 │      │        │
Extract Validate Rate
 │      │        │
 └── Workflow State Machine ──┘
        │
        ▼
 Audit + Database
        │
 External Systems
```

---

## ✅ Key Features

### Modular Skill System
- Plug-and-play agent capabilities
- Dynamically loaded skills
- YAML-defined permissions
- Replaceable execution modules

### Workflow State Machine

```
pending_extract
→ pending_validate
→ pending_rate
→ pending_post
→ completed
```

### Low Token Architecture

xplor minimizes AI cost by:
- moving logic outside prompts
- structured execution
- AI invoked only when required

Target automation cost:
**< 3% of operational revenue**

### Full Auditability

Every execution records:
- inputs
- outputs
- decisions
- exceptions
- execution history

---

## 🚀 Quick Start

### Clone Repository

```bash
git clone https://github.com/amlitio/xplor-skill.git
cd xplor
```

### Install Dependencies

```bash
pip install -r requirements.txt
```

### Run Agent Runtime

```bash
python main.py
```

### Execute Workflow

```bash
python run_pipeline.py
```

---

## 📂 Repository Structure

```
xplor/
│
├── agent/
│   └── runtime.py
│
├── skills/
│   ├── extraction/
│   ├── validation/
│   ├── rating/
│   └── posting/
│
├── workflows/
│   └── pipeline.yaml
│
├── database/
│   └── schema.sql
│
└── main.py
```

---

## 🧩 Skill System

Each capability exists independently:

```
skills/<skill_name>/SKILL.md
```

Example:

```yaml
name: Invoice Extraction
version: 1.0.0
permissions:
  - storage.read
  - storage.write
```

Skills are:
- discoverable
- testable
- replaceable
- auditable

---

## 🔄 Workflow Lifecycle

```
document_received
→ extracted
→ validated
→ priced
→ posted
→ archived
```

---

## 🗄 Database Model

Core entities:
- jobs
- tickets
- rules
- exceptions
- audit_logs

---

## 🔌 Integrations

Designed for:
- Xero
- QuickBooks
- Supabase
- PostgreSQL
- REST APIs
- Internal enterprise systems

---

## 📈 Why xplor Exists

Most AI tooling focuses on demos.

xplor focuses on:
- reliability
- cost control
- operational execution
- enterprise deployment

---

## 🧭 Roadmap

- Skill marketplace
- Web dashboard
- Multi-agent orchestration
- Supabase deployment
- SaaS control plane
- Enterprise RBAC

---

## 🤝 Contributing

1. Open an issue
2. Pick a good-first-issue
3. Submit a PR

---

## ⭐ Support

If xplor helps your workflow:
- Star the repository
- Fork the project
- Build a skill

---

## 📜 License

MIT License

---

## 🔬 Vision

AI agents should operate infrastructure — not conversations.

**xplor is the execution layer for real-world AI work.**

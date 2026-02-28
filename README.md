# Xplor: Structured Cognition for AI Agents

[![MCP Skill](https://img.shields.io/badge/MCP-Skill-orange)](https://mcpmarket.com/submit?type=skill)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Xplor** is a Model Context Protocol (MCP) skill that transforms flat codebases, legal contracts, and documentation into interconnected knowledge graphs. It allows AI agents to move beyond "flat search" (Vector RAG) to **Relationship-Based Reasoning**.



## 🧠 Why Xplor?

Most AI systems struggle with complex domains because they lack relational awareness. Xplor injects **structure, meaning, and traceability** into the AI's context window.

* **Traceability**: Audit how your AI navigates dependencies with built-in scoring.
* **Context Density**: Use "Progressive Disclosure" to prevent AI context collapse in large repos.
* **High-Stakes Mapping**: Specifically optimized for complex industries like **Construction (AIA A201)** and **Legal Compliance (FS 218.755)**.

## 🚀 Quick Start

### 1. Install the CLI
Clone the repo and install the core engine locally:
```bash
git clone [https://github.com/amlitio/xplor-skill.git](https://github.com/amlitio/xplor-skill.git)
cd xplor-skill
pip install -e .

2. Map Your Project
Generate a "Cognitive Summary" of your current directory:

Bash
xplor map
3. Visualize Cognition
Open the xplor_graph.json in the Xplor Digital Explorer to see your functional "synapses" in 3D.

📂 Repository Structure
xplor/SKILL.md: The MCP entry point with automated triggers.

xplor/references/: Deep-logic modules for Code Mode and Document Mode.

xplor/scripts/: Tools for Traceability Audits and graph validation.

src/xplor_cli/: The core Python engine for static analysis and extraction.

🤝 Community & Contributions
Xplor is an evolving "Cognitive Infrastructure" layer. We welcome contributions that expand the engine's reach:

New Modes: Help us build specialized mapping for Medical (HIPAA), Finance (SEC), or other complex regulatory domains.

Graph Logic: Improve our score_graph.py logic to better detect logical contradictions in large-scale documentation.

UI/UX: Contribute to the xplor-explorer.jsx to make 3D relationship mapping even more intuitive.

Check out CONTRIBUTING.md (coming soon) for style guides and PR processes.

💰 Business & Enterprise
Xplor is built by RIDIS LLC. While the CLI and Skill are open-source, we offer enterprise-grade features via our cloud platform:

Cloud Sync: Securely store and version your knowledge graphs.

Multi-Domain Fusion: Combine code graphs with business logic and legal requirements.

Advanced Analytics: Scalable reasoning for 10,000+ node environments.

Visit Xplor.digital to learn more.

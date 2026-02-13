# Project Configuration

> **PM(ユーザと直接対話しているセッション)へ**: `.claude/PM.md` を読んでください。エージェント起動テンプレート、ワークフロー、契約管理の詳細があります。
>
> **Sub-agents(ユーザと直接対話できないセッション)へ**: 起動時に指定された `Allowed Paths` と、下記の `Layer-Specific Context Package` を確認してください。

---

## Modular Rules

Detailed guidelines: `~/.claude/rules/`

---

## Sub-Agent Definitions

| Agent | Purpose | Context Package |
|-------|---------|-----------------|
| planner | Planning (docs only) | `docs/contracts/*` + `docs/layers/[target]/*` |
| architect | Design (docs only) | `docs/contracts/*` + `docs/architecture/*` + `docs/layers/*` |
| code-reviewer | Code review | Target layer `src/*` + `tests/*` |
| tdd-guide | TDD | Target layer `src/*` + `tests/*` |
| security-reviewer | Security audit | All files (read), modification = proposal only |
| build-error-resolver | Build fix | Error-related files only |
| e2e-runner | E2E test | `tests/e2e/*` + `src/interface/*` |
| refactor-cleaner | Cleanup | Target layer `src/*` + `tests/*` |
| doc-updater | Documentation | `docs/**`, README.md, CLAUDE.md |

---

## Context Package Operation (Information Hiding)

### Core Principle (CRITICAL)

> **Agents do not explore outside Allowed Paths.**
> **"Just in case grep the whole thing" is PROHIBITED.**
> **If needed, request PM for Allowed Paths expansion.**

### Rules

1. **Reference Restriction**: Do not read files outside Context Package
2. **Contract Read-Only**: ALL agents cannot modify contracts (proposals only)
3. **Dependency Direction**: Domain <- Usecase <- Interface <- Infra

### MEMO.md Access

| Role | Access |
|------|--------|
| PM | All |
| Sub-agents | Own layer only |

---

## Layer-Specific Context Package

### Domain Layer
- `docs/contracts/dtos.md`
- `docs/layers/domain/*`
- `src/domain/**`, `tests/unit/domain/**`

### Usecase Layer
- `docs/contracts/ports.md`, `docs/contracts/dtos.md`
- `docs/layers/usecase/*`
- `src/usecase/**`, `tests/unit/usecase/**`
- `src/domain/**` (dependency reference only)

### Interface Layer
- `docs/contracts/api.md`, `docs/contracts/dtos.md`
- `docs/layers/interface/*`
- `src/interface/**`, `tests/unit/interface/**`
- `src/usecase/**` (dependency reference only)

### Infra Layer
- `docs/contracts/ports.md`
- `docs/layers/infra/*`
- `src/infra/**`, `tests/unit/infra/**`

---

## Agent Special Rules

### planner / architect
- **NO src access by default** (docs-based design)
- architect: PM must grant `Allowed Exception: src/[path]/**` for src access

### security-reviewer
- Full READ access (security audit exception)
- **Contract modification STILL PROHIBITED**
- Modifications = proposal or minimal security patch only

### doc-updater
- Read all files for documentation extraction
- Write access: `docs/**`, README.md, CLAUDE.md only

---

## Prohibited Actions (All Agents)

- Grep/glob on entire codebase
- Reading files outside Context Package
- Reading other agent's MEMO.md (except PM)
- Modifying contracts directly
- Bypassing dependency direction rules

---

## Required Output Format (Sub-Agents)

All sub-agents MUST include in their final response:

```markdown
## Changed Files
- [list of created/modified files]

## Contract Impact
- [any proposed changes to docs/contracts/* - proposals only]

## Tests
- [test files created/modified, coverage notes]

## Memo Update
- [summary to add to layer's MEMO.md]
```

---

## Single Source of Truth

| Document | Purpose | Owner |
|----------|---------|-------|
| `docs/requirements.md` | User requirements | PM (read-only for all) |
| `docs/contracts/dtos.md` | Data structures | PM only |
| `docs/contracts/ports.md` | Port interfaces | PM only |
| `docs/contracts/api.md` | External API | PM only |
| `docs/architecture/*` | Architecture decisions | architect (propose) → PM (approve) |
| `docs/layers/*/GOAL.md` | Layer responsibilities | PM only |
| `docs/layers/*/DESIGN.md` | Layer design details | planner (propose) → PM (approve) |
| `docs/layers/*/MEMO.md` | Working notes | Each layer's agent |

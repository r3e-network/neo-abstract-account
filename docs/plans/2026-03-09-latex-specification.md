# LaTeX Specification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a formal, paper-style LaTeX specification for the Neo Abstract Account system that is clear, standards-oriented, and detailed enough for implementers, auditors, and operators.

**Architecture:** Add a self-contained LaTeX document under `docs/specification/` that synthesizes the validated architecture, workflows, data flow, security boundaries, and testnet deployment status already present in the repo docs. Keep figures inside the `.tex` source using TikZ so the spec is reproducible without external image assets, and add a tiny README/Makefile for compilation.

**Tech Stack:** LaTeX, TikZ, booktabs/longtable/tabularx, shell build via `pdflatex`, lightweight Node regression test.

### Task 1: Add a failing specification test

**Files:**
- Create: `sdk/js/tests/specificationLatex.unit.test.js`

**Step 1: Write the failing test**
- Require `docs/specification/neo_abstract_account_spec.tex` to exist.
- Require the LaTeX source to include formal sections such as `Abstract`, `Architecture`, `Workflow`, `Data Flow`, `Security Considerations`, and `Recovery Verifiers`.
- Require the source to contain at least one `tikzpicture` and one `table` environment.

**Step 2: Run the test to verify it fails**
Run: `node --test sdk/js/tests/specificationLatex.unit.test.js`
Expected: FAIL because the spec file does not exist yet.

### Task 2: Write the LaTeX specification and build instructions

**Files:**
- Create: `docs/specification/neo_abstract_account_spec.tex`
- Create: `docs/specification/README.md`
- Create: `docs/specification/Makefile`

**Step 1: Draft the formal specification**
- Use article/paper structure with title, abstract, terminology, architecture, protocol workflows, data model, security, implementation notes, and recovery verifier appendix.
- Add figures for architecture, transaction/workflow lifecycle, and system/data-flow boundaries.
- Add tables for terminology, roles/scopes, execution paths, storage/state, and deployed recovery verifier hashes.

**Step 2: Add build instructions**
- Document how to compile the spec with `pdflatex`.
- Add a tiny `Makefile` target for convenience.

**Step 3: Run the test to verify it passes**
Run: `node --test sdk/js/tests/specificationLatex.unit.test.js`
Expected: PASS.

### Task 3: Compile and validate the LaTeX output

**Files:**
- Verify: `docs/specification/neo_abstract_account_spec.tex`

**Step 1: Compile the document**
Run: `cd docs/specification && pdflatex -interaction=nonstopmode neo_abstract_account_spec.tex`
Expected: PDF builds successfully.

**Step 2: Re-run once for stable references**
Run: `cd docs/specification && pdflatex -interaction=nonstopmode neo_abstract_account_spec.tex`
Expected: PDF builds successfully with references settled.

### Task 4: Link the spec from the docs index

**Files:**
- Modify: `docs/INDEX.md`

**Step 1: Add the LaTeX spec to the documentation index**
- Add a short entry pointing readers to the formal specification source and compile instructions.

**Step 2: Verify docs and spec references**
Run: `cd frontend && npm test -- tests/docsRendering.test.js`
Expected: PASS with no docs regressions.

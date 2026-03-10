# Neo Abstract Account LaTeX Specification

This folder contains a formal, paper-style LaTeX specification for the Neo Abstract Account system.

## Files

- `neo_abstract_account_spec.tex` — primary specification source
- `Makefile` — convenience build target

## Build

```bash
cd docs/specification
make
```

Or directly:

```bash
pdflatex -interaction=nonstopmode -output-directory /tmp/neo-aa-spec neo_abstract_account_spec.tex
pdflatex -interaction=nonstopmode -output-directory /tmp/neo-aa-spec neo_abstract_account_spec.tex
```

## Tracked PDF

- `neo_abstract_account_spec.pdf` — compiled reference PDF committed alongside the LaTeX source

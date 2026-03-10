SPEC=neo_abstract_account_spec
OUTDIR?=/tmp/neo-aa-spec

all:
	mkdir -p $(OUTDIR)
	pdflatex -interaction=nonstopmode -output-directory $(OUTDIR) $(SPEC).tex
	pdflatex -interaction=nonstopmode -output-directory $(OUTDIR) $(SPEC).tex

clean:
	rm -rf $(OUTDIR)

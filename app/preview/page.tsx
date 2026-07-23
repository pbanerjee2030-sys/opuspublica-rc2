export default function PreviewPage() {
  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">

        {/* ── Typography Scale ── */}
        <section className="mb-20">
          <h1 className="font-serif text-4xl font-semibold text-primary mb-1">
            Heading 1 — Newsreader Semibold
          </h1>
          <p className="text-xs text-text-secondary">Also used for article titles</p>

          <div className="mt-8 space-y-2">
            <h2 className="font-serif text-3xl font-semibold text-primary">
              Heading 2 — Newsreader Semibold
            </h2>
            <h3 className="font-serif text-2xl font-semibold text-primary">
              Heading 3 — Newsreader Semibold
            </h3>
            <h4 className="font-serif text-xl font-semibold text-primary">
              Heading 4 — Newsreader Semibold
            </h4>
            <h5 className="font-serif text-lg font-semibold text-primary">
              Heading 5 — Newsreader Semibold
            </h5>
            <h6 className="font-serif text-base font-semibold text-primary">
              Heading 6 — Newsreader Semibold
            </h6>
          </div>
        </section>

        {/* ── Accent Rule ── */}
        <section className="mb-20">
          <h3 className="font-serif text-2xl font-semibold text-primary mb-6">
            Accent Rules & Section Markers
          </h3>
          <div className="w-12 h-px bg-accent mb-2" />
          <div className="w-12 h-px bg-accent mb-2" />
          <div className="w-full h-px bg-border mt-6" />
        </section>

        {/* ── Article Layout ── */}
        <section className="mb-20 text-justify">
          <article style={{ maxWidth: '72ch' }}>
            <h1 className="font-serif text-4xl font-semibold text-primary leading-tight mb-4">
              The Role of International Law in Governing Artificial Intelligence: A Framework for Global Governance
            </h1>

            {/* Metadata block */}
            <div className="mb-6 pb-4 border-b border-border">
              <p className="text-sm text-text-secondary">
                <span className="font-semibold text-primary">Dr. Elena Marchetti</span>
                {' '}· University of Bologna
                {' '}<span className="text-accent">|</span>{' '}
                <span className="font-semibold text-primary">Prof. James Okonkwo</span>
                {' '}· University of Lagos
              </p>
              <p className="text-xs text-text-secondary mt-1">
                Published: 15 March 2026 · Accepted: 22 February 2026
                {' '}<span className="text-accent">|</span>{' '}
                DOI: <a href="#" className="text-primary underline decoration-accent underline-offset-2 hover:text-accent transition-colors">10.5555/ai-law-2026.01</a>
                {' '}<span className="text-accent">|</span>{' '}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-accent/10 text-accent">
                  CC BY 4.0
                </span>
              </p>
            </div>

            {/* Body text */}
            <div className="font-serif-body" style={{ fontSize: '1.1875rem', lineHeight: 1.7, color: '#23201A' }}>
              <p className="mb-5">
                The rapid advancement of artificial intelligence systems has outstripped the capacity of existing legal frameworks to regulate their development and deployment. This article examines the extent to which current international law — particularly humanitarian law, human rights law, and emerging digital governance instruments — can be applied to AI systems, and proposes a layered governance model that balances innovation with accountability.
              </p>
              <p className="mb-5">
                We argue that while existing legal principles provide a foundation, they are insufficient to address the unique challenges posed by autonomous decision-making, algorithmic bias, and the transnational nature of AI development. The patchwork of national regulations currently in place creates regulatory arbitrage opportunities and fails to protect vulnerable populations adequately.
              </p>
              <p className="mb-5">
                Drawing on comparative analysis of the European Union's AI Act, the OECD AI Principles, and emerging frameworks in Africa and Southeast Asia, this study identifies four structural gaps: (1) the absence of binding international obligations for AI safety, (2) inadequate mechanisms for cross-border accountability, (3) the lack of representative governance structures for affected communities, and (4) insufficient provisions for meaningful human oversight in high-stakes domains.
              </p>
              <p className="mb-5">
                We conclude by proposing a multi-stakeholder treaty framework that would establish minimum standards for AI development while remaining adaptive to technological change. Our model draws on precedents from international environmental law, particularly the Montreal Protocol and the Paris Agreement, to create a flexible yet binding architecture for global AI governance.
              </p>

              {/* Reference links */}
              <p className="text-sm text-text-secondary">
                <sup><a href="#" className="ref-link">1</a></sup> Russell, S. & Norvig, P. (2021). <em>Artificial Intelligence: A Modern Approach</em>. Pearson.
                <br />
                <sup><a href="#" className="ref-link">2</a></sup> European Commission (2024). The EU Artificial Intelligence Act.
                <br />
                <sup><a href="#" className="ref-link">3</a></sup> OECD (2023). OECD AI Principles Overview.
              </p>
            </div>
          </article>
        </section>

        {/* ── Buttons ── */}
        <section className="mb-20">
          <h3 className="font-serif text-2xl font-semibold text-primary mb-6">
            Buttons
          </h3>
          <div className="flex flex-wrap gap-4 items-center">
            <button className="px-5 py-2.5 text-sm font-semibold rounded bg-primary text-white hover:bg-primary-hover transition-colors">
              Primary Action
            </button>
            <button className="px-5 py-2.5 text-sm font-semibold rounded bg-accent text-primary hover:bg-accent-hover transition-colors">
              Accent Action
            </button>
            <button className="px-5 py-2.5 text-sm font-semibold rounded bg-surface text-text-secondary border border-border hover:bg-bg-alt transition-colors">
              Secondary
            </button>
            <button className="px-5 py-2.5 text-sm font-semibold text-accent hover:text-accent-hover underline decoration-accent underline-offset-2 transition-colors">
              Text Link
            </button>
          </div>
        </section>

        {/* ── Cards on Alt Background ── */}
        <section className="mb-20 p-10 -mx-4 sm:-mx-6 sm:px-6 bg-bg-alt">
          <h3 className="font-serif text-2xl font-semibold text-primary mb-6">
            Cards on Alt Background
          </h3>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="rounded-lg p-6 bg-surface border border-border">
              <h4 className="font-serif text-lg font-semibold text-primary mb-2">
                Journal of Global Policy
              </h4>
              <p className="text-xs font-mono text-accent mb-2">
                ISSN 1234-5678
              </p>
              <p className="text-sm leading-relaxed text-text text-justify">
                An interdisciplinary journal examining the intersection of international relations, public policy, and sustainable development.
              </p>
              <hr className="my-4 border-border" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-secondary">Quarterly · Open Access</span>
                <span className="text-xs font-semibold text-accent hover:text-accent-hover underline decoration-accent underline-offset-2 cursor-pointer transition-colors">Browse →</span>
              </div>
            </div>

            <div className="rounded-lg p-6 bg-surface border border-border">
              <h4 className="font-serif text-lg font-semibold text-primary mb-2">
                Technology & Society Review
              </h4>
              <p className="text-xs font-mono text-accent mb-2">
                ISSN 8765-4321
              </p>
              <p className="text-sm leading-relaxed text-text text-justify">
                Exploring the societal implications of emerging technologies, with a focus on governance, ethics, and human rights.
              </p>
              <hr className="my-4 border-border" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-secondary">Bi-annual · Open Access</span>
                <span className="text-xs font-semibold text-accent hover:text-accent-hover underline decoration-accent underline-offset-2 cursor-pointer transition-colors">Browse →</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Borders & Link Styles ── */}
        <section>
          <h3 className="font-serif text-2xl font-semibold text-primary mb-6">
            Borders & Link Styles
          </h3>
          <div className="flex flex-wrap gap-4 mb-8">
            <div className="rounded px-4 py-2 text-sm text-text-secondary border border-border">Default border</div>
            <div className="rounded px-4 py-2 text-sm text-text-secondary border border-border-strong">Strong border</div>
            <div className="rounded px-4 py-2 text-sm text-accent border border-accent">Accent border</div>
          </div>

          {/* Link styles — Oxford blue text with gold underline, hover goes gold */}
          <div className="space-y-2 text-sm">
            <p>
              <a href="#">Standard link</a> — Oxford blue text, gold underline, hover turns gold.
            </p>
            <p>
              <a href="#">Browse the journal</a> · <a href="#">View all articles</a> · <a href="#">Submission guidelines</a>
            </p>
            <p className="text-text-secondary">
              ISSN labels and secondary CTAs use{' '}
              <span className="text-accent font-semibold">antique gold</span>.
            </p>
          </div>
        </section>

      </div>
    </div>
  );
}

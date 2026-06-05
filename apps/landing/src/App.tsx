import { useEffect, useState, type ChangeEvent } from "react";

import {
  landingLadderRows,
  landingLocaleLabels,
  landingMessages,
  resolveLandingLocale,
  supportedLandingLocales,
  type LandingLocale,
} from "./landingContent";

const localeStorageKey = "prediction-ladder-landing-locale";

function getInitialLocale(): LandingLocale {
  try {
    const storedLocale = resolveLandingLocale(window.localStorage.getItem(localeStorageKey) ?? undefined);

    if (storedLocale) {
      return storedLocale;
    }
  } catch {
    // Ignore storage restrictions and fall back to the browser language.
  }

  const browserLocales = window.navigator.languages.length > 0
    ? window.navigator.languages
    : [window.navigator.language];

  for (const browserLocale of browserLocales) {
    const resolvedLocale = resolveLandingLocale(browserLocale);

    if (resolvedLocale) {
      return resolvedLocale;
    }
  }

  return "en";
}

export function App() {
  const [locale, setLocale] = useState<LandingLocale>(() => getInitialLocale());
  const landingContent = landingMessages[locale];

  useEffect(() => {
    document.documentElement.lang = locale;

    try {
      window.localStorage.setItem(localeStorageKey, locale);
    } catch {
      // The selector still works for the current session when storage is unavailable.
    }
  }, [locale]);

  function handleLocaleChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextLocale = resolveLandingLocale(event.currentTarget.value);

    if (nextLocale) {
      setLocale(nextLocale);
    }
  }

  return (
    <main className="landing">
      <HeroSection
        content={landingContent}
        locale={locale}
        onLocaleChange={handleLocaleChange}
      />
      <OperatorBrief content={landingContent} />
      <ValueCards content={landingContent} />
      <DifferentiationSection content={landingContent} />
      <SafetySection content={landingContent} />
      <WorkflowSection content={landingContent} />
      <PilotSection content={landingContent} />
      <LegalNote content={landingContent} />
    </main>
  );
}

type LandingContent = (typeof landingMessages)[LandingLocale];

function HeroSection({
  content,
  locale,
  onLocaleChange,
}: {
  content: LandingContent;
  locale: LandingLocale;
  onLocaleChange: (event: ChangeEvent<HTMLSelectElement>) => void;
}) {
  return (
    <section className="hero" id="top" aria-labelledby="hero-title">
      <header className="site-header">
        <a className="brand" href="#top" aria-label={`${content.brand} home`}>
          <span className="brand__mark">PL</span>
          <span className="brand__text">{content.brand}</span>
        </a>
        <div className="header-controls">
          <nav className="site-nav" aria-label={content.panelLabels.navigation}>
            <a href="#product">{content.nav.product}</a>
            <a href="#live-readiness">{content.nav.safety}</a>
            <a href="#pilot">{content.nav.workflow}</a>
          </nav>
          <label className="language-selector">
            <span>{content.languageLabel}</span>
            <select
              aria-label={content.languageLabel}
              value={locale}
              onChange={onLocaleChange}
            >
              {supportedLandingLocales.map((localeCode) => (
                <option key={localeCode} value={localeCode}>
                  {landingLocaleLabels[localeCode]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <div className="hero-layout">
        <div className="hero-copy">
          <p className="eyebrow">{content.hero.eyebrow}</p>
          <h1 id="hero-title">{content.hero.headline}</h1>
          <p className="hero-summary">{content.hero.subheadline}</p>

          <div className="cta-row" aria-label={content.panelLabels.landingCtas}>
            <a className="button button-primary" href="#pilot">
              {content.hero.primaryCta}
            </a>
            <a className="button button-secondary" href="#live-readiness">
              {content.hero.secondaryCta}
            </a>
          </div>

          <ul className="proof-strip" aria-label={content.panelLabels.proofPoints}>
            {content.hero.proofPoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
          <p className="availability-note">{content.hero.availability}</p>
        </div>

        <TerminalMockup content={content} />
      </div>
    </section>
  );
}

function TerminalMockup({ content }: { content: LandingContent }) {
  return (
    <aside className="terminal-mockup" aria-label={content.panelLabels.terminalMockup}>
      <div className="window-bar" aria-hidden="true">
        <span />
        <strong>{content.brand}</strong>
        <em>{content.terminal.mode}</em>
      </div>

      <div className="terminal-top-strip">
        <div>
          <span>{content.panelLabels.selectedMarket}</span>
          <strong>{content.terminal.activeMarket}</strong>
        </div>
        <div>
          <span>{content.panelLabels.venue}</span>
          <strong>{content.terminal.activeVenue}</strong>
        </div>
        <div>
          <span>{content.panelLabels.stream}</span>
          <strong>{content.terminal.streamState}</strong>
        </div>
      </div>

      <div className="terminal-grid">
        <section className="market-rail" aria-labelledby="market-rail-title">
          <PanelTitle
            id="market-rail-title"
            eyebrow={content.panelLabels.discovery}
            title={content.terminal.marketRailTitle}
          />
          <div className="search-box">{content.terminal.marketSearch}</div>
          <ul className="market-list">
            {content.marketRail.map((market) => (
              <li key={`${market.venue}-${market.title}`}>
                <div>
                  <span className={`venue-pill venue-pill-${market.venue.toLowerCase()}`}>
                    {market.venue}
                  </span>
                  <strong>{market.title}</strong>
                </div>
                <small>{market.detail}</small>
                <em>{market.state}</em>
              </li>
            ))}
          </ul>
        </section>

        <section className="ladder-workspace" aria-labelledby="ladder-title">
          <PanelTitle
            id="ladder-title"
            eyebrow={content.panelLabels.manualExecution}
            title={content.terminal.ladderTitle}
          />
          <div className="ladder-toolbar">
            <span>{content.terminal.oneClick}</span>
            <strong>{content.terminal.stake}</strong>
            <em>{content.terminal.preview}</em>
          </div>
          <div className="ladder-table" role="table" aria-label={content.panelLabels.ladderAria}>
            <div className="ladder-row ladder-row-head" role="row">
              <span role="columnheader">{content.panelLabels.bidSize}</span>
              <span role="columnheader">{content.panelLabels.bid}</span>
              <span role="columnheader">{content.panelLabels.price}</span>
              <span role="columnheader">{content.panelLabels.ask}</span>
              <span role="columnheader">{content.panelLabels.askSize}</span>
            </div>
            {landingLadderRows.map((row) => (
              <div className="ladder-row" role="row" key={row.price}>
                <span className="size size-bid" role="cell">
                  {row.bidSize}
                </span>
                <span className="quote quote-bid" role="cell">
                  {row.bid}
                </span>
                <span className="price" role="cell">
                  {row.price}
                </span>
                <span className="quote quote-ask" role="cell">
                  {row.ask}
                </span>
                <span className="size size-ask" role="cell">
                  {row.askSize}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="risk-rail" aria-labelledby="risk-rail-title">
          <PanelTitle
            id="risk-rail-title"
            eyebrow={content.panelLabels.preflight}
            title={content.terminal.riskRailTitle}
          />
          <div className="risk-banner">
            <span aria-hidden="true" />
            <p>{content.terminal.riskBanner}</p>
          </div>
          <dl className="risk-facts">
            {content.riskFacts.map((fact) => (
              <div className={`risk-fact risk-fact-${fact.tone}`} key={fact.label}>
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <section className="audit-strip" aria-labelledby="audit-title">
        <h3 id="audit-title">{content.terminal.auditTitle}</h3>
        <ol>
          {content.auditEvents.map((event) => (
            <li key={event}>{event}</li>
          ))}
        </ol>
      </section>
    </aside>
  );
}

function PanelTitle({ eyebrow, id, title }: { eyebrow: string; id: string; title: string }) {
  return (
    <div className="panel-title">
      <p>{eyebrow}</p>
      <h2 id={id}>{title}</h2>
    </div>
  );
}

function OperatorBrief({ content }: { content: LandingContent }) {
  return (
    <section className="section section-brief" aria-labelledby="brief-title">
      <div className="section-inner split-layout">
        <div>
          <p className="eyebrow">{content.operatorBrief.eyebrow}</p>
          <h2 id="brief-title">{content.operatorBrief.title}</h2>
        </div>
        <div className="brief-copy">
          <p>{content.operatorBrief.body}</p>
          <ul>
            {content.operatorBrief.highlights.map((highlight) => (
              <li key={highlight}>{highlight}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function ValueCards({ content }: { content: LandingContent }) {
  return (
    <section className="section" id="product" aria-labelledby="product-title">
      <div className="section-inner">
        <div className="section-heading">
          <p className="eyebrow">{content.sectionHeadings.terminalEyebrow}</p>
          <h2 id="product-title">{content.sectionHeadings.terminalTitle}</h2>
        </div>
        <div className="value-grid">
          {content.valueCards.map((card) => (
            <article className="value-card" key={card.title}>
              <span aria-hidden="true" />
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function DifferentiationSection({ content }: { content: LandingContent }) {
  return (
    <section className="section section-differentiation" aria-labelledby="differentiation-title">
      <div className="section-inner">
        <div className="section-heading">
          <p className="eyebrow">{content.sectionHeadings.differentiationEyebrow}</p>
          <h2 id="differentiation-title">{content.sectionHeadings.differentiationTitle}</h2>
        </div>
        <div className="comparison-grid" role="table" aria-label={content.panelLabels.positioningAria}>
          <div className="comparison-row comparison-head" role="row">
            <span role="columnheader">{content.panelLabels.category}</span>
            <span role="columnheader">{content.panelLabels.commonPattern}</span>
            <span role="columnheader">{content.panelLabels.stance}</span>
          </div>
          {content.differentiationRows.map((row) => (
            <div className="comparison-row" role="row" key={row.category}>
              <strong role="cell">{row.category}</strong>
              <span role="cell">{row.alternative}</span>
              <span role="cell">{row.focus}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SafetySection({ content }: { content: LandingContent }) {
  return (
    <section className="section section-safety" id="live-readiness" aria-labelledby="safety-title">
      <div className="section-inner safety-layout">
        <div>
          <p className="eyebrow">{content.safety.eyebrow}</p>
          <h2 id="safety-title">{content.safety.title}</h2>
          <p>{content.safety.body}</p>
        </div>
        <ul className="safety-gates" aria-label={content.panelLabels.safetyGatesAria}>
          {content.safety.gates.map((gate) => (
            <li key={gate}>{gate}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function WorkflowSection({ content }: { content: LandingContent }) {
  return (
    <section className="section" aria-labelledby="workflow-title">
      <div className="section-inner">
        <div className="section-heading">
          <p className="eyebrow">{content.sectionHeadings.workflowEyebrow}</p>
          <h2 id="workflow-title">{content.sectionHeadings.workflowTitle}</h2>
        </div>
        <div className="workflow-grid">
          {content.workflow.map((item) => (
            <article className="workflow-step" key={item.step}>
              <span>{item.step}</span>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function PilotSection({ content }: { content: LandingContent }) {
  return (
    <section className="section section-pilot" id="pilot" aria-labelledby="pilot-title">
      <div className="section-inner pilot-layout">
        <div>
          <p className="eyebrow">{content.pilot.eyebrow}</p>
          <h2 id="pilot-title">{content.pilot.title}</h2>
          <p>{content.pilot.body}</p>
          <div className="cta-row" aria-label={content.panelLabels.pilotCtas}>
            <a className="button button-primary" href="#pilot-title">
              {content.pilot.primaryCta}
            </a>
            <a className="button button-secondary" href="#live-readiness">
              {content.pilot.secondaryCta}
            </a>
          </div>
        </div>
        <ul className="pilot-deliverables" aria-label={content.panelLabels.pilotDeliverables}>
          {content.pilot.deliverables.map((deliverable) => (
            <li key={deliverable}>{deliverable}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function LegalNote({ content }: { content: LandingContent }) {
  return (
    <footer className="legal-note" aria-label="Legal and availability note">
      <p>{content.legalNote}</p>
    </footer>
  );
}

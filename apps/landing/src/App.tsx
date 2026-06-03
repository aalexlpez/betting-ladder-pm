import { getLandingTrustNotes, landingBootstrapConfig } from "./landingConfig";

export function App() {
  return (
    <main className="landing">
      <section className="intro" aria-labelledby="landing-title">
        <p className="eyebrow">{landingBootstrapConfig.surface}</p>
        <h1 id="landing-title">{landingBootstrapConfig.productName}</h1>
        <p className="summary">
          Bootstrap landing shell for the Windows prediction-market ladder terminal. The final
          download flow will be wired only after the Tauri installer build is available or its
          blocker is documented.
        </p>

        <dl className="status-row" aria-label="Landing bootstrap status">
          <div>
            <dt>Trading surface</dt>
            <dd>{landingBootstrapConfig.tradingSurface ? "yes" : "no"}</dd>
          </div>
          <div>
            <dt>Download</dt>
            <dd>{landingBootstrapConfig.downloadState}</dd>
          </div>
          <div>
            <dt>Shared UI status</dt>
            <dd>{landingBootstrapConfig.ui.implementationStatus}</dd>
          </div>
        </dl>

        <ul className="notes" aria-label="Trust notes">
          {getLandingTrustNotes().map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}

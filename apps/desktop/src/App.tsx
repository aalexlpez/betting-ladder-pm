import { desktopBootstrapConfig, getDesktopBootChecks } from "./appConfig";

export function App() {
  return (
    <main className="shell">
      <section className="boot-panel" aria-labelledby="boot-title">
        <p className="eyebrow">Windows desktop terminal bootstrap</p>
        <h1 id="boot-title">{desktopBootstrapConfig.productName}</h1>
        <p className="summary">
          Tauri, Vite, React, and TypeScript are wired. Trading features remain gated until
          domain, provider, risk, audit, and live approval goals are implemented.
        </p>

        <dl className="status-grid" aria-label="Bootstrap status">
          <div>
            <dt>Execution mode</dt>
            <dd>{desktopBootstrapConfig.executionMode}</dd>
          </div>
          <div>
            <dt>One-click</dt>
            <dd>{desktopBootstrapConfig.oneClickArmed ? "armed" : "off"}</dd>
          </div>
          <div>
            <dt>Live trading</dt>
            <dd>{desktopBootstrapConfig.liveTradingEnabled ? "enabled" : "blocked"}</dd>
          </div>
          <div>
            <dt>Core boundary</dt>
            <dd>{desktopBootstrapConfig.core.boundary}</dd>
          </div>
        </dl>

        <ul className="checks" aria-label="Safety checks">
          {getDesktopBootChecks().map((check) => (
            <li key={check}>{check}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}

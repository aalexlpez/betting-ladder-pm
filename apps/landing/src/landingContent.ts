export const supportedLandingLocales = ["en", "es", "ca"] as const;

export type LandingLocale = (typeof supportedLandingLocales)[number];

export const landingLocaleLabels: Record<LandingLocale, string> = {
  en: "English",
  es: "Castellano",
  ca: "Català",
};

export function isLandingLocale(value: string): value is LandingLocale {
  return supportedLandingLocales.includes(value as LandingLocale);
}

export function resolveLandingLocale(value: string | undefined): LandingLocale | null {
  if (!value) {
    return null;
  }

  const normalized = value.toLowerCase();
  const baseLocale = normalized.split("-")[0];

  if (isLandingLocale(normalized)) {
    return normalized;
  }

  if (baseLocale && isLandingLocale(baseLocale)) {
    return baseLocale;
  }

  return null;
}

export const landingMessages = {
  en: {
    brand: "Prediction Ladder",
    languageLabel: "Language",
    nav: {
      product: "Terminal",
      safety: "Live gates",
      workflow: "Access",
    },
    hero: {
      eyebrow: "Windows execution terminal for Polymarket and Kalshi",
      headline: "The ladder terminal for order-book traders.",
      subheadline:
        "Prediction Ladder turns prediction-market execution into a desktop trading workflow: provider-aware market discovery, dense price ladder, guarded one-click intent, local-first credentials, and live trading only after explicit safety gates pass.",
      primaryCta: "Get the Windows terminal",
      secondaryCta: "View live requirements",
      proofPoints: [
        "Windows-first terminal, not a web betslip",
        "Manual order-book workflow, not bots or signals",
        "Paper, dry-run, and gated live modes",
        "Local-first/no-custody operating posture",
      ],
      availability:
        "Windows access is available for qualified operators where provider and jurisdiction requirements are satisfied.",
    },
    terminal: {
      marketSearch: "Search: Fed, CPI, election, crypto",
      activeMarket: "Fed cuts rates before Sep. 18?",
      activeVenue: "Polymarket selected",
      streamState: "Official book: fresh required",
      mode: "Live gated",
      oneClick: "Guarded one-click: off",
      stake: "$25",
      preview: "BUY limit preview at 0.57",
      riskBanner:
        "Live blocked until legal approval, account metrics, fresh book, limits, acknowledgement, and audit pass.",
      marketRailTitle: "Market rail",
      ladderTitle: "Execution ladder",
      riskRailTitle: "Risk rail",
      auditTitle: "Audit / blotter",
    },
    panelLabels: {
      navigation: "Primary navigation",
      landingCtas: "Product actions",
      proofPoints: "Product proof points",
      terminalMockup: "Static Windows ladder terminal mockup",
      ladderAria: "Static bid and ask price ladder",
      pilotCtas: "Access actions",
      pilotDeliverables: "Windows terminal access includes",
      safetyGatesAria: "Live trading readiness gates",
      positioningAria: "Prediction Ladder positioning",
      discovery: "Discovery",
      manualExecution: "Manual execution",
      preflight: "Preflight",
      selectedMarket: "Selected market",
      venue: "Venue",
      stream: "Stream",
      bidSize: "Bid size",
      bid: "Bid",
      price: "Price",
      ask: "Ask",
      askSize: "Ask size",
      category: "Category",
      commonPattern: "Common pattern",
      stance: "Prediction Ladder stance",
    },
    sectionHeadings: {
      terminalEyebrow: "Terminal edge",
      terminalTitle: "A product shape that serious order-book traders can recognize.",
      differentiationEyebrow: "Market position",
      differentiationTitle: "Narrow enough to be credible, sharp enough to compete.",
      workflowEyebrow: "Operator workflow",
      workflowTitle: "The operating workspace for reading price, controlling stake, and managing live risk.",
    },
    marketRail: [
      {
        venue: "Poly",
        title: "Rate cut before September",
        state: "Selected",
        detail: "Spread 1c / depth visible",
      },
      {
        venue: "Kalshi",
        title: "CPI above forecast",
        state: "Watch",
        detail: "Credentials required for live",
      },
      {
        venue: "Poly",
        title: "Election margin market",
        state: "Paper",
        detail: "Dry-run available",
      },
    ],
    riskFacts: [
      { label: "Live mode", value: "Blocked by default", tone: "warn" },
      { label: "Kill switch", value: "Visible", tone: "good" },
      { label: "Credentials", value: "Local-first", tone: "neutral" },
      { label: "Audit", value: "Required", tone: "good" },
    ],
    auditEvents: [
      "Market selected from provider-aware rail",
      "Order preview created in dry-run mode",
      "Live gate rejected: legal approval required",
    ],
    operatorBrief: {
      eyebrow: "Why it exists",
      title: "Prediction markets now need execution software, not another discovery page.",
      body: "Native interfaces are built for broad participation. Serious ladder traders need fast price-level reading, explicit stake control, visible account/risk state, and quick cancelability without surrendering control to an automated strategy.",
      highlights: [
        "Queue and price levels are the first-class object.",
        "Risk state remains beside the order controls.",
        "Live readiness is visible before the operator can act.",
      ],
    },
    valueCards: [
      {
        title: "Ladder-first market work",
        body: "The core visual is the ladder: bid size, ask size, price levels, spread, selected stake, and order intent in one operating surface.",
      },
      {
        title: "Provider-aware by design",
        body: "Polymarket and Kalshi are treated as venues with their own readiness, credential, market-data, and live-adapter states.",
      },
      {
        title: "Guarded manual execution",
        body: "This is manual execution software, not a bot. It supports paper, dry-run, and gated live workflows with explicit rejection reasons.",
      },
      {
        title: "Local-first trust posture",
        body: "No cloud custody, no deposit flow, and no server-side wallet/key handling as the product direction.",
      },
    ],
    differentiationRows: [
      {
        category: "Native market pages",
        alternative: "Broad market browsing and betslip-style trading.",
        focus: "A Windows ladder workspace for repeated order-book decisions.",
      },
      {
        category: "Analytics dashboards",
        alternative: "Charts, watchlists, and research, with execution elsewhere.",
        focus: "Execution controls, risk state, and audit trail in the same screen.",
      },
      {
        category: "Bot or AI trading tools",
        alternative: "Opaque strategy, copied signals, or automated promises.",
        focus: "Manual control first; no automated trading or profit claims in the product.",
      },
      {
        category: "Custody-first terminals",
        alternative: "Hosted wallets or server-side signing expectations.",
        focus: "Local-first credentials and no-custody architecture.",
      },
    ],
    safety: {
      eyebrow: "Live-readiness is the product stance",
      title: "Live trading is possible only where permitted and only when the terminal proves readiness.",
      body: "Live execution remains gated by legal approval, jurisdiction checks, provider credential readiness, official market data freshness, account metrics, stake and exposure limits, kill switch state, explicit acknowledgement, and audit logging.",
      gates: [
        "Legal and jurisdiction approval",
        "No geoblock, KYC, sanctions, or platform-restriction evasion",
        "Provider-owned account metrics ready",
        "Fresh official order book",
        "Configured stake and exposure limits",
        "Audit enabled and kill switch visible",
      ],
    },
    workflow: [
      {
        step: "01",
        title: "Pick the market",
        body: "Search provider-aware markets and keep venue readiness visible before trading.",
      },
      {
        step: "02",
        title: "Read the ladder",
        body: "Work price levels, liquidity, spread, and freshness from a terminal-grade ladder.",
      },
      {
        step: "03",
        title: "Preview intent",
        body: "Choose stake and mode, then review deterministic rejection reasons before live action.",
      },
      {
        step: "04",
        title: "Execute and cancel",
        body: "When every gate passes, submit guarded limit orders and keep cancellation/audit visible.",
      },
    ],
    pilot: {
      eyebrow: "Windows terminal access",
      title: "Start with the professional ladder terminal.",
      body: "Get access to the Windows terminal, review the live-readiness requirements, and operate with paper, dry-run, and gated live modes where permitted.",
      deliverables: [
        "Windows desktop ladder terminal",
        "Provider-aware live market-data workflow",
        "Paper and live-dry-run operating modes",
        "Gated live execution where permitted",
      ],
      primaryCta: "Get the Windows terminal",
      secondaryCta: "Review live requirements",
    },
    legalNote:
      "Prediction markets and event contracts may be restricted in some jurisdictions. This product must not be used to evade geoblocks, KYC, sanctions, platform restrictions, or applicable law. Live execution requires human approval, provider availability, local credential readiness, configured limits, fresh official market data, explicit acknowledgement, and audit logging. No deposits, private keys, seed phrases, or API credentials are collected here.",
  },
  es: {
    brand: "Prediction Ladder",
    languageLabel: "Idioma",
    nav: {
      product: "Terminal",
      safety: "Controles live",
      workflow: "Acceso",
    },
    hero: {
      eyebrow: "Terminal Windows de ejecución para Polymarket y Kalshi",
      headline: "El terminal ladder para traders de order book.",
      subheadline:
        "Prediction Ladder convierte la ejecución en mercados de predicción en un flujo de trading desktop: descubrimiento de mercados por proveedor, ladder denso de precios, intención one-click protegida, credenciales local-first y trading live solo después de superar controles explícitos.",
      primaryCta: "Acceder al terminal Windows",
      secondaryCta: "Ver requisitos live",
      proofPoints: [
        "Terminal Windows-first, no un betslip web",
        "Workflow manual de order book, sin bots ni señales",
        "Modos paper, dry-run y live con gates",
        "Postura local-first y sin custodia",
      ],
      availability:
        "El acceso Windows está disponible para operadores cualificados donde se cumplan los requisitos de proveedor y jurisdicción.",
    },
    terminal: {
      marketSearch: "Buscar: Fed, CPI, elecciones, crypto",
      activeMarket: "¿La Fed baja tipos antes del 18 sep.?",
      activeVenue: "Polymarket seleccionado",
      streamState: "Book oficial: frescura requerida",
      mode: "Live gated",
      oneClick: "One-click protegido: off",
      stake: "$25",
      preview: "Preview BUY limit a 0.57",
      riskBanner:
        "Live bloqueado hasta que pasen aprobación legal, métricas de cuenta, book fresco, límites, acknowledgement y auditoría.",
      marketRailTitle: "Rail de mercados",
      ladderTitle: "Ladder de ejecución",
      riskRailTitle: "Rail de riesgo",
      auditTitle: "Auditoría / blotter",
    },
    panelLabels: {
      navigation: "Navegación principal",
      landingCtas: "Acciones de producto",
      proofPoints: "Pruebas del producto",
      terminalMockup: "Mockup estático del terminal Windows de ladder",
      ladderAria: "Ladder estático de precios bid y ask",
      pilotCtas: "Acciones de acceso",
      pilotDeliverables: "El acceso al terminal Windows incluye",
      safetyGatesAria: "Gates de readiness para trading live",
      positioningAria: "Posicionamiento de Prediction Ladder",
      discovery: "Discovery",
      manualExecution: "Ejecución manual",
      preflight: "Preflight",
      selectedMarket: "Mercado seleccionado",
      venue: "Venue",
      stream: "Stream",
      bidSize: "Tamaño bid",
      bid: "Bid",
      price: "Precio",
      ask: "Ask",
      askSize: "Tamaño ask",
      category: "Categoría",
      commonPattern: "Patrón común",
      stance: "Postura Prediction Ladder",
    },
    sectionHeadings: {
      terminalEyebrow: "Ventaja del terminal",
      terminalTitle: "Una forma de producto que los traders serios de order book reconocen.",
      differentiationEyebrow: "Posicionamiento de mercado",
      differentiationTitle: "Lo bastante estrecho para ser creíble, lo bastante nítido para competir.",
      workflowEyebrow: "Workflow del operador",
      workflowTitle: "El workspace operativo para leer precio, controlar stake y gestionar riesgo live.",
    },
    marketRail: [
      {
        venue: "Poly",
        title: "Bajada de tipos antes de septiembre",
        state: "Seleccionado",
        detail: "Spread 1c / profundidad visible",
      },
      {
        venue: "Kalshi",
        title: "CPI por encima del consenso",
        state: "Vigilar",
        detail: "Credenciales requeridas para live",
      },
      {
        venue: "Poly",
        title: "Mercado de margen electoral",
        state: "Paper",
        detail: "Dry-run disponible",
      },
    ],
    riskFacts: [
      { label: "Modo live", value: "Bloqueado por defecto", tone: "warn" },
      { label: "Kill switch", value: "Visible", tone: "good" },
      { label: "Credenciales", value: "Local-first", tone: "neutral" },
      { label: "Auditoría", value: "Requerida", tone: "good" },
    ],
    auditEvents: [
      "Mercado seleccionado desde rail provider-aware",
      "Preview de orden creado en modo dry-run",
      "Gate live rechazado: aprobación legal requerida",
    ],
    operatorBrief: {
      eyebrow: "Por qué existe",
      title: "Los mercados de predicción ya necesitan software de ejecución, no otra página de discovery.",
      body: "Las interfaces nativas están pensadas para participación amplia. Los traders serios de ladder necesitan leer niveles rápido, controlar stake de forma explícita, ver cuenta/riesgo y cancelar con rapidez sin ceder control a una estrategia automatizada.",
      highlights: [
        "Cola y niveles de precio son el objeto principal.",
        "El estado de riesgo permanece junto a los controles de orden.",
        "La preparación live es visible antes de poder actuar.",
      ],
    },
    valueCards: [
      {
        title: "Mercado trabajado desde ladder",
        body: "El visual central es el ladder: tamaños bid/ask, niveles de precio, spread, stake seleccionado e intención de orden en una sola superficie operativa.",
      },
      {
        title: "Provider-aware desde diseño",
        body: "Polymarket y Kalshi se tratan como venues con estados propios de readiness, credenciales, market data y adapters live.",
      },
      {
        title: "Ejecución manual protegida",
        body: "Software de ejecución manual, no un bot. Soporta paper, dry-run y live gated con motivos explícitos de rechazo.",
      },
      {
        title: "Confianza local-first",
        body: "Sin custodia cloud, sin flujo de depósitos y sin manejo server-side de wallets o claves como dirección de producto.",
      },
    ],
    differentiationRows: [
      {
        category: "Páginas nativas de mercado",
        alternative: "Browsing amplio y trading tipo betslip.",
        focus: "Workspace Windows de ladder para decisiones repetidas de order book.",
      },
      {
        category: "Dashboards analíticos",
        alternative: "Charts, watchlists e investigación, con ejecución en otro sitio.",
        focus: "Controles de ejecución, riesgo y audit trail en la misma pantalla.",
      },
      {
        category: "Herramientas bot o IA",
        alternative: "Estrategia opaca, señales copiadas o promesas automatizadas.",
        focus: "Control manual primero; sin trading automatizado ni claims de beneficio en el producto.",
      },
      {
        category: "Terminales custody-first",
        alternative: "Wallets alojadas o expectativa de firmado server-side.",
        focus: "Credenciales local-first y arquitectura sin custodia.",
      },
    ],
    safety: {
      eyebrow: "Live-readiness como postura de producto",
      title: "El trading live solo es posible donde esté permitido y cuando el terminal demuestre preparación.",
      body: "La ejecución live permanece gated por aprobación legal, revisión de jurisdicción, credenciales del proveedor, frescura de market data oficial, métricas de cuenta, límites de stake/exposición, estado del kill switch, acknowledgement explícito y auditoría.",
      gates: [
        "Aprobación legal y de jurisdicción",
        "Sin evasión de geoblocks, KYC, sanciones o restricciones de plataforma",
        "Métricas de cuenta provider-owned listas",
        "Order book oficial fresco",
        "Límites de stake y exposición configurados",
        "Auditoría activa y kill switch visible",
      ],
    },
    workflow: [
      {
        step: "01",
        title: "Elegir mercado",
        body: "Buscar mercados provider-aware y mantener visible la readiness del venue antes de operar.",
      },
      {
        step: "02",
        title: "Leer el ladder",
        body: "Trabajar niveles, liquidez, spread y frescura desde un ladder de terminal.",
      },
      {
        step: "03",
        title: "Previsualizar intención",
        body: "Elegir stake y modo, y revisar rechazos deterministas antes de cualquier acción live.",
      },
      {
        step: "04",
        title: "Ejecutar y cancelar",
        body: "Cuando todos los gates pasen, enviar órdenes limit protegidas y mantener cancelación/auditoría visibles.",
      },
    ],
    pilot: {
      eyebrow: "Acceso al terminal Windows",
      title: "Empieza con el terminal ladder profesional.",
      body: "Accede al terminal Windows, revisa los requisitos live y opera con modos paper, dry-run y live gated donde esté permitido.",
      deliverables: [
        "Terminal Windows desktop de ladder",
        "Workflow provider-aware con market data live",
        "Modos operativos paper y live-dry-run",
        "Ejecución live gated donde esté permitido",
      ],
      primaryCta: "Acceder al terminal Windows",
      secondaryCta: "Revisar requisitos live",
    },
    legalNote:
      "Los mercados de predicción y event contracts pueden estar restringidos en algunas jurisdicciones. Este producto no debe utilizarse para evadir geoblocks, KYC, sanciones, restricciones de plataforma o la ley aplicable. La ejecución live requiere aprobación humana, disponibilidad del proveedor, credenciales locales listas, límites configurados, market data oficial fresca, acknowledgement explícito y auditoría. Aquí no se recogen depósitos, claves privadas, seed phrases ni credenciales API.",
  },
  ca: {
    brand: "Prediction Ladder",
    languageLabel: "Idioma",
    nav: {
      product: "Terminal",
      safety: "Controls live",
      workflow: "Accés",
    },
    hero: {
      eyebrow: "Terminal Windows d'execució per a Polymarket i Kalshi",
      headline: "El terminal ladder per a traders d'order book.",
      subheadline:
        "Prediction Ladder converteix l'execució en mercats de predicció en un flux de trading desktop: descoberta de mercats per proveïdor, ladder dens de preus, intenció one-click protegida, credencials local-first i trading live només després de superar controls explícits.",
      primaryCta: "Accedir al terminal Windows",
      secondaryCta: "Veure requisits live",
      proofPoints: [
        "Terminal Windows-first, no un betslip web",
        "Workflow manual d'order book, sense bots ni senyals",
        "Modes paper, dry-run i live amb gates",
        "Postura local-first i sense custòdia",
      ],
      availability:
        "L'accés Windows està disponible per a operadors qualificats on es compleixin els requisits de proveïdor i jurisdicció.",
    },
    terminal: {
      marketSearch: "Cercar: Fed, CPI, eleccions, crypto",
      activeMarket: "La Fed baixa tipus abans del 18 set.?",
      activeVenue: "Polymarket seleccionat",
      streamState: "Book oficial: frescor requerida",
      mode: "Live gated",
      oneClick: "One-click protegit: off",
      stake: "$25",
      preview: "Preview BUY limit a 0.57",
      riskBanner:
        "Live bloquejat fins que passin aprovació legal, mètriques de compte, book fresc, límits, acknowledgement i auditoria.",
      marketRailTitle: "Rail de mercats",
      ladderTitle: "Ladder d'execució",
      riskRailTitle: "Rail de risc",
      auditTitle: "Auditoria / blotter",
    },
    panelLabels: {
      navigation: "Navegació principal",
      landingCtas: "Accions de producte",
      proofPoints: "Proves del producte",
      terminalMockup: "Mockup estàtic del terminal Windows de ladder",
      ladderAria: "Ladder estàtic de preus bid i ask",
      pilotCtas: "Accions d'accés",
      pilotDeliverables: "L'accés al terminal Windows inclou",
      safetyGatesAria: "Gates de readiness per a trading live",
      positioningAria: "Posicionament de Prediction Ladder",
      discovery: "Discovery",
      manualExecution: "Execució manual",
      preflight: "Preflight",
      selectedMarket: "Mercat seleccionat",
      venue: "Venue",
      stream: "Stream",
      bidSize: "Mida bid",
      bid: "Bid",
      price: "Preu",
      ask: "Ask",
      askSize: "Mida ask",
      category: "Categoria",
      commonPattern: "Patró comú",
      stance: "Postura Prediction Ladder",
    },
    sectionHeadings: {
      terminalEyebrow: "Avantatge del terminal",
      terminalTitle: "Una forma de producte que els traders seriosos d'order book reconeixen.",
      differentiationEyebrow: "Posicionament de mercat",
      differentiationTitle: "Prou estret per ser creïble, prou nítid per competir.",
      workflowEyebrow: "Workflow de l'operador",
      workflowTitle: "El workspace operatiu per llegir preu, controlar stake i gestionar risc live.",
    },
    marketRail: [
      {
        venue: "Poly",
        title: "Baixada de tipus abans de setembre",
        state: "Seleccionat",
        detail: "Spread 1c / profunditat visible",
      },
      {
        venue: "Kalshi",
        title: "CPI per sobre del consens",
        state: "Vigilar",
        detail: "Credencials requerides per a live",
      },
      {
        venue: "Poly",
        title: "Mercat de marge electoral",
        state: "Paper",
        detail: "Dry-run disponible",
      },
    ],
    riskFacts: [
      { label: "Mode live", value: "Bloquejat per defecte", tone: "warn" },
      { label: "Kill switch", value: "Visible", tone: "good" },
      { label: "Credencials", value: "Local-first", tone: "neutral" },
      { label: "Auditoria", value: "Requerida", tone: "good" },
    ],
    auditEvents: [
      "Mercat seleccionat des del rail provider-aware",
      "Preview d'ordre creat en mode dry-run",
      "Gate live rebutjat: aprovació legal requerida",
    ],
    operatorBrief: {
      eyebrow: "Per què existeix",
      title: "Els mercats de predicció ja necessiten software d'execució, no una altra pàgina de discovery.",
      body: "Les interfícies natives estan pensades per a participació àmplia. Els traders seriosos de ladder necessiten llegir nivells ràpidament, controlar stake de manera explícita, veure compte/risc i cancel·lar amb rapidesa sense cedir control a una estratègia automatitzada.",
      highlights: [
        "Cua i nivells de preu són l'objecte principal.",
        "L'estat de risc roman al costat dels controls d'ordre.",
        "La preparació live és visible abans que l'operador pugui actuar.",
      ],
    },
    valueCards: [
      {
        title: "Mercat treballat des del ladder",
        body: "El visual central és el ladder: mides bid/ask, nivells de preu, spread, stake seleccionat i intenció d'ordre en una sola superfície operativa.",
      },
      {
        title: "Provider-aware des del disseny",
        body: "Polymarket i Kalshi es tracten com a venues amb estats propis de readiness, credencials, market data i adapters live.",
      },
      {
        title: "Execució manual protegida",
        body: "Software d'execució manual, no un bot. Suporta paper, dry-run i live gated amb motius explícits de rebuig.",
      },
      {
        title: "Confiança local-first",
        body: "Sense custòdia cloud, sense flux de dipòsits i sense gestió server-side de wallets o claus com a direcció de producte.",
      },
    ],
    differentiationRows: [
      {
        category: "Pàgines natives de mercat",
        alternative: "Browsing ampli i trading tipus betslip.",
        focus: "Workspace Windows de ladder per a decisions repetides d'order book.",
      },
      {
        category: "Dashboards analítics",
        alternative: "Charts, watchlists i recerca, amb execució en un altre lloc.",
        focus: "Controls d'execució, risc i audit trail en la mateixa pantalla.",
      },
      {
        category: "Eines bot o IA",
        alternative: "Estratègia opaca, senyals copiades o promeses automatitzades.",
        focus: "Control manual primer; sense trading automatitzat ni claims de benefici en el producte.",
      },
      {
        category: "Terminals custody-first",
        alternative: "Wallets allotjades o expectativa de signatura server-side.",
        focus: "Credencials local-first i arquitectura sense custòdia.",
      },
    ],
    safety: {
      eyebrow: "Live-readiness com a postura de producte",
      title: "El trading live només és possible on estigui permès i quan el terminal demostri preparació.",
      body: "L'execució live roman gated per aprovació legal, revisió de jurisdicció, credencials del proveïdor, frescor de market data oficial, mètriques de compte, límits de stake/exposició, estat del kill switch, acknowledgement explícit i auditoria.",
      gates: [
        "Aprovació legal i de jurisdicció",
        "Sense evasió de geoblocks, KYC, sancions o restriccions de plataforma",
        "Mètriques de compte provider-owned llestes",
        "Order book oficial fresc",
        "Límits de stake i exposició configurats",
        "Auditoria activa i kill switch visible",
      ],
    },
    workflow: [
      {
        step: "01",
        title: "Triar mercat",
        body: "Cercar mercats provider-aware i mantenir visible la readiness del venue abans d'operar.",
      },
      {
        step: "02",
        title: "Llegir el ladder",
        body: "Treballar nivells, liquiditat, spread i frescor des d'un ladder de terminal.",
      },
      {
        step: "03",
        title: "Previsualitzar intenció",
        body: "Triar stake i mode, i revisar rebuigs deterministes abans de qualsevol acció live.",
      },
      {
        step: "04",
        title: "Executar i cancel·lar",
        body: "Quan tots els gates passin, enviar ordres limit protegides i mantenir cancel·lació/auditoria visibles.",
      },
    ],
    pilot: {
      eyebrow: "Accés al terminal Windows",
      title: "Comença amb el terminal ladder professional.",
      body: "Accedeix al terminal Windows, revisa els requisits live i opera amb modes paper, dry-run i live gated on estigui permès.",
      deliverables: [
        "Terminal Windows desktop de ladder",
        "Workflow provider-aware amb market data live",
        "Modes operatius paper i live-dry-run",
        "Execució live gated on estigui permès",
      ],
      primaryCta: "Accedir al terminal Windows",
      secondaryCta: "Revisar requisits live",
    },
    legalNote:
      "Els mercats de predicció i event contracts poden estar restringits en algunes jurisdiccions. Aquest producte no s'ha d'utilitzar per evadir geoblocks, KYC, sancions, restriccions de plataforma o la llei aplicable. L'execució live requereix aprovació humana, disponibilitat del proveïdor, credencials locals llestes, límits configurats, market data oficial fresca, acknowledgement explícit i auditoria. Aquí no es recullen dipòsits, claus privades, seed phrases ni credencials API.",
  },
} as const;

export const landingContent = landingMessages.en;

export const landingLadderRows = [
  { price: "0.62", bidSize: "$980", bid: "0.61", ask: "0.63", askSize: "$1,240" },
  { price: "0.61", bidSize: "$1,430", bid: "0.60", ask: "0.62", askSize: "$890" },
  { price: "0.60", bidSize: "$2,180", bid: "0.59", ask: "0.61", askSize: "$1,410" },
  { price: "0.59", bidSize: "$1,670", bid: "0.58", ask: "0.60", askSize: "$2,040" },
  { price: "0.58", bidSize: "$920", bid: "0.57", ask: "0.59", askSize: "$1,860" },
  { price: "0.57", bidSize: "$1,530", bid: "0.56", ask: "0.58", askSize: "$1,120" },
  { price: "0.56", bidSize: "$740", bid: "0.55", ask: "0.57", askSize: "$870" },
] as const;

export function getLandingCopyForReview(locale: LandingLocale = "en"): string {
  const landingContent = landingMessages[locale];

  return [
    landingContent.brand,
    landingContent.languageLabel,
    landingContent.hero.eyebrow,
    landingContent.hero.headline,
    landingContent.hero.subheadline,
    landingContent.hero.primaryCta,
    landingContent.hero.secondaryCta,
    landingContent.hero.availability,
    ...landingContent.hero.proofPoints,
    landingContent.terminal.riskBanner,
    landingContent.terminal.oneClick,
    landingContent.terminal.preview,
    ...landingContent.marketRail.flatMap((market) => [
      market.venue,
      market.title,
      market.state,
      market.detail,
    ]),
    ...landingContent.riskFacts.flatMap((fact) => [fact.label, fact.value]),
    ...landingContent.auditEvents,
    landingContent.operatorBrief.eyebrow,
    landingContent.operatorBrief.title,
    landingContent.operatorBrief.body,
    ...landingContent.operatorBrief.highlights,
    ...Object.values(landingContent.sectionHeadings),
    ...landingContent.valueCards.flatMap((card) => [card.title, card.body]),
    ...landingContent.differentiationRows.flatMap((row) => [
      row.category,
      row.alternative,
      row.focus,
    ]),
    landingContent.safety.eyebrow,
    landingContent.safety.title,
    landingContent.safety.body,
    ...landingContent.safety.gates,
    ...landingContent.workflow.flatMap((step) => [step.step, step.title, step.body]),
    landingContent.pilot.eyebrow,
    landingContent.pilot.title,
    landingContent.pilot.body,
    ...landingContent.pilot.deliverables,
    landingContent.pilot.primaryCta,
    landingContent.pilot.secondaryCta,
    landingContent.legalNote,
  ].join(" ");
}

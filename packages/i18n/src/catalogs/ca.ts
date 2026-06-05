import { localeNames } from "./localeNames";
import type { AppMessages } from "../types";

export const ca = {
  common: {
    productName: "Prediction Ladder",
    languageLabel: "Idioma",
    localeNames,
    statusLabels: {
      booleans: {
        no: "no",
        yes: "sí",
      },
      executionModes: {
        disabled: "desactivat",
        live: "live",
        live_blocked: "live bloquejat",
        live_dry_run: "live dry-run",
        paper: "paper",
      },
      implementationStatuses: {
        contracts_ready: "contractes llestos",
        domain_core_complete: "nucli de domini complet",
        official_runtime_streaming_ready: "runtime oficial streaming llest",
        read_only_adapters_ready: "adaptadors read-only llestos",
        scaffold_only: "només scaffold",
        tooling_ready: "tooling llest",
      },
      landingDownloadStates: {
        installer_pending_bootstrap: "instal·lador pendent de bootstrap",
      },
      liveTrading: {
        blocked: "bloquejat",
        enabled: "habilitat",
      },
      oneClick: {
        armed: "armat",
        off: "apagat",
      },
    },
    legalNotes: {
      jurisdictionRestrictions:
        "Els mercats de predicció poden estar restringits segons la jurisdicció; l'ús live ha de passar les portes legals i d'elegibilitat de plataforma.",
      liveRequiresApproval:
        "El trading live continua bloquejat fins que passin les portes legal, geogràfica, de credencials, risc, auditoria i reconeixement explícit.",
      noBypass:
        "El producte no s'ha d'utilitzar per saltar-se geobloquejos, KYC, sancions, restriccions de plataforma ni la llei aplicable.",
    },
  },
  desktop: {
    eyebrow: "Bootstrap de terminal d'escriptori Windows",
    summary:
      "Tauri, Vite, React i TypeScript estan connectats. Les funcions de trading continuen bloquejades fins que s'implementin els objectius de domini, proveïdors, risc, auditoria i aprovació live.",
    statusGridAria: "Estat de bootstrap",
    checksAria: "Comprovacions de seguretat",
    statusLabels: {
      coreBoundary: "Límit del core",
      executionMode: "Mode d'execució",
      liveTrading: "Trading live",
      oneClick: "Un clic",
    },
    statusValues: {
      coreBoundary: "límit de domini llest",
    },
    checks: {
      liveExecutionDisabledByDefault: "L'execució live està desactivada per defecte",
      oneClickOffByDefault: "El trading amb un clic està apagat per defecte",
      rendererSecretSafe:
        "El renderer no té accés al sistema de fitxers, shell, SDK de proveïdors ni secrets",
      providersDeferred:
        "Les integracions de proveïdors s'ajornen intencionadament fins a l'objectiu de market-data",
    },
    terminal: {
      ariaLabel: "Shell de terminal Prediction Ladder",
      title: "Terminal ladder preparada per a proveidors",
      subtitle:
        "Primer shell Windows de trading amb estats honestos de proveidors, ladder, risc, portes i auditoria. Aquest objectiu no crida APIs externes.",
      sections: {
        auditLog: "Log d'auditoria",
        executionModes: "Modes d'execucio",
        gates: "Resum de portes live",
        ladder: "Workspace de ladder",
        marketSearch: "Cerca de mercats",
        metrics: "Metriques financeres",
        openOrders: "Ordres obertes",
        orderPreview: "Preview d'ordre",
        providers: "Proveidors",
        risk: "Controls de risc",
        riskLimits: "Limits de risc",
        stake: "Presets de stake",
        venueHealth: "Estat de venues",
      },
      labels: {
        account: "Compte",
        allVenues: "Tots els venues",
        allVenuesShort: "Tots",
        adapter: "Adapter",
        askSize: "Mida ask",
        audit: "Auditoria",
        available: "Disponible",
        back: "Back",
        bidSize: "Mida bid",
        build: "Build",
        connection: "Connexio",
        current: "Actual",
        dataFreshness: "Frescor de dades",
        gate: "Porta",
        killSwitch: "Kill switch",
        market: "Mercat",
        manualStake: "Stake manual",
        maxExposure: "Exposicio maxima",
        maxStake: "Stake maxim",
        mode: "Mode",
        moreAvailable: "Hi ha mes",
        noLiveData: "Sense dades live",
        oneClick: "Un clic",
        pageEnd: "Fi de pagina",
        price: "Preu",
        keyboard: "Teclat",
        lay: "Lay",
        provider: "Proveedor",
        resultCount: "Resultats",
        selected: "Seleccionat",
        side: "Costat",
        status: "Estat",
        stake: "Stake",
        submit: "Submit",
        cancel: "Cancel",
        subject: "Subjecte",
        quantity: "Quantitat",
        unified: "Unificat",
        websocket: "Stream",
      },
      actions: {
        armed: "Armat",
        cancelLiveOrder: "Cancel-lar ordre live",
        createPaperOrder: "Crear ordre paper",
        killSwitch: "Kill switch visible",
        loadMore: "Carregar mes",
        loadingMore: "Carregant mes",
        liveCancelPending: "Cancel-lant",
        off: "Apagat",
        previewOnly: "Nomes preview",
        runFirstLiveSmoke: "Crear ordre live",
        liveSmokePending: "Enviant ordre live",
        liveSmokeResult: "Resultat ordre live",
        runDryRun: "Executar dry-run",
        search: "Cercar",
        searching: "Cercant",
      },
      placeholders: {
        accountMetricsPending:
          "Les metriques de compte del proveidor son desconegudes fins que existeixin adapters read-only i resums de compte segurs per a credencials.",
        ladderNoBook: "No hi ha order book carregat",
        marketSearch: "Cerca llesta, adapters pendents",
        notConnected: "no connectat",
        notQueried: "no consultat",
        noAuditEvents: "No hi ha esdeveniments d'auditoria carregats",
        keyboardShortcutsPending:
          "Les dreceres d'ordre per teclat encara no estan cablejades; els clics Back/Lay creen previews segurs d'OrderIntent.",
        ladderClickBlocked:
          "La columna de preu nomes previsualitza nivells; Back/Lay crea previews d'OrderIntent amb controls de risc i auditoria.",
        manualStake: "Introdueix stake",
        noMarketSelected: "No hi ha mercat seleccionat",
        noOpenOrders: "No hi ha ordres obertes carregades",
        noSubmitPath: "No hi ha ruta d'enviament exposada",
        liveSubmitPath: "Ruta live Tauri llesta",
        unknown: "Desconegut",
      },
      ladderStates: {
        disconnected: "desconnectat",
        empty: "buit",
        error: "error",
        fresh: "fresc",
        loading: "carregant",
        no_market: "sense mercat",
        stale: "stale",
      },
      gates: {
        account_metrics: "Metriques de compte",
        acknowledgement: "Reconeixement",
        audit: "Auditoria",
        credential: "Credencial",
        geo: "Geo",
        legal: "Legal",
        local_approval: "Aprovacio local",
        live: "Live",
      },
      metrics: {
        available_funds: "Fons disponibles",
        exposure: "Exposicio",
        open_order_amount: "Import en ordres obertes",
        pnl: "PnL",
      },
      riskAlerts: {
        title: "Ordre bloquejada",
        summary:
          "El clic a la ladder ha creat un preview, pero la validacio de risc ha bloquejat l'ordre.",
        diagnosticsTitle: "Lectura de compte usada",
        fundsDiagnosticNote:
          "Prediction Ladder refresca la cache CLOB de balance/allowance de Polymarket abans d'aquesta lectura. Si la web mostra un altre valor, confirma si es valor de portfolio o cash pUSD disponible per operar, i revisa que signer, funder, tipus de signatura, allowance i deposit-wallet setup pertanyin al mateix compte.",
        reasonsTitle: "Motius de bloqueig",
        codeLabel: "Codi",
        close: "Tancar",
        diagnostics: {
          provider: "Proveidor",
          market: "Mercat",
          accountMetrics: "Metriques de compte",
          metricsSource: "Font de metriques",
          availableFundsRead: "Fons disponibles llegits",
          openOrderAmount: "Import en ordres obertes",
          positionExposure: "Exposicio per posicions",
          providerExposure: "Exposicio del proveidor",
          marketExposure: "Exposicio del mercat",
          checkedAt: "Revisat a",
        },
        reasons: {
          market_not_selected: "Selecciona un mercat abans de crear una ordre.",
          order_book_not_fresh:
            "L'order book no es prou fresc per a una ordre.",
          price_not_aligned_to_tick:
            "El preu no respecta el tick d'aquest mercat.",
          stake_not_configured: "Tria un stake abans d'ordenar.",
          execution_disabled: "El mode d'execucio esta desactivat.",
          kill_switch_active_for_risk_increasing_action:
            "El kill switch esta actiu; les noves ordres que augmenten risc estan bloquejades.",
          legal_gate_not_approved:
            "El gate legal no esta aprovat per al trading live.",
          c1_approval_missing:
            "Falta l'aprovacio C1 administrativa o regulatoria.",
          geo_blocked:
            "L'elegibilitat geo o de plataforma bloqueja el trading live.",
          geo_unknown: "L'elegibilitat geo o de plataforma es desconeguda.",
          credentials_missing: "Falten credencials del proveidor.",
          local_approval_missing: "Falta l'aprovacio local de l'app.",
          one_click_not_armed: "Un clic no esta armat.",
          first_live_ack_missing:
            "Falta el reconeixement explicit del primer live.",
          stake_exceeds_limit:
            "El stake supera el limit configurat per ordre.",
          exposure_exceeds_limit:
            "L'exposicio projectada supera el limit del mercat.",
          available_funds_unknown: "Els fons disponibles son desconeguts.",
          insufficient_available_funds:
            "Fons disponibles insuficients per a aquesta ordre.",
          provider_exposure_unknown:
            "L'exposicio del proveidor es desconeguda.",
          market_exposure_unknown: "L'exposicio del mercat es desconeguda.",
          marketable_order_not_approved:
            "Aquest preu creuaria el spread; les ordres marketable no estan aprovades.",
          position_unknown: "La disponibilitat de posicio es desconeguda.",
          c0_risk_detected: "S'ha detectat un risc C0 de no-go.",
          fee_disclosure_missing: "Falta acceptar la divulgacio de fees.",
          order_intent_missing: "No existeix cap intent d'ordre per enviar.",
          audit_log_not_enabled: "L'auditoria no esta activada.",
          invalid_price: "El preu es invalid.",
          invalid_stake: "El stake es invalid.",
          invalid_exposure: "L'exposicio es invalida.",
          invalid_available_funds: "El valor de fons disponibles es invalid.",
          invalid_risk_limit:
            "La configuracio de limits de risc es invalida.",
        },
      },
      providerOnboarding: {
        setupEyebrow: "Configuracio de compte del proveidor",
        close: "Tancar configuracio del proveidor",
        stepsAria: "Passos de configuracio del proveidor",
        steps: {
          guide: "Guia",
          reference: "Importacio segura",
          review: "Revisio",
        },
        actions: {
          back: "Enrere",
          connect: "Connectar",
          finalApproval: "Validacions finals",
          next: "Seguent",
        },
        guideAria: "Guia de credencials",
        guideIntro:
          "Fes servir aquesta pantalla com a checklist. Primer prepara la credencial al compte del proveidor, despres torna aqui i fes servir la importacio local d'un clic o introdueix nomes l'ID/ruta font com a fallback. Prediction Ladder importa el material de credencials a emmagatzematge local xifrat propietat de Tauri; React mai demana seed phrases, API secrets en brut, passphrases, signatures ni payloads signats.",
        guideLinkAria: "Referencia oficial de credencials",
        guides: {
          polymarket: [
            {
              title: "Autenticacio CLOB de Polymarket",
              url: "https://docs.polymarket.com/api-reference/authentication",
              summary:
                "L'autenticacio CLOB de Polymarket es basa en signer. El flux normal d'escriptori importa un signer local una vegada a emmagatzematge xifrat propietat de Tauri; una API key web per si sola no pot signar ordres.",
            },
            {
              title: "Guia de deposit wallet de Polymarket",
              url: "https://docs.polymarket.com/trading/deposit-wallets",
              summary:
                "Revisa el model de wallet, tipus de signatura i funder que Polymarket espera abans d'intentar readiness live.",
            },
            {
              title: "Collateral pUSD de Polymarket",
              url: "https://docs.polymarket.com/concepts/pusd",
              summary:
                "Polymarket fa servir pUSD com a collateral de trading; si falta saldo pUSD, el preflight live continua bloquejat.",
            },
          ],
          kalshi: [
            {
              title: "API keys de Kalshi",
              url: "https://docs.kalshi.com/getting_started/api_keys",
              summary:
                "Genera el Key ID i desa la descarrega RSA d'una sola vegada; l'app importa aquesta clau local a emmagatzematge xifrat propietat de Tauri.",
            },
            {
              title: "Perfil de Kalshi",
              url: "https://kalshi.com/account/profile",
              summary:
                "Obre la pagina de perfil de compte on Kalshi exposa la seccio API Keys.",
            },
          ],
        },
        recommendedImport: "Importacio app-managed recomanada",
        polymarket: {
          secureImportAria: "Importacio segura de Polymarket",
          connectTitle: "Connecta la teva wallet",
          description:
            "Copia la key exportada des de Magic, torna aqui i connecta. Tauri llegeix el valor copiat al proces principal, troba els comptes candidats de Polymarket i mostra pUSD llest per operar sense exposar la key a React. L'address Perfil/API de Polymarket Settings es nomes un fallback avancat opcional.",
          magicExportTitle: "Cami rapid per a comptes email/Magic",
          magicExportDescription:
            "Obre Magic, exporta la signer key, copia-la i connecta aqui.",
          magicExportButton: "Export from Magic",
          signerPrivateKeyLabel: "Signer private key",
          securePastePlaceholder: "Key o URL de Magic copiada al clipboard",
          rememberDeviceLabel: "Recordar en aquest dispositiu",
          connectedAsLabel: "Connectat com",
          availableSuffix: "disponible",
          connectButton: "Connect",
          clipboardImportButton: "Importar key copiada",
          clipboardImportNote:
            "Fes clic al camp o a Connect despres de copiar des de Magic. Tauri llegeix la key, la xifra localment i neteja el clipboard despres d'una importacio correcta.",
          advancedImportLabel: "Fallback avancat: importar des d'un fitxer signer local",
          steps: [
            "Fes clic a Export from Magic. L'app obre https://reveal.magic.link/polymarket al navegador del sistema, no dins de la finestra de trading.",
            "Inicia sessio a Magic amb el mateix email que fas servir a Polymarket, fes clic a Export Private Key i copia la key revelada una sola vegada. No copiies mai una recovery phrase / seed phrase.",
            "Opcionalment obre https://polymarket.com/settings, entra a Perfil i copia l'address 0x marcada per a us d'API. Fes servir aquesta address de Perfil/API publica nomes amb Signature Type Proxy / Magic. Si ho deixes buit, Tauri deriva comptes candidates Magic des del signer, afegeix addresses 0x publiques trobades a l'export de Magic i et deixa triar-ne una despres.",
            "Si Polymarket ha mogut el teu compte al flux Deposit Wallet, tria Deposit wallet / POLY_1271 a sota i enganxa la deposit wallet address que te pUSD en comptes de l'address Perfil/API.",
            "Prem Importar key copiada. Tauri llegeix el clipboard de Windows al proces principal, valida el signer mes funder opcional/tipus de signatura, desa una copia xifrada app-managed del signer, neteja el clipboard despres d'una importacio correcta, deriva comptes candidates, conserva candidates publiques de l'export de Magic i refresca balance/allowance CLOB abans de revisar fons.",
            "Si el teu compte de Polymarket es va crear amb una wallet externa en comptes d'email/Magic, exporta nomes la key d'un compte de wallet dedicat des d'aquesta wallet i fes servir el fallback avancat de fitxer signer local de sota.",
            "Si despres el preflight diu que falta saldo pUSD, allowance, funder o deposit-wallet setup, arregla-ho primer a Polymarket; aquesta app no diposita fons, no retira fons, no crea deposit wallets ni salta restriccions del proveidor.",
          ],
          signerSourceLabel: "Ruta font d'importacio signer d'una sola vegada",
          signerSourcePlaceholder:
            "C:\\Users\\you\\Documents\\polymarket-signer.local.key",
          tradingAddressLabel: "Address opcional de Settings/Perfil",
          tradingAddressPlaceholder: "0x... des de Polymarket Settings",
          tradingAddressNote:
            "Per a Proxy / Magic, l'address Perfil/API de Polymarket Settings > Profile es opcional en importar; deixar-la buida permet que Tauri derivi comptes candidates des del signer i inspeccioni addresses 0x publiques incloses a l'export de Magic. Per a Deposit Wallet / POLY_1271, enganxa la deposit wallet address que te pUSD o tria la candidata deposit-wallet emmascarada de l'export de Magic despres d'importar. La signer key signa; la funder address seleccionada es on Polymarket revisa fons pUSD, allowance, posicions i ordres obertes.",
          signatureTypeLabel: "Tipus de signatura",
          signatureTypeOptions: {
            eoa: "Address EOA del signer",
            proxy: "Compte Proxy / Magic (recomanat)",
            gnosisSafe: "Gnosis Safe",
            poly1271: "Deposit wallet / POLY_1271",
          },
          importNote:
            "Enganxa nomes una ruta de fitxer de Windows, mai el text de la clau. El proces principal de Tauri llegeix el fitxer una vegada, rebutja material semblant a seed phrase, escriu una copia local xifrada sota el proveidor de credencials de l'app i mai retorna signer material a React.",
        },
        kalshi: {
          secureImportAria: "Importacio segura de Kalshi",
          description:
            "Kalshi es configura des de la pagina API Keys del teu compte. Copies l'API Key ID mostrat en aquesta pantalla i importes el fitxer `.key` descarregat mitjancant la seva ruta. No enganxis el contingut del `.key` a React.",
          steps: [
            "Obre https://kalshi.com/account/profile al navegador i inicia sessio al compte de Kalshi que vols fer servir.",
            "Busca la seccio API Keys. Si ets en una altra pagina d'ajustos, fes servir Account & security o Profile Settings i despres API Keys.",
            "Fes clic a Create New API Key o Create Key. Si Kalshi demana un nom, fes servir un nom reconeixible com Prediction Ladder.",
            "Abans de tancar la pagina de Kalshi, desa el fitxer `.key` descarregat en un lloc que puguis trobar, per exemple Documents\\kalshi.key. Si ja vas tancar la pagina sense desar el fitxer, crea una nova API key.",
            "Copia l'API Key ID que mostra Kalshi. Normalment sembla un UUID, per exemple a952bcbe-ec3b-4b5b-b8f9-11dae589608c. Enganxa'l al camp API Key ID de sota.",
            "A Windows File Explorer, fes clic dret sobre el fitxer `.key` descarregat, tria Copy as path i enganxa aquesta ruta completa al camp de ruta font `.key`. Treu les cometes si Windows les ha enganxat.",
            "Prem Connect. Tauri valida la clau RSA, importa una copia xifrada app-managed i la fa servir nomes al proces principal per signar requests de Kalshi.",
            "Si l'app mostra `kalshi_key_file_invalid`, crea una nova API key de Kalshi sense xifrat/passphrase. Si Kalshi retorna 401/unauthorized, verifica que el Key ID i el fitxer `.key` surtin de la mateixa pantalla de creacio.",
          ],
          apiKeyIdLabel: "API Key ID",
          apiKeyIdPlaceholder: "Kalshi API Key ID",
          keySourceLabel: "Ruta font d'importacio .key d'una sola vegada",
          keySourcePlaceholder: "C:\\path\\kalshi.key",
          importNote:
            "Enganxa nomes el Key ID i una ruta de fitxer de Windows. Connect desa el Key ID mes una copia local app-managed xifrada del material de clau. React mai rep el contingut de la clau, auth headers, signatures, payloads signats ni identificadors complets de compte.",
        },
        review: {
          aria: "Revisio de configuracio del proveidor",
          provider: "Proveidor",
          credential: "Credencial",
          accountMetrics: "Metriques de compte",
          tradeReadyCash: "Cash llest per operar",
          publicPortfolio: "Valor public de posicions",
          accountDiagnostics: "Diagnostic avancat de comptes",
          candidateAccounts: "Comptes candidates detectats",
          configuredCandidate: "configurada",
          recommendedCandidate: "Recomanada per senyal de fons del compte",
          tradeReadyCashUnavailable: "cash llest per operar no disponible",
          portfolioUnavailable: "valor de portfolio no disponible",
          useCandidate: "Usar aquest compte",
          liveSubmit: "Enviament live",
          liveSubmitBlocked: "bloquejat fins que passin totes les portes",
          reasonMessages: {
            credentials_missing:
              "La credencial del proveidor no esta llesta. Revisa el motiu especific de credencial a sota.",
            credential_source_missing:
              "No hi ha cap font de credencial app-managed usable per a aquest proveidor.",
            polymarket_clipboard_signer_missing:
              "No s'ha trobat cap signer key de Polymarket al clipboard de Windows.",
            polymarket_clipboard_signer_invalid:
              "El valor copiat no conte una signer key valida de Polymarket. Copia la key 0x de Magic o el text/URL d'export de Magic que la conte. No enganxis seed phrases.",
            polymarket_local_signer_file_missing:
              "Falta la font d'importacio signer de Polymarket.",
            polymarket_local_signer_file_invalid:
              "La font d'importacio signer de Polymarket no es una signer key local valida.",
            polymarket_signature_type_missing:
              "Tria el tipus de signatura de Polymarket abans d'importar.",
            polymarket_signature_type_invalid:
              "El tipus de signatura de Polymarket seleccionat no esta suportat.",
            polymarket_trading_address_missing:
              "Introdueix l'address de Perfil/API de Polymarket des de https://polymarket.com/settings.",
            polymarket_trading_address_invalid:
              "La trading/funder address de Polymarket ha de ser una address 0x valida.",
            polymarket_trading_address_zero:
              "L'address zero no es pot fer servir com a trading/funder address de Polymarket.",
            polymarket_trading_address_not_allowed_for_eoa:
              "El mode EOA fa servir directament l'address del signer; elimina la trading/funder address separada o tria Proxy / Magic.",
            polymarket_trading_address_signer_mismatch:
              "Aquest chequeig local antic de mismatch ja no es fa servir per a comptes Magic/Proxy. Reimporta el signer Magic amb l'address de Perfil/API de Polymarket des de settings i refresca preflight.",
            kalshi_api_key_id_missing:
              "Introdueix l'API Key ID de Kalshi de la mateixa pantalla de creacio que el fitxer .key.",
            kalshi_key_file_missing:
              "Importa el fitxer .key de Kalshi descarregat mitjancant la seva ruta local.",
            kalshi_key_file_invalid:
              "El fitxer .key de Kalshi no es una private key RSA sense xifrar parseable.",
            kalshi_key_file_encrypted_passphrase_not_supported:
              "Els fitxers .key xifrats de Kalshi no estan suportats; crea una API key sense passphrase per a signatura local.",
          },
          note:
            "Connect desa el perfil del proveidor mitjancant Tauri i una copia local xifrada app-managed de la credencial quan cal. Quan les credencials estan llestes, l'onboarding obre l'ultim pas d'aprovacio legal/local per a aquest proveidor. El trading live continua desactivat fins que passin preflight, legal, geo, compte, mercat, risc, auditoria, kill-switch, reconeixement, politica non-marketable i gates d'adapter.",
        },
      },
      legalApproval: {
        setupEyebrow: "Gate de responsabilitat live",
        title: "Aprovacio legal",
        close: "Tancar aprovacio legal",
        openAction: "Obrir aprovacio legal",
        statusAria: "Estat d'aprovacio legal",
        statusTitle: "Aprovacio legal",
        formIntro:
          "Completa aixo per al proveidor que operaras. Tauri escriu l'aprovacio local no commitejada; la resta de gates live continuen corrent abans que una ordre pugui sortir de l'app.",
        providerLabel: "Proveidor",
        fields: {
          targetJurisdiction: "Jurisdiccio objectiu",
          targetJurisdictionPlaceholder: "Pais/regio per a trading live",
          operatorIdentity: "Identitat de l'operador",
          operatorIdentityPlaceholder: "Persona o entitat real autoritzada",
          approver: "Aprovador / responsable de risc",
          approverPlaceholder: "Responsable huma que aprova",
          maxStakeFirstOrder: "Stake maxim primera ordre",
          maxMarketExposure: "Exposicio maxima de mercat",
        },
        checksTitle: "Declaracions obligatories",
        checksIntro:
          "Revisa totes les declaracions de sota. La casella unica les confirma totes juntes; Tauri continua validant cada declaracio per separat i retorna blockers exactes si falta aquesta aprovacio.",
        checks: {
          platformEligible:
            "He revisat l'elegibilitat del proveidor/plataforma per a aquest compte i ubicacio.",
          realOperator:
            "L'operador es una persona o entitat real autoritzada.",
          realBeneficialOwners:
            "Els beneficiaris finals son reals i no s'amaguen ni son ficticis.",
          realAccountOwner:
            "El propietari del compte o wallet del proveidor es real i autoritzat.",
          noGeoblockBypass:
            "No s'esta saltant cap geoblock, restriccio de plataforma o control de regio bloquejada.",
          noVpnBypass:
            "No es fa servir VPN, proxy, region spoofing ni routing ocult per saltar restriccions.",
          noFakeKyc:
            "No es fa servir identitat falsa, KYC fals, entitat falsa ni beneficiari final fals.",
          noSanctionsBypass:
            "No s'esta saltant cap restriccio de sancions, AML o compte.",
          noCustody:
            "Prediction Ladder no custodia fons, seed phrases, private keys ni signing en backend.",
          c0ReviewPass:
            "La revisio C0 esta neta: no hi ha bloqueig criminal, sancions, evasions AML/KYC, custodia ni acces no autoritzat.",
          c1RiskAccepted:
            "El risc C1 administratiu/regulatori esta aprovat pel responsable del negoci o no aplica.",
          auditEnabled:
            "L'auditoria local redactada continua activa per a intents live.",
          firstLiveSmokeOnly:
            "Les ordres live d'aquesta sessio son nomes BUY, stake petit, limit/GTC/post-only/non-marketable, amb cancel-lacio manual disponible.",
          noDepositsOrWithdrawals:
            "Aquesta app no diposita, retira, wrap, unwrap ni salta restriccions de funding del proveidor.",
          understandsRisk:
            "Entenc que tenir credencials i KYC del proveidor no autoritza per si sol trading live en aquesta app.",
        },
        singleApprovalToggle:
          "Aprovo totes les declaracions obligatories anteriors i reconec la politica d'ordres live per a aquesta sessio.",
        singleApprovalNote:
          "Aquesta es una aprovacio explicita del flux, no una drecera: si alguna declaracio no es certa, no aprovis aquest gate. El reconeixement de sessio es pot revocar reiniciant o canviant l'estat.",
        acknowledgementToggle:
          "Reconeixer la politica d'ordres live per a aquesta sessio.",
        acknowledgementNote:
          "Aquest reconeixement es separat de l'aprovacio legal i es pot revocar reiniciant o canviant l'estat.",
        actions: {
          submit: "Aprovar gate local",
          cancel: "Cancel-lar",
        },
        readyNote:
          "L'aprovacio legal/local esta llesta per a aquest proveidor. Preflight encara pot bloquejar per metriques de compte, mercat, adapter, risc, kill-switch o reconeixement.",
        blockedNote:
          "L'aprovacio legal/local no esta llesta. Completa tots els camps i declaracions del proveidor seleccionat.",
      },
    },
  },
  landing: {
    surface: "landing estàtica",
    summary:
      "Shell bootstrap de landing per a la terminal Windows de ladder de mercats de predicció. El flux final de descàrrega es connectarà només quan existeixi el build de l'instal·lador Tauri o se'n documenti el bloqueig.",
    statusRowAria: "Estat de bootstrap de landing",
    trustNotesAria: "Notes de confiança",
    statusLabels: {
      download: "Descàrrega",
      sharedUiStatus: "Estat de UI compartida",
      tradingSurface: "Superfície de trading",
    },
    trustNotes: {
      desktopDistribution: "Superfície de distribució de producte desktop-first",
      installerPending:
        "L'enllaç de l'instal·lador continua pendent fins que l'empaquetat Tauri funcioni",
      noCustody:
        "Sense dipòsits, custòdia, claus privades ni execució de trading en el codi de landing",
    },
  },
} satisfies AppMessages;

import { localeNames } from "./localeNames";
import type { AppMessages } from "../types";

export const es = {
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
        disabled: "desactivado",
        live: "live",
        live_blocked: "live bloqueado",
        live_dry_run: "live dry-run",
        paper: "paper",
      },
      implementationStatuses: {
        contracts_ready: "contratos listos",
        domain_core_complete: "dominio core completo",
        official_runtime_streaming_ready: "runtime oficial streaming listo",
        read_only_adapters_ready: "adaptadores read-only listos",
        scaffold_only: "solo scaffold",
        tooling_ready: "tooling listo",
      },
      landingDownloadStates: {
        installer_pending_bootstrap: "instalador pendiente de bootstrap",
      },
      liveTrading: {
        blocked: "bloqueado",
        enabled: "habilitado",
      },
      oneClick: {
        armed: "armado",
        off: "apagado",
      },
    },
    legalNotes: {
      jurisdictionRestrictions:
        "Los mercados de predicción pueden estar restringidos según la jurisdicción; el uso live debe pasar las puertas legales y de elegibilidad de plataforma.",
      liveRequiresApproval:
        "El trading live permanece bloqueado hasta que pasen las puertas legal, geográfica, de credenciales, riesgo, auditoría y reconocimiento explícito.",
      noBypass:
        "El producto no debe usarse para saltarse geobloqueos, KYC, sanciones, restricciones de plataforma ni la ley aplicable.",
    },
  },
  desktop: {
    eyebrow: "Bootstrap de terminal de escritorio Windows",
    summary:
      "Tauri, Vite, React y TypeScript están conectados. Las funciones de trading siguen bloqueadas hasta que se implementen los objetivos de dominio, proveedores, riesgo, auditoría y aprobación live.",
    statusGridAria: "Estado de bootstrap",
    checksAria: "Comprobaciones de seguridad",
    statusLabels: {
      coreBoundary: "Límite del core",
      executionMode: "Modo de ejecución",
      liveTrading: "Trading live",
      oneClick: "Un clic",
    },
    statusValues: {
      coreBoundary: "límite de dominio listo",
    },
    checks: {
      liveExecutionDisabledByDefault: "La ejecución live está desactivada por defecto",
      oneClickOffByDefault: "El trading con un clic está apagado por defecto",
      rendererSecretSafe:
        "El renderer no tiene acceso al sistema de archivos, shell, SDK de proveedores ni secretos",
      providersDeferred:
        "Las integraciones de proveedores se aplazan intencionadamente hasta el objetivo de market-data",
    },
    terminal: {
      ariaLabel: "Shell de terminal Prediction Ladder",
      title: "Terminal ladder preparada para proveedores",
      subtitle:
        "Primer shell Windows de trading con estados honestos de proveedores, ladder, riesgo, puertas y auditoria. Este objetivo no llama APIs externas.",
      sections: {
        auditLog: "Log de auditoria",
        executionModes: "Modos de ejecucion",
        gates: "Resumen de puertas live",
        ladder: "Workspace de ladder",
        marketSearch: "Busqueda de mercados",
        metrics: "Metricas financieras",
        openOrders: "Ordenes abiertas",
        orderPreview: "Preview de orden",
        providers: "Proveedores",
        risk: "Controles de riesgo",
        riskLimits: "Limites de riesgo",
        stake: "Presets de stake",
        venueHealth: "Estado de venues",
      },
      labels: {
        account: "Cuenta",
        allVenues: "Todos los venues",
        allVenuesShort: "Todos",
        adapter: "Adapter",
        askSize: "Tamano ask",
        audit: "Auditoria",
        available: "Disponible",
        back: "Back",
        bidSize: "Tamano bid",
        build: "Build",
        connection: "Conexion",
        current: "Actual",
        dataFreshness: "Frescura de datos",
        gate: "Puerta",
        killSwitch: "Kill switch",
        market: "Mercado",
        manualStake: "Stake manual",
        maxExposure: "Exposicion maxima",
        maxStake: "Stake maximo",
        mode: "Modo",
        moreAvailable: "Hay mas",
        noLiveData: "Sin datos live",
        oneClick: "Un clic",
        pageEnd: "Fin de pagina",
        price: "Precio",
        keyboard: "Teclado",
        lay: "Lay",
        provider: "Proveedor",
        resultCount: "Resultados",
        selected: "Seleccionado",
        side: "Lado",
        status: "Estado",
        stake: "Stake",
        submit: "Submit",
        cancel: "Cancel",
        subject: "Sujeto",
        quantity: "Cantidad",
        unified: "Unificado",
        websocket: "Stream",
      },
      actions: {
        armed: "Armado",
        cancelLiveOrder: "Cancelar orden live",
        createPaperOrder: "Crear orden paper",
        killSwitch: "Kill switch visible",
        loadMore: "Cargar mas",
        loadingMore: "Cargando mas",
        liveCancelPending: "Cancelando",
        off: "Apagado",
        previewOnly: "Solo preview",
        runFirstLiveSmoke: "Crear orden live",
        liveSmokePending: "Enviando orden live",
        liveSmokeResult: "Resultado orden live",
        runDryRun: "Ejecutar dry-run",
        search: "Buscar",
        searching: "Buscando",
      },
      placeholders: {
        accountMetricsPending:
          "Las metricas de cuenta del proveedor son desconocidas hasta que existan adapters read-only y resumenes de cuenta seguros para credenciales.",
        ladderNoBook: "No hay order book cargado",
        marketSearch: "Busqueda lista, adapters pendientes",
        notConnected: "no conectado",
        notQueried: "no consultado",
        noAuditEvents: "No hay eventos de auditoria cargados",
        keyboardShortcutsPending:
          "Los atajos de orden por teclado no estan cableados aun; los clics Back/Lay crean previews seguros de OrderIntent.",
        ladderClickBlocked:
          "La columna de precio solo previsualiza niveles; Back/Lay crea previews de OrderIntent con checks de riesgo y auditoria.",
        manualStake: "Introduce stake",
        noMarketSelected: "No hay mercado seleccionado",
        noOpenOrders: "No hay ordenes abiertas cargadas",
        noSubmitPath: "No hay ruta de envio expuesta",
        liveSubmitPath: "Ruta live Tauri lista",
        unknown: "Desconocido",
      },
      ladderStates: {
        disconnected: "desconectado",
        empty: "vacio",
        error: "error",
        fresh: "fresco",
        loading: "cargando",
        no_market: "sin mercado",
        stale: "stale",
      },
      gates: {
        account_metrics: "Metricas de cuenta",
        acknowledgement: "Reconocimiento",
        audit: "Auditoria",
        credential: "Credencial",
        geo: "Geo",
        legal: "Legal",
        local_approval: "Aprobacion local",
        live: "Live",
      },
      metrics: {
        available_funds: "Fondos disponibles",
        exposure: "Exposicion",
        open_order_amount: "Importe en ordenes abiertas",
        pnl: "PnL",
      },
      riskAlerts: {
        title: "Orden bloqueada",
        summary:
          "El clic en la ladder creo un preview, pero la validacion de riesgo bloqueo la orden.",
        diagnosticsTitle: "Lectura de cuenta usada",
        fundsDiagnosticNote:
          "Prediction Ladder refresca el cache CLOB de balance/allowance de Polymarket antes de esta lectura. Si la web muestra otro valor, confirma si es valor de portfolio o cash pUSD disponible para operar, y revisa que signer, funder, tipo de firma, allowance y deposit-wallet setup pertenezcan a la misma cuenta.",
        reasonsTitle: "Motivos de bloqueo",
        codeLabel: "Codigo",
        close: "Cerrar",
        diagnostics: {
          provider: "Proveedor",
          market: "Mercado",
          accountMetrics: "Metricas de cuenta",
          metricsSource: "Fuente de metricas",
          availableFundsRead: "Fondos leidos disponibles",
          openOrderAmount: "Importe en ordenes abiertas",
          positionExposure: "Exposicion por posiciones",
          providerExposure: "Exposicion del proveedor",
          marketExposure: "Exposicion del mercado",
          checkedAt: "Revisado en",
        },
        reasons: {
          market_not_selected: "Selecciona un mercado antes de crear una orden.",
          order_book_not_fresh:
            "El order book no esta suficientemente fresco para una orden.",
          price_not_aligned_to_tick:
            "El precio no respeta el tick de este mercado.",
          stake_not_configured: "Elige un stake antes de ordenar.",
          execution_disabled: "El modo de ejecucion esta desactivado.",
          kill_switch_active_for_risk_increasing_action:
            "El kill switch esta activo; las nuevas ordenes que aumentan riesgo estan bloqueadas.",
          legal_gate_not_approved:
            "El gate legal no esta aprobado para trading live.",
          c1_approval_missing:
            "Falta la aprobacion C1 administrativa o regulatoria.",
          geo_blocked:
            "La elegibilidad geo o de plataforma bloquea el trading live.",
          geo_unknown: "La elegibilidad geo o de plataforma es desconocida.",
          credentials_missing: "Faltan credenciales del proveedor.",
          local_approval_missing: "Falta la aprobacion local de la app.",
          one_click_not_armed: "Un clic no esta armado.",
          first_live_ack_missing:
            "Falta el reconocimiento explicito del primer live.",
          stake_exceeds_limit:
            "El stake supera el limite configurado por orden.",
          exposure_exceeds_limit:
            "La exposicion proyectada supera el limite del mercado.",
          available_funds_unknown: "Los fondos disponibles son desconocidos.",
          insufficient_available_funds:
            "Fondos disponibles insuficientes para esta orden.",
          provider_exposure_unknown:
            "La exposicion del proveedor es desconocida.",
          market_exposure_unknown: "La exposicion del mercado es desconocida.",
          marketable_order_not_approved:
            "Este precio cruzaria el spread; las ordenes marketable no estan aprobadas.",
          position_unknown: "La disponibilidad de posicion es desconocida.",
          c0_risk_detected: "Se detecto un riesgo C0 de no-go.",
          fee_disclosure_missing: "Falta aceptar la divulgacion de fees.",
          order_intent_missing: "No existe un intento de orden para enviar.",
          audit_log_not_enabled: "La auditoria no esta activada.",
          invalid_price: "El precio es invalido.",
          invalid_stake: "El stake es invalido.",
          invalid_exposure: "La exposicion es invalida.",
          invalid_available_funds:
            "El valor de fondos disponibles es invalido.",
          invalid_risk_limit:
            "La configuracion de limites de riesgo es invalida.",
        },
      },
      providerOnboarding: {
        setupEyebrow: "Configuracion de cuenta del proveedor",
        close: "Cerrar configuracion del proveedor",
        stepsAria: "Pasos de configuracion del proveedor",
        steps: {
          guide: "Guia",
          reference: "Importacion segura",
          review: "Revision",
        },
        actions: {
          back: "Atras",
          connect: "Conectar",
          finalApproval: "Validaciones finales",
          next: "Siguiente",
        },
        guideAria: "Guia de credenciales",
        guideIntro:
          "Usa esta pantalla como checklist. Primero prepara la credencial en la cuenta del proveedor, luego vuelve aqui y usa la importacion local de un clic o introduce solo el ID/ruta fuente como fallback. Prediction Ladder importa el material de credenciales a almacenamiento local cifrado propiedad de Tauri; React nunca pide seed phrases, API secrets en bruto, passphrases, firmas ni payloads firmados.",
        guideLinkAria: "Referencia oficial de credenciales",
        guides: {
          polymarket: [
            {
              title: "Autenticacion CLOB de Polymarket",
              url: "https://docs.polymarket.com/api-reference/authentication",
              summary:
                "La autenticacion CLOB de Polymarket se basa en signer. El flujo normal de escritorio importa un signer local una vez en almacenamiento cifrado propiedad de Tauri; una API key web por si sola no puede firmar ordenes.",
            },
            {
              title: "Guia de deposit wallet de Polymarket",
              url: "https://docs.polymarket.com/trading/deposit-wallets",
              summary:
                "Revisa el modelo de wallet, tipo de firma y funder que Polymarket espera antes de intentar readiness live.",
            },
            {
              title: "Collateral pUSD de Polymarket",
              url: "https://docs.polymarket.com/concepts/pusd",
              summary:
                "Polymarket usa pUSD como collateral de trading; si falta saldo pUSD, preflight live sigue bloqueado.",
            },
          ],
          kalshi: [
            {
              title: "API keys de Kalshi",
              url: "https://docs.kalshi.com/getting_started/api_keys",
              summary:
                "Genera el Key ID y guarda la descarga RSA de una sola vez; la app importa esa clave local a almacenamiento cifrado propiedad de Tauri.",
            },
            {
              title: "Perfil de Kalshi",
              url: "https://kalshi.com/account/profile",
              summary:
                "Abre la pagina de perfil de cuenta donde Kalshi expone la seccion API Keys.",
            },
          ],
        },
        recommendedImport: "Importacion app-managed recomendada",
        polymarket: {
          secureImportAria: "Importacion segura de Polymarket",
          connectTitle: "Conecta tu wallet",
          description:
            "Copia la key exportada desde Magic, vuelve aqui y conecta. Tauri lee el valor copiado en el proceso principal, encuentra las cuentas candidatas de Polymarket y muestra pUSD listo para operar sin exponer la key a React. La address Perfil/API de Polymarket Settings es solo un fallback avanzado opcional.",
          magicExportTitle: "Camino rapido para cuentas email/Magic",
          magicExportDescription:
            "Abre Magic, exporta la signer key, copiala y conecta aqui.",
          magicExportButton: "Export from Magic",
          signerPrivateKeyLabel: "Signer private key",
          securePastePlaceholder: "Key o URL de Magic copiada en el clipboard",
          rememberDeviceLabel: "Recordar en este dispositivo",
          connectedAsLabel: "Conectado como",
          availableSuffix: "disponible",
          connectButton: "Connect",
          clipboardImportButton: "Importar key copiada",
          clipboardImportNote:
            "Haz clic en el campo o en Connect despues de copiar desde Magic. Tauri lee la key, la cifra localmente y limpia el clipboard tras una importacion correcta.",
          advancedImportLabel: "Fallback avanzado: importar desde archivo signer local",
          steps: [
            "Haz clic en Export from Magic. La app abre https://reveal.magic.link/polymarket en tu navegador del sistema, no dentro de la ventana de trading.",
            "Inicia sesion en Magic con el mismo email que usas en Polymarket, haz clic en Export Private Key y copia la key revelada una sola vez. Nunca copies una recovery phrase / seed phrase.",
            "Opcionalmente abre https://polymarket.com/settings, entra en Perfil y copia la address 0x marcada para uso de API. Usa esa Direccion de Perfil/API publica solo con Signature Type Proxy / Magic. Si lo dejas vacio, Tauri deriva cuentas candidatas Magic desde el signer, anade addresses 0x publicas encontradas en el export de Magic y te deja elegir una despues.",
            "Si Polymarket movio tu cuenta al flujo Deposit Wallet, elige Deposit wallet / POLY_1271 abajo y pega la deposit wallet address que tiene pUSD en vez de la Direccion Perfil/API.",
            "Pulsa Importar key copiada. Tauri lee el clipboard de Windows en el proceso principal, valida el signer mas funder opcional/tipo de firma, guarda una copia cifrada app-managed del signer, limpia el clipboard tras una importacion correcta, deriva cuentas candidatas, conserva candidatas publicas del export de Magic y refresca balance/allowance CLOB antes de revisar fondos.",
            "Si tu cuenta de Polymarket fue creada con una wallet externa en vez de email/Magic, exporta solo la key de una cuenta de wallet dedicada desde esa wallet y usa el fallback avanzado de archivo signer local de abajo.",
            "Si despues el preflight dice que falta saldo pUSD, allowance, funder o deposit-wallet setup, arreglalo primero en Polymarket; esta app no deposita fondos, no retira fondos, no crea deposit wallets ni salta restricciones del proveedor.",
          ],
          signerSourceLabel: "Ruta fuente de importacion signer de una sola vez",
          signerSourcePlaceholder:
            "C:\\Users\\you\\Documents\\polymarket-signer.local.key",
          tradingAddressLabel: "Address opcional de Settings/Perfil",
          tradingAddressPlaceholder: "0x... desde Polymarket Settings",
          tradingAddressNote:
            "Para Proxy / Magic, la Direccion Perfil/API de Polymarket Settings > Profile es opcional al importar; dejarla vacia permite que Tauri derive cuentas candidatas desde el signer e inspeccione addresses 0x publicas incluidas en el export de Magic. Para Deposit Wallet / POLY_1271, pega la deposit wallet address que tiene pUSD o elige la candidata deposit-wallet enmascarada del export de Magic tras importar. La signer key firma; la funder address seleccionada es donde Polymarket revisa fondos pUSD, allowance, posiciones y ordenes abiertas.",
          signatureTypeLabel: "Tipo de firma",
          signatureTypeOptions: {
            eoa: "Address EOA del signer",
            proxy: "Cuenta Proxy / Magic (recomendado)",
            gnosisSafe: "Gnosis Safe",
            poly1271: "Deposit wallet / POLY_1271",
          },
          importNote:
            "Pega solo una ruta de archivo de Windows, nunca el texto de la clave. El proceso principal de Tauri lee el archivo una vez, rechaza material parecido a seed phrase, escribe una copia local cifrada bajo el proveedor de credenciales de la app y nunca devuelve signer material a React.",
        },
        kalshi: {
          secureImportAria: "Importacion segura de Kalshi",
          description:
            "Kalshi se configura desde la pagina API Keys de tu cuenta. Copias el API Key ID mostrado en esta pantalla e importas el archivo `.key` descargado mediante su ruta. No pegues el contenido del `.key` en React.",
          steps: [
            "Abre https://kalshi.com/account/profile en tu navegador e inicia sesion en la cuenta de Kalshi que quieres usar.",
            "Busca la seccion API Keys. Si estas en otra pagina de ajustes, usa Account & security o Profile Settings y luego API Keys.",
            "Haz clic en Create New API Key o Create Key. Si Kalshi pide un nombre, usa algo reconocible como Prediction Ladder.",
            "Antes de cerrar la pagina de Kalshi, guarda el archivo `.key` descargado en un lugar que puedas encontrar, por ejemplo Documents\\kalshi.key. Si ya cerraste la pagina sin guardar el archivo, crea una nueva API key.",
            "Copia el API Key ID que muestra Kalshi. Normalmente parece un UUID, por ejemplo a952bcbe-ec3b-4b5b-b8f9-11dae589608c. Pegalo en el campo API Key ID de abajo.",
            "En Windows File Explorer, haz clic derecho sobre el archivo `.key` descargado, elige Copy as path y pega esa ruta completa en el campo de ruta fuente `.key`. Quita las comillas si Windows las pego.",
            "Pulsa Connect. Tauri valida la clave RSA, importa una copia cifrada app-managed y la usa solo en el proceso principal para firmar requests de Kalshi.",
            "Si la app muestra `kalshi_key_file_invalid`, crea una nueva API key de Kalshi sin cifrado/passphrase. Si Kalshi devuelve 401/unauthorized, verifica que el Key ID y el archivo `.key` salieron de la misma pantalla de creacion.",
          ],
          apiKeyIdLabel: "API Key ID",
          apiKeyIdPlaceholder: "Kalshi API Key ID",
          keySourceLabel: "Ruta fuente de importacion .key de una sola vez",
          keySourcePlaceholder: "C:\\path\\kalshi.key",
          importNote:
            "Pega solo el Key ID y una ruta de archivo de Windows. Connect guarda el Key ID mas una copia local app-managed cifrada del material de clave. React nunca recibe el contenido de la clave, auth headers, firmas, payloads firmados ni identificadores completos de cuenta.",
        },
        review: {
          aria: "Revision de configuracion del proveedor",
          provider: "Proveedor",
          credential: "Credencial",
          accountMetrics: "Metricas de cuenta",
          tradeReadyCash: "Cash listo para operar",
          publicPortfolio: "Valor publico de posiciones",
          accountDiagnostics: "Diagnostico avanzado de cuentas",
          candidateAccounts: "Cuentas candidatas detectadas",
          configuredCandidate: "configurada",
          recommendedCandidate: "Recomendada por senal de fondos de cuenta",
          tradeReadyCashUnavailable: "cash listo para operar no disponible",
          portfolioUnavailable: "valor de portfolio no disponible",
          useCandidate: "Usar esta cuenta",
          liveSubmit: "Envio live",
          liveSubmitBlocked: "bloqueado hasta que pasen todas las puertas",
          reasonMessages: {
            credentials_missing:
              "La credencial del proveedor no esta lista. Revisa el motivo especifico de credencial abajo.",
            credential_source_missing:
              "No hay una fuente de credencial app-managed usable para este proveedor.",
            polymarket_clipboard_signer_missing:
              "No se encontro una signer key de Polymarket en el clipboard de Windows.",
            polymarket_clipboard_signer_invalid:
              "El valor copiado no contiene una signer key valida de Polymarket. Copia la key 0x de Magic o el texto/URL de export de Magic que la contiene. No pegues seed phrases.",
            polymarket_local_signer_file_missing:
              "Falta la fuente de importacion signer de Polymarket.",
            polymarket_local_signer_file_invalid:
              "La fuente de importacion signer de Polymarket no es una signer key local valida.",
            polymarket_signature_type_missing:
              "Elige el tipo de firma de Polymarket antes de importar.",
            polymarket_signature_type_invalid:
              "El tipo de firma de Polymarket seleccionado no esta soportado.",
            polymarket_trading_address_missing:
              "Introduce la Direccion de Perfil/API de Polymarket desde https://polymarket.com/settings.",
            polymarket_trading_address_invalid:
              "La trading/funder address de Polymarket debe ser una address 0x valida.",
            polymarket_trading_address_zero:
              "La address cero no puede usarse como trading/funder address de Polymarket.",
            polymarket_trading_address_not_allowed_for_eoa:
              "El modo EOA usa directamente la address del signer; elimina la trading/funder address separada o elige Proxy / Magic.",
            polymarket_trading_address_signer_mismatch:
              "Este cheque local antiguo de mismatch ya no se usa para cuentas Magic/Proxy. Reimporta el signer Magic con la Direccion de Perfil/API de Polymarket desde settings y refresca preflight.",
            kalshi_api_key_id_missing:
              "Introduce el API Key ID de Kalshi de la misma pantalla de creacion que el archivo .key.",
            kalshi_key_file_missing:
              "Importa el archivo .key de Kalshi descargado mediante su ruta local.",
            kalshi_key_file_invalid:
              "El archivo .key de Kalshi no es una private key RSA sin cifrar parseable.",
            kalshi_key_file_encrypted_passphrase_not_supported:
              "Los archivos .key cifrados de Kalshi no estan soportados; crea una API key sin passphrase para firma local.",
          },
          note:
            "Connect guarda el perfil del proveedor mediante Tauri y una copia local cifrada app-managed de la credencial cuando hace falta. Cuando las credenciales estan listas, el onboarding abre el ultimo paso de aprobacion legal/local para este proveedor. El trading live permanece desactivado hasta que pasen preflight, legal, geo, cuenta, mercado, riesgo, auditoria, kill-switch, reconocimiento, politica non-marketable y gates de adapter.",
        },
      },
      legalApproval: {
        setupEyebrow: "Gate de responsabilidad live",
        title: "Aprobacion legal",
        close: "Cerrar aprobacion legal",
        openAction: "Abrir aprobacion legal",
        statusAria: "Estado de aprobacion legal",
        statusTitle: "Aprobacion legal",
        formIntro:
          "Completa esto para el proveedor que vas a operar. Tauri escribe la aprobacion local no commiteada; los demas gates live siguen corriendo antes de que una orden pueda salir de la app.",
        providerLabel: "Proveedor",
        fields: {
          targetJurisdiction: "Jurisdiccion objetivo",
          targetJurisdictionPlaceholder: "Pais/region para trading live",
          operatorIdentity: "Identidad del operador",
          operatorIdentityPlaceholder: "Persona o entidad real autorizada",
          approver: "Aprobador / responsable de riesgo",
          approverPlaceholder: "Responsable humano que aprueba",
          maxStakeFirstOrder: "Stake maximo primera orden",
          maxMarketExposure: "Exposicion maxima de mercado",
        },
        checksTitle: "Declaraciones obligatorias",
        checksIntro:
          "Revisa todas las declaraciones de abajo. La casilla unica confirma todas juntas; Tauri sigue validando cada declaracion por separado y devuelve blockers exactos si falta esta aprobacion.",
        checks: {
          platformEligible:
            "He revisado la elegibilidad del proveedor/plataforma para esta cuenta y ubicacion.",
          realOperator:
            "El operador es una persona o entidad real autorizada.",
          realBeneficialOwners:
            "Los beneficiarios finales son reales y no se ocultan ni son ficticios.",
          realAccountOwner:
            "El dueno de la cuenta o wallet del proveedor es real y autorizado.",
          noGeoblockBypass:
            "No se esta saltando ningun geoblock, restriccion de plataforma o control de region bloqueada.",
          noVpnBypass:
            "No se usa VPN, proxy, region spoofing ni routing oculto para saltar restricciones.",
          noFakeKyc:
            "No se usa identidad falsa, KYC falso, entidad falsa ni beneficiario final falso.",
          noSanctionsBypass:
            "No se esta saltando ninguna restriccion de sanciones, AML o cuenta.",
          noCustody:
            "Prediction Ladder no custodia fondos, seed phrases, private keys ni signing en backend.",
          c0ReviewPass:
            "La revision C0 esta limpia: no hay bloqueo criminal, sanciones, evasion AML/KYC, custodia ni acceso no autorizado.",
          c1RiskAccepted:
            "El riesgo C1 administrativo/regulatorio esta aprobado por el responsable del negocio o no aplica.",
          auditEnabled:
            "La auditoria local redactada permanece activa para intentos live.",
          firstLiveSmokeOnly:
            "Las ordenes live de esta sesion son solo BUY, stake pequeno, limit/GTC/post-only/non-marketable, con cancelacion manual disponible.",
          noDepositsOrWithdrawals:
            "Esta app no deposita, retira, wrap, unwrap ni salta restricciones de funding del proveedor.",
          understandsRisk:
            "Entiendo que tener credenciales y KYC del proveedor no autoriza por si solo trading live en esta app.",
        },
        singleApprovalToggle:
          "Apruebo todas las declaraciones obligatorias anteriores y reconozco la politica de ordenes live para esta sesion.",
        singleApprovalNote:
          "Esta es una aprobacion explicita del flujo, no un atajo: si alguna declaracion no es cierta, no apruebes este gate. El reconocimiento de sesion puede revocarse al reiniciar o cambiar estado.",
        acknowledgementToggle:
          "Reconocer la politica de ordenes live para esta sesion.",
        acknowledgementNote:
          "Este reconocimiento es separado de la aprobacion legal y puede revocarse al reiniciar o cambiar estado.",
        actions: {
          submit: "Aprobar gate local",
          cancel: "Cancelar",
        },
        readyNote:
          "La aprobacion legal/local esta lista para este proveedor. Preflight aun puede bloquear por metricas de cuenta, mercado, adapter, riesgo, kill-switch o reconocimiento.",
        blockedNote:
          "La aprobacion legal/local no esta lista. Completa todos los campos y declaraciones del proveedor seleccionado.",
      },
    },
  },
  landing: {
    surface: "landing estática",
    summary:
      "Shell bootstrap de landing para la terminal Windows de ladder de mercados de predicción. El flujo final de descarga se conectará solo cuando exista el build del instalador Tauri o se documente su bloqueo.",
    statusRowAria: "Estado de bootstrap de landing",
    trustNotesAria: "Notas de confianza",
    statusLabels: {
      download: "Descarga",
      sharedUiStatus: "Estado de UI compartida",
      tradingSurface: "Superficie de trading",
    },
    trustNotes: {
      desktopDistribution: "Superficie de distribución de producto desktop-first",
      installerPending:
        "El enlace del instalador sigue pendiente hasta que el empaquetado Tauri funcione",
      noCustody:
        "Sin depósitos, custodia, claves privadas ni ejecución de trading en el código de landing",
    },
  },
} satisfies AppMessages;

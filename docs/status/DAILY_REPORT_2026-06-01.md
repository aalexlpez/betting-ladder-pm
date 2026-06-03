# Informe consolidado — Día 1

> **Informe historico - no autoridad de implementacion:** este reporte conserva trazabilidad del Dia 1. El estado actual y la siguiente accion los define `docs/ai/context-handoff.md`.

> **Nota de estado actual (2026-06-03):** este informe conserva decisiones historicas del Dia 1 para trazabilidad. Para implementacion, las decisiones Polymarket-first, Kalshi diferido, datos mock antes de datos reales y live fuera de la vertical slice por defecto quedaron superadas por el contexto canonico actual: Polymarket + Kalshi P0, fixtures solo para tests, live-ready gateado y siguiente bloque Goal 03.

Estado: Día 1 cerrado.
Tiempo registrado: 8.0 horas de trabajo.
Fecha de cierre del informe: 2026-06-01.

Durante el Día 1 se investigó y definió el marco de producto para una betting ladder aplicada a prediction markets. La oportunidad inicial se interpretó como construir una interfaz vertical de order book inspirada en las betting ladders de exchanges peer-to-peer, enfocada primero en traders avanzados o semi-avanzados que ya entienden liquidez, órdenes limit, exposición y riesgo. La hipótesis no se trató como “no existe competencia”, sino como una oportunidad de diferenciarse por velocidad de ejecución manual, claridad de liquidez, seguridad operativa y una experiencia de terminal desktop más profesional.

La decisión principal de producto fue construir una app Windows desktop first, no una web genérica. El razonamiento es que una herramienta de trading con atajos, foco persistente, posible gestión local de credenciales, kill switch y una UX tipo terminal encaja mejor en escritorio. La landing page queda como soporte de distribución, confianza y conversión, pero no como superficie de trading.

Se eligió Polymarket como primer venue porque permite avanzar rápido con datos públicos de mercado y está alineado con la oportunidad original. Kalshi queda diferido para evitar dividir el alcance en la primera versión. El criterio usado aquí fue simple: una vertical slice real y demostrable vale más que un producto medio armado para varios exchanges.

La parte legal quedó tratada como un gate operativo, no como un simple disclaimer. El producto debe poder aspirar a ejecución real, pero no se debe activar live trading por defecto. Se separaron los riesgos en categorías: los riesgos penales o graves bloquean completamente; los riesgos administrativos o regulatorios requieren aprobación humana y decisión de negocio; los riesgos de plataforma, cuenta o producto se gestionan con límites, logs y fallback. En la práctica, el objetivo base será tener datos reales, live-dry-run y un bloqueo claro de por qué no se opera en real si falta alguna aprobación. El mejor caso, solo si todo pasa, sería enviar y cancelar una orden pequeña y controlada.

También se decidió que la empresa o marca puede ser ficticia para la landing, pitch y presentación, pero no para operar cuentas reales, pasar KYC, ocultar beneficiarios o manejar fondos. La app no debe custodiar fondos, private keys ni credenciales de usuarios en backend. Para desarrollo o smoke test puede existir configuración local, pero marcada claramente como uso local/dev, no como modelo de producto.

En arquitectura se dejó preparado un monorepo para trabajar con Codex de forma ordenada: `apps/desktop`, `apps/landing` y paquetes separados para core, market data, execution, UI y configuración. La dirección de escritorio queda Tauri-first con Vite + React + TypeScript, Vite + React para landing, Vitest para tests y pnpm/Turborepo para el monorepo. La prioridad no será hacer una UI bonita primero, sino cerrar el core de órdenes, riesgo y auditoría; después la ladder desktop con datos mock; luego datos reales de proveedor; y solo al final live-dry-run o live si los gates están aprobados.

Se preparó además un marco de trabajo para Codex con contexto routeado, skills locales y quality gates reales. Esto es importante porque el proyecto ya tiene bastante información y, sin estructura, Codex podría leer demasiado contexto, mezclar decisiones viejas o construir partes fuera de orden. La versión actual del repo queda como fuente canónica; los packs anteriores se consideran superados.

En cuanto al estado de implementación, todavía no se ha construido la app. Esto fue intencional durante el Día 1. Antes se cerraron ambigüedades clave: semántica de órdenes, selección de mercado, seguridad desktop y límites de comandos, credenciales, kill switch, ejecución live y calidad mínima. No hay tests de aplicación todavía, pero el siguiente paso ya está preparado para que Codex cree el bootstrap técnico y luego el core con tests. Los quality gates ya no deben pasar con mensajes falsos tipo “TODO”; si algo no está configurado, debe fallar de forma visible.

Los bloqueos principales para días posteriores son claros. La ejecución real sigue bloqueada hasta tener aprobación legal/humana, jurisdicción válida, geoblock pass, cuenta o wallet autorizada, credenciales seguras, límites de stake/exposición y ausencia de riesgo penal. También falta ejecutar el setup real del monorepo en el entorno de desarrollo, instalar dependencias y crear los primeros tests.

El siguiente paso recomendado es empezar con Codex en orden: primero bootstrap del monorepo, luego core de dominio con tests, después shell desktop con datos mock, luego order book real de Polymarket en modo lectura, después paper/live-dry-run con audit log, y finalmente landing y preparación de release. La ejecución live real no entra en la vertical slice por defecto; solo se activa si los gates están aprobados y queda justificado.

**Conclusión del día:** el proyecto ya tiene una dirección clara y defendible. La oportunidad existe, pero no como “mercado vacío”; existe como espacio para una terminal más enfocada, segura y productiva. El marco actual es suficiente para empezar a codificar con Codex, siempre que el trabajo arranque por bootstrap y dominio, no por live trading ni por diseño visual.

## Monetization note added after Day 1 consolidation

A fair monetization model was defined as a product decision: free controlled pilot, free read-only/paper/live-dry-run tier, Pro subscription hypothesis, and optional disclosed builder-fee route only if approved. Billing remains out of scope for the first coding slice.

# Informe consolidado - Dia 4

> **Informe historico - no autoridad de implementacion:** este reporte conserva trazabilidad del Dia 4. El estado actual, blockers y siguiente accion los define `docs/ai/context-handoff.md`.

**Fecha:** 2026-06-04  
**Proyecto:** Betting Ladder para Prediction Markets  
**Tiempo registrado:** 8h  
**Acumulado:** 32h de 40h  
**Estado del dia:** flujo de orden local, auditoria, live-ready gateado, onboarding de cuentas y preflight real-account implementados sin ejecutar ordenes reales.

## Resumen ejecutivo

Hoy el producto paso de tener datos reales read-only y una ladder visual a tener un flujo operativo mas completo: clicks Back/Lay crean intenciones de orden, paper/live-dry-run producen registros locales auditables, y la capa Tauri ya tiene comandos estrechos para estado de gates, onboarding de cuentas, preflight y runtime live bloqueado por seguridad.

No se ejecuto trading real. La app sigue bloqueando cualquier orden live si faltan aprobaciones legales/geograficas/locales, credenciales validas, metricas autenticadas, libro fresco, limites, auditoria, acknowledgement explicito, politica non-marketable o adapter live del proveedor.

## Avances principales

### 1. Ladder mas cercana al producto real

La UI desktop se corrigio hacia una ladder tipo Betfair como superficie principal:

- columnas Back / precio / Lay;
- presets de stake junto a la ladder;
- one-click visible y apagado;
- kill switch y gates visibles;
- right rail centrado en riesgo, preview, metricas, ordenes y auditoria.

Esto reemplaza placeholders visuales por una experiencia mas parecida a una terminal de trading manual, sin agregar bots, senales ni automatizacion.

### 2. Goal 05 - Order intent, paper/live-dry-run y audit log

Se implemento el flujo local de intencion de orden:

- clicks Back/Lay generan previews `OrderIntent` provider-neutral;
- validacion de mercado seleccionado, freshness, tick, stake, exposure, kill switch, modo de ejecucion y gates;
- modo disabled bloquea;
- paper crea orden local;
- live-dry-run registra chequeo local sin enviar nada externo;
- audit log redacta datos sensibles.

La auditoria posterior corrigio un problema importante: previews aceptados ya no quedan reutilizables si cambia el stake, el modo, el libro o la validez de la orden.

### 3. Goal 06 - Live-ready execution gateado

Se agrego una vertical slice de ejecucion live, pero bloqueada por diseno:

- contratos provider-neutral para place/cancel;
- comandos Tauri secretos-safe: `live_gate_status`, `order_submit_live`, `order_cancel`;
- validaciones repetidas en Tauri, no solo en React;
- runtime live mockeado para cubrir place/cancel, rechazo de proveedor y error de red;
- rama Polymarket oficial dormida, solo seleccionable con flags y gates completos;
- cancelacion separada como accion risk-reducing, pero todavia exige provider order id y credencial lista.

La correccion de auditoria cerro riesgos criticos: Tauri ya no confia en quantity/exposure enviados por renderer y exige metricas de cuenta Tauri-owned frescas antes de aprobar live.

### 4. Goal 07 - Onboarding de cuentas y preflight

Se implemento onboarding real-account sin exponer secretos al renderer:

- cards compactas Polymarket/Kalshi en la UI;
- wizard modal con URLs oficiales y explicacion de donde salen las credenciales;
- import source local de Polymarket signer;
- API Key ID + `.key` local para Kalshi;
- rechazo de seed-like input;
- validacion de private key RSA Kalshi no cifrada;
- almacenamiento local app-managed bajo OS app data;
- `provider_onboarding_status`, `provider_connect_account` y `live_preflight_status` en Tauri.

Tambien se avanzo en metricas autenticadas:

- Polymarket: balance/allowance USDC, open orders y posiciones via runtime Tauri-owned.
- Kalshi: balance USD, resting orders y posiciones via cliente firmado RSA-PSS en Tauri.

Los resultados hacia React siguen siendo normalizados y sin secretos.

## Validacion

La validacion principal del dia quedo verde:

- `pnpm typecheck`: paso.
- `pnpm lint`: paso.
- `pnpm test`: paso.
- `pnpm build`: paso.
- `cargo test` para `apps/desktop/src-tauri`: paso, con el smoke externo ignorado por defecto.
- `git diff --check`: paso.
- Smoke HTTP del renderer desktop en `127.0.0.1:1420`: paso.

Notas de entorno:

- En la validacion final del reporte aparecio un fallo pequeno de TypeScript en el wizard de onboarding: el paso de guia usaba una constante antigua en vez de los mensajes `providerOnboarding` localizados. Se corrigio el cableado y el rerun de `pnpm typecheck` paso.
- En sandbox, algunos comandos `pnpm` fallaron primero porque Turbo no encontraba el package-manager binary; los reruns aprobados con el pnpm de usuario pasaron.
- Hubo un fallo puntual de Vitest/esbuild en ejecucion directa sandboxed; el root `pnpm test` aprobado paso e incluyo los tests desktop.
- No se corrio smoke real con credenciales de proveedor porque no se suministraron credenciales/aprobaciones.

## Problemas y riesgos abiertos

- No hay installer Windows todavia. Es el siguiente bloque importante.
- No se ejecuto ninguna orden real.
- Kalshi live order placement sigue bloqueado porque falta un live adapter autenticado completo.
- Polymarket live runtime existe como rama dormida/gateada, pero no se probo contra cuenta real.
- Las metricas provider-owned necesitan smoke real solo si se entregan credenciales locales aprobadas.
- Kalshi tuvo diagnostico previo de problema local DNS/TLS/certificado; no se debe desactivar TLS ni rutear alrededor de la politica de red.
- Polymarket WebSocket persistente sigue `unavailable` en el command path desktop hasta implementar una sesion Tauri segura.
- Falta inspeccion visual fresca en ventana Tauri real despues del onboarding modal.
- Paid routing, billing, fees/revenue share y monetizacion activa siguen fuera del producto implementado.

## Estado de seguridad

- No hay seed phrases ni private keys en React.
- No hay auth headers, firmas, signed payloads ni raw provider payloads en renderer.
- No hay geoblock bypass, VPN bypass, KYC bypass, identidad falsa ni custodia.
- No hay bots, copy trading, estrategias automatizadas ni AI trading signals.
- Live trading no se habilita por cambiar una sola variable: requiere gates completos y aprobacion humana explicita.

## Proximos pasos

1. Construir el installer/distribucion Windows o documentar el blocker concreto.
2. Actualizar landing con un flujo honesto de descarga/acceso.
3. Ejecutar release readiness review.
4. Si el humano aporta credenciales locales aprobadas y autorizacion explicita, validar `live_preflight_status` y solo entonces considerar el tiny BUY limit/GTC/post-only smoke documentado.

## Lectura del dia

El avance del Dia 4 fue importante porque acerco el producto al borde live-ready sin cruzarlo de forma insegura. La app ya puede explicar con precision por que una orden real esta bloqueada, y eso es una senal fuerte para evaluadores: no es paper-only, pero tampoco finge readiness cuando faltan gates reales.

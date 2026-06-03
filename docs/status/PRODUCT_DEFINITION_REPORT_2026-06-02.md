# Informe consolidado - Dia 2

> **Informe historico - no autoridad de implementacion:** este reporte conserva trazabilidad del Dia 2. El estado actual y la siguiente accion los define `docs/ai/context-handoff.md`.

**Fecha:** 2026-06-02  
**Proyecto:** Betting Ladder para Prediction Markets  
**Estado del dia:** contraste de producto, decisiones corregidas y bootstrap completado.

## Avances del día de hoy

### 1. De Electron a Tauri

La decision tecnica cambio. El Dia 1 dejaba Electron como stack inicial; hoy se corrige hacia Tauri.

Motivo: el producto necesita una frontera mas clara entre UI y capacidades privilegiadas con Rust. Para una terminal que aspira a credenciales locales, no-custodia y posible ejecucion live, Tauri da una superficie mas defendible que una app desktop JavaScript mas amplia.

Resultado: Tauri queda como direccion canonica.

### 2. De Polymarket-first a doble proveedor

El Dia 1 priorizaba Polymarket y dejaba Kalshi fuera del MVP. Hoy esa decision se endurece: Polymarket y Kalshi deben estar en la base de la primera version.

Motivo: si el dominio nace Polymarket-only, despues sera mas dificil separar ordenes, metricas, exposicion, currencies, mercado y gates por proveedor.

Resultado: la arquitectura debe ser provider-neutral desde el inicio.

### 3. De plan de bootstrap a bootstrap real

El Dia 1 terminaba antes de ejecutar setup. Hoy ya existe una base tecnica verificable:

- `pnpm@10.0.0` instalado para el workspace;
- `pnpm-lock.yaml` generado;
- paquetes iniciales para `core`, `ui`, `market-data`, `execution` y `config`;
- app desktop Tauri/Vite/React creada en modo seguro inicial;
- landing Vite/React creada como superficie no trading;
- tests smoke iniciales;
- scripts reales de validacion.

Resultado: el proyecto ya puede avanzar sobre codigo, no solo sobre plan.

### 4. De gates definidos a live-readiness mas estricta

El Dia 1 ya habia gates legales y de riesgo. Hoy se precisa que live trading no es un extra opcional ni una promesa vaga: es una capacidad esperada del producto, aunque permanezca bloqueada hasta que pasen todos los gates.

La demo valida, si live no puede aprobarse, no sera "simulacion porque si". Debe mostrar:

- datos reales;
- intento de orden;
- validacion completa;
- live-dry-run o paper;
- audit log;
- gate exacto que impide live.

Resultado: bloqueo explicito cuenta como gestion de riesgo, no como excusa.

### 5. De monetizacion abierta a hipotesis comercial preferida

El Dia 1 no cerraba monetizacion. Hoy queda una hipotesis preferida: fee por transaccion, builder fee, broker fee o revenue share, siempre aprobado por proveedor, disclosed al usuario y auditado.

No se implementa todavia porque primero debe existir valor operativo. El cobro solo tiene sentido si hay routing/ejecucion real y si el proveedor, la jurisdiccion y el usuario lo aceptan.

Resultado: fee/revenue share es la estrategia principal a validar; suscripcion queda como plan B.

## Trabajo ejecutado hoy

Se completo Goal 01: repo bootstrap.

Validaciones ejecutadas:

- `pnpm typecheck`: pasa.
- `pnpm lint`: pasa.
- `pnpm test`: pasa.
- `pnpm build`: pasa.

Tambien se corrigio un problema detectado al validar: despues de `build`, ESLint estaba revisando bundles generados en `apps/*/dist`. Se ajusto la config para ignorar artefactos compilados anidados. Esto convierte un fallo operativo del quality gate en una mejora del setup.

## Lo que queda abierto despues del avance de hoy

Estas preguntas no estaban resueltas al cierre del Dia 1 y siguen siendo decisiones futuras:

- Puede Kalshi soportar la integracion y monetizacion necesarias sin un blocker oficial?
- Que jurisdiccion permitiria un live smoke real sin cruzar C0 ni aceptar C1 sin aprobacion?
- Que tasa de fee seria aceptable para traders activos?
- Que usuarios concretos se contactaran para validar uso y disposicion a pagar?
- El installer Windows se puede generar en este entorno o habra que documentar blocker?
- USD y USDC deben mantenerse separados en metricas globales o hace falta una politica de conversion?

## Lectura de de proyecto

El avance importante no es que "ya hay una idea mejor explicada". El avance es que varias decisiones del Dia 1 fueron corregidas o endurecidas, y que el repositorio ya tiene una base mas fuerte sobre la cual construir:

- Tauri en lugar de Electron;
- Polymarket + Kalshi en lugar de Polymarket-only;
- fee/revenue share como hipotesis comercial preferida;
- installer/acceso desde landing como entregable P0;
- live como capacidad gated real, no como simulacion final;
- quality gates funcionando.

La siguiente decision es mantener disciplina: no vender todavia una promesa amplia ni saltar a UI visual. El siguiente bloque debe construir el dominio core con tests, porque ahi se decide si la terminal puede manejar ordenes, riesgo, exposicion, metricas y auditoria con seriedad.

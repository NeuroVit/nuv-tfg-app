# Reglas del frontend

Aplicados mediante ESLint y CI.

## Reglas
- `complexity`: máximo 10 para módulos de feature.
- `max-lines`: máximo 350 líneas para módulos de feature y `api/client.ts`.
- `api/client.ts` usa una tolerancia temporal de complejidad (`40`) hasta completar la extracción del flujo de tokens/auth.
- Aislamiento de features: `src/features/**` no puede importar desde `src/pages/**`.

## Tolerancia temporal para legado
- Las páginas y componentes legacy están actualmente excluidos de umbrales estrictos de complejidad y tamaño mientras avanza la descomposición.

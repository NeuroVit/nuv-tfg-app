# Carpetas por funcionalidad en frontend

La estructura orientada a features se está introduciendo de forma incremental en `src/features`.

Anclas actuales:
- `features/productos`
- `features/ventas`
- `features/inicio`

Reglas:
- Los módulos de feature no deben importar desde `src/pages`.
- Las piezas compartidas se mantienen en `components/ui`, `lib` y `api`.
- Los archivos de rutas/páginas componen módulos de feature y deben permanecer ligeros.

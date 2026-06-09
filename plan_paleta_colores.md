# Plan: Paleta Corporativa ECM

## Resumen

Centralizar la paleta oficial de Elan Commerce Manager en variables CSS nativas dentro de `frontend/src/index.css`, eliminando el uso directo de hexadecimales corporativos en componentes React. La implementacion preserva el Dark Mode del panel administrativo y aplica la identidad visual principalmente en la tienda publica y como acentos controlados en el dashboard.

## Variables Globales

- `--color-primary: #00a29a`
- `--color-secondary: #00ffcc`
- `--color-bg-light: #f4faf9`
- `--color-text-main: #161b22`

Se mantienen alias semanticos de compatibilidad: `--color-brand-primary`, `--color-brand-secondary`, `--color-bg-base`, `--color-bg-card`, `--color-border` y `--color-text-muted`.

## Encapsulamiento CSS

La tienda publica usa `.theme-public-clean` como frontera visual clara. El panel administrativo conserva sus fondos oscuros nativos (`#0d1117`, `#161b22`, `#30363d`) y recibe la paleta corporativa solo como acentos.

## Mapeo Visual

- Botones primarios: reposo con `var(--color-primary)`, hover/focus con `var(--color-secondary)`.
- Navbar publica: logo local `/images/elan-logo.png`, fondo claro y enlaces con variables.
- Badges de pedidos: aprobado con `var(--color-primary)`, despachado con `var(--color-secondary)`, pendiente con advertencia, cancelado con rojo funcional.

## Pruebas

Validar visualmente `/`, `/carrito`, `/checkout`, `/rastreo`, `/dashboard`, `/pedidos`, `/ventas`, `/productos`, `/inventario`, `/reportes` y `/usuarios`.

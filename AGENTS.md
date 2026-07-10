# AGENTS.md - Ticket Maestro

## Proyecto

Ticket Maestro es una plataforma web de venta y gestion de boletos para eventos en vivo. Proyecto terminado el 20 de abril de 2026.

## Stack

- **Framework:** Next.js 16 (App Router)
- **UI:** React 19 + Tailwind CSS v4
- **Base de datos:** Supabase (PostgreSQL)
- **Autenticacion:** Supabase Auth
- **Pagos:** Stripe + Webhooks
- **Mapa de asientos:** Seats.io
- **QR:** qrcode + HMAC-SHA256 firmados
- **Rate limiting:** Upstash Redis
- **Deploy:** Netlify

## Convenciones

- Usar Server Components por defecto; Client Components solo cuando sea necesario (`"use client"`).
- Rutas publicas van en `src/app/(rutas-publicas)/`.
- Panel del organizador en `src/app/organizador/`.
- Panel de admin en `src/app/admin/`.
- API Routes en `src/app/api/`.
- Componentes reutilizables en `src/Components/`.
- Utilidades y configuraciones en `src/lib/`.

## Comandos

```bash
npm run dev      # Servidor de desarrollo
npm run build    # Build de produccion
npm run start    # Servidor de produccion
npm run lint     # Linter (eslint)
```

## Variables de entorno requeridas

Ver `README.md` para la lista completa de variables en `.env.local`.

## Notas importantes

- Este proyecto usa Next.js 16. Consultar la documentacion oficial antes de hacer cambios en la configuracion de Next.js.
- Los QR de boletos estan firmados con HMAC-SHA256. No modificar `src/lib/utils/generateSecureQR.ts` sin entender las implicaciones de seguridad.
- Los webhooks de Stripe estan en `src/app/api/webhooks/stripe/`. Verificar la logica de confirmacion de pagos antes de modificar.

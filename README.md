# Ticket Maestro

**Ticket Maestro** es una plataforma web completa de venta y gestion de boletos para eventos en vivo. Permite a organizadores crear eventos con mapas de asientos interactivos, y a los asistentes comprar boletos de forma segura con pago por tarjeta.

Proyecto terminado el 20 de abril de 2026.

---

## Caracteristicas principales

### Para asistentes
- Busqueda de eventos por nombre, ubicacion y rango de fechas
- Seleccion de asientos interactiva con mapa visual (Seats.io)
- Pago seguro con tarjeta de credito/debito (Stripe)
- Boletos digitales con codigo QR firmado y verificable
- Descarga de boleto como imagen (PNG)
- Historial de compras en "Mis Boletos"

### Para organizadores
- Panel de gestion de eventos
- Creacion de tipos de boleto (General, Preferente, VIP) con stock y precio independientes
- Reportes de ventas y asistencia en tiempo real
- Escaner QR para validacion de boletos en puerta
- Gestion de staff con permisos de validacion

### Para administradores
- Panel de administracion global
- Gestion de usuarios y organizadores
- Control de pagos y dispersion de fondos (escrow)

---

## Stack tecnologico

| Capa | Tecnologia |
|------|-----------|
| Framework | [Next.js 16](https://nextjs.org/) (App Router) |
| UI | React 19 + Tailwind CSS v4 |
| Base de datos | [Supabase](https://supabase.com/) (PostgreSQL) |
| Autenticacion | Supabase Auth |
| Pagos | [Stripe](https://stripe.com/) + Webhooks |
| Mapa de asientos | [Seats.io](https://seats.io/) |
| Codigos QR | `qrcode` + HMAC-SHA256 firmados |
| Escaner QR | `html5-qrcode` |
| Rate limiting | Upstash Redis |
| Iconos | Lucide React |
| Notificaciones | Sonner |
| Deploy | Netlify |

---

## Instalacion local

### Prerrequisitos
- Node.js 18+
- Una cuenta en Supabase, Stripe y Seats.io

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/ticket-maestro.git
cd ticket-maestro
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Crea un archivo `.env.local` en la raiz del proyecto con las siguientes variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Seats.io
NEXT_PUBLIC_SEATS_IO_PUBLIC_KEY=tu_public_key
SEATS_IO_SECRET_KEY=tu_secret_key
NEXT_PUBLIC_SEATS_IO_CHART_KEY=tu_chart_key

# Seguridad (para firma de QR)
NEXTAUTH_SECRET=una_cadena_aleatoria_segura
```

### 4. Correr en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## Estructura del proyecto

```
src/
├── app/
│   ├── (rutas publicas)
│   │   ├── page.tsx              # Home con busqueda de eventos
│   │   ├── evento/[id]/          # Detalle de evento y seleccion de boletos
│   │   ├── checkout/[eventoId]/  # Seleccion de asientos + pago
│   │   ├── compra-exitosa/       # Confirmacion con boletos descargables
│   │   └── mis-boletos/          # Historial de compras del usuario
│   ├── organizador/              # Panel del organizador
│   ├── admin/                    # Panel de administracion
│   ├── verify/[id]/              # Escaner y validacion de boletos
│   └── api/                      # API Routes
│       ├── checkout/             # Creacion de ordenes + Stripe PaymentIntent
│       ├── seats/hold/           # Reserva temporal de asientos (Seats.io)
│       ├── verify/[id]/          # Validacion y quemado de boletos
│       └── webhooks/stripe/      # Webhook de confirmacion de pagos
├── Components/
│   ├── layout/Navbar.tsx
│   └── ui/
│       ├── TicketCard.tsx        # Tarjeta visual del boleto con QR
│       └── SearchForm.tsx        # Formulario de busqueda con calendario
└── lib/
    ├── supabase/                 # Clientes server/client de Supabase
    ├── stripe.ts                 # Configuracion de Stripe
    └── utils/generateSecureQR.ts # Generacion y validacion de QR firmados
```

---

## Seguridad de los boletos

Los codigos QR estan firmados digitalmente con **HMAC-SHA256**. Cada QR contiene:
- ID del boleto
- ID del evento y del usuario
- Fecha de expiracion (1 dia despues del evento)
- Firma criptografica que impide falsificaciones

El escaner verifica la firma antes de marcar el boleto como usado.

---

## Flujo de compra

```
Evento -> Seleccion de tipo (General/Preferente/VIP)
       -> Mapa de asientos (Seats.io)
       -> Reserva temporal del asiento (15 min)
       -> Formulario de pago (Stripe)
       -> Webhook confirma pago -> QR firmado generado
       -> Boleto guardado en BD -> Email de confirmacion
```

---

## Comandos utiles

```bash
npm run dev      # Servidor de desarrollo
npm run build    # Build de produccion
npm run start    # Servidor de produccion
npm run lint     # Linter
```

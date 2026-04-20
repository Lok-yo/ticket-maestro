# 🎟️ Ticket Maestro

**Ticket Maestro** es una plataforma web completa de venta y gestión de boletos para eventos en vivo. Permite a organizadores crear eventos con mapas de asientos interactivos, y a los asistentes comprar boletos de forma segura con pago por tarjeta.

---

## ✨ Características principales

### Para asistentes
- 🔍 Búsqueda de eventos por nombre, ubicación y rango de fechas
- 🪑 Selección de asientos interactiva con mapa visual (Seats.io)
- 💳 Pago seguro con tarjeta de crédito/débito (Stripe)
- 📱 Boletos digitales con código QR firmado y verificable
- 📥 Descarga de boleto como imagen (PNG)
- 🎫 Historial de compras en "Mis Boletos"

### Para organizadores
- 📋 Panel de gestión de eventos
- 🗂️ Creación de tipos de boleto (General, Preferente, VIP) con stock y precio independientes
- 📊 Reportes de ventas y asistencia en tiempo real
- 📷 Escáner QR para validación de boletos en puerta
- 👥 Gestión de staff con permisos de validación

### Para administradores
- 🛡️ Panel de administración global
- 👤 Gestión de usuarios y organizadores
- 💰 Control de pagos y dispersión de fondos (escrow)

---

## 🛠️ Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | [Next.js 16](https://nextjs.org/) (App Router) |
| UI | React 19 + Tailwind CSS v4 |
| Base de datos | [Supabase](https://supabase.com/) (PostgreSQL) |
| Autenticación | Supabase Auth |
| Pagos | [Stripe](https://stripe.com/) + Webhooks |
| Mapa de asientos | [Seats.io](https://seats.io/) |
| Códigos QR | `qrcode` + HMAC-SHA256 firmados |
| Escáner QR | `html5-qrcode` |
| Rate limiting | Upstash Redis |
| Iconos | Lucide React |
| Notificaciones | Sonner |
| Deploy | Netlify |

---

## 🚀 Instalación local

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

Crea un archivo `.env.local` en la raíz del proyecto con las siguientes variables:

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

## 📁 Estructura del proyecto

```
src/
├── app/
│   ├── (rutas públicas)
│   │   ├── page.tsx              # Home con búsqueda de eventos
│   │   ├── evento/[id]/          # Detalle de evento y selección de boletos
│   │   ├── checkout/[eventoId]/  # Selección de asientos + pago
│   │   ├── compra-exitosa/       # Confirmación con boletos descargables
│   │   └── mis-boletos/          # Historial de compras del usuario
│   ├── organizador/              # Panel del organizador
│   ├── admin/                    # Panel de administración
│   ├── verify/[id]/              # Escáner y validación de boletos
│   └── api/                      # API Routes
│       ├── checkout/             # Creación de órdenes + Stripe PaymentIntent
│       ├── seats/hold/           # Reserva temporal de asientos (Seats.io)
│       ├── verify/[id]/          # Validación y quemado de boletos
│       └── webhooks/stripe/      # Webhook de confirmación de pagos
├── Components/
│   ├── layout/Navbar.tsx
│   └── ui/
│       ├── TicketCard.tsx        # Tarjeta visual del boleto con QR
│       └── SearchForm.tsx        # Formulario de búsqueda con calendario
└── lib/
    ├── supabase/                 # Clientes server/client de Supabase
    ├── stripe.ts                 # Configuración de Stripe
    └── utils/generateSecureQR.ts # Generación y validación de QR firmados
```

---

## 🔒 Seguridad de los boletos

Los códigos QR están firmados digitalmente con **HMAC-SHA256**. Cada QR contiene:
- ID del boleto
- ID del evento y del usuario
- Fecha de expiración (1 día después del evento)
- Firma criptográfica que impide falsificaciones

El escáner verifica la firma antes de marcar el boleto como usado.

---

## 🗺️ Flujo de compra

```
Evento → Selección de tipo (General/Preferente/VIP)
       → Mapa de asientos (Seats.io)
       → Reserva temporal del asiento (15 min)
       → Formulario de pago (Stripe)
       → Webhook confirma pago → QR firmado generado
       → Boleto guardado en BD → Email de confirmación
```

---

## 🧪 Comandos útiles

```bash
npm run dev      # Servidor de desarrollo
npm run build    # Build de producción
npm run start    # Servidor de producción
npm run lint     # Linter
```

---

## 📄 Licencia

Este proyecto es privado. Todos los derechos reservados.

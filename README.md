# Gaia Lab Admin Backend

API backend interna para ventas de Gaia Lab, integrada con **Tienda Nube** y lista para deploy en **Railway**.

## Stack

- Node.js + Express + TypeScript
- Prisma + PostgreSQL
- Zod (validación)
- Axios (API Tienda Nube)

## Estructura del proyecto

```
gaialab-admin-back/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── config/
│   │   └── env.ts
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── orders.controller.ts
│   │   ├── products.controller.ts
│   │   └── webhook.controller.ts
│   ├── lib/
│   │   └── prisma.ts
│   ├── middleware/
│   │   ├── errorHandler.ts
│   │   └── webhookVerification.ts
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── index.ts
│   │   ├── orders.routes.ts
│   │   ├── products.routes.ts
│   │   └── webhook.routes.ts
│   ├── services/
│   │   ├── orderProcessor.service.ts
│   │   ├── product.service.ts
│   │   └── tiendanube/
│   │       ├── api.service.ts
│   │       ├── auth.service.ts
│   │       └── order.service.ts
│   ├── types/
│   │   └── tiendanube.ts
│   └── index.ts
├── .env.example
├── package.json
└── tsconfig.json
```

## Variables de entorno

Copiá `.env.example` a `.env` y completá los valores:

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | URL de PostgreSQL |
| `PORT` | Puerto del servidor (Railway lo inyecta automáticamente) |
| `APP_URL` | URL pública de la API (ej: `https://tu-app.up.railway.app`) |
| `TIENDANUBE_CLIENT_ID` | ID de tu app en Tienda Nube |
| `TIENDANUBE_CLIENT_SECRET` | Secret de tu app |
| `TIENDANUBE_REDIRECT_URI` | Callback OAuth (ej: `https://tu-app.up.railway.app/auth/tiendanube/callback`) |
| `TIENDANUBE_API_VERSION` | Versión API (`2025-03`) |

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/` | `Gaia Lab API running` |
| GET | `/health` | `{ "status": "ok" }` |
| GET | `/auth/tiendanube/install` | Redirige a OAuth de Tienda Nube |
| GET | `/auth/tiendanube/callback` | Intercambia `code` por token y guarda credenciales |
| POST | `/webhooks/tiendanube` | Recibe webhooks (principalmente `order/paid`) |
| GET | `/orders` | Lista ventas guardadas |
| GET | `/products` | Lista productos |
| PATCH | `/products/:id/cost` | Carga costo unitario manual |

### Ejemplo: cargar costo de producto

```bash
curl -X PATCH http://localhost:3000/products/PRODUCT_ID/cost \
  -H "Content-Type: application/json" \
  -d '{"costoUnitario": 1500.50}'
```

## Flujo OAuth Tienda Nube

1. Abrí `GET /auth/tiendanube/install` en el navegador.
2. Autorizá la app en Tienda Nube.
3. Tienda Nube redirige a `/auth/tiendanube/callback?code=...`.
4. El backend guarda `storeId`, `accessToken` y `scope` en `StoreCredential`.

## Flujo de webhooks

1. Registrá en Tienda Nube un webhook `order/paid` apuntando a:
   `https://tu-app.up.railway.app/webhooks/tiendanube`
2. Cuando llega el evento, la API responde **200 inmediatamente**.
3. En background busca la orden completa en Tienda Nube.
4. Guarda la venta y sus ítems.
5. Si el producto no existe, lo crea con `costoUnitario = null` y `status = "pending_cost"`.
6. Si el webhook se repite, **no duplica** la orden (unique `storeId + orderId`).

## Comandos locales

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar entorno
cp .env.example .env

# 3. Levantar PostgreSQL local (o usar Railway/Supabase)
# Editar DATABASE_URL en .env

# 4. Correr migraciones
npm run prisma:migrate:dev

# 5. Desarrollo con hot reload
npm run dev

# 6. Build de producción
npm run build

# 7. Correr build
npm start
```

## Deploy en Railway

### 1. Subir a GitHub

```bash
git init
git add .
git commit -m "Initial Gaia Lab backend"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/gaialab-admin-back.git
git push -u origin main
```

### 2. Crear proyecto en Railway

1. Entrá a [railway.app](https://railway.app)
2. **New Project** → **Deploy from GitHub repo**
3. Seleccioná este repositorio

### 3. Agregar PostgreSQL

1. En el proyecto: **+ New** → **Database** → **PostgreSQL**
2. Railway crea `DATABASE_URL` automáticamente

### 4. Variables de entorno en Railway

En **Variables** del servicio web, agregá:

```
APP_URL=https://tu-dominio.up.railway.app
TIENDANUBE_CLIENT_ID=tu_client_id
TIENDANUBE_CLIENT_SECRET=tu_client_secret
TIENDANUBE_REDIRECT_URI=https://tu-dominio.up.railway.app/auth/tiendanube/callback
TIENDANUBE_API_VERSION=2025-03
```

`DATABASE_URL` y `PORT` los inyecta Railway.

### 5. Build y Start Commands

Railway detecta `package.json` automáticamente:

| Setting | Valor |
|---|---|
| **Build Command** | `npm run build` |
| **Start Command** | `npm start` |
| **Pre-deploy Command** | `npx prisma migrate deploy` |

> El script `prisma:migrate` también está disponible: `npm run prisma:migrate`

### 6. Configurar Tienda Nube

En el panel de partners de Tienda Nube:

- **Redirect URL**: `https://tu-dominio.up.railway.app/auth/tiendanube/callback`
- **Webhook `order/paid`**: `https://tu-dominio.up.railway.app/webhooks/tiendanube`
- Scopes mínimos recomendados: `read_orders`, `read_products`

### 7. Conectar la tienda

Visitá:

```
https://tu-dominio.up.railway.app/auth/tiendanube/install
```

## Modelos de datos

- **StoreCredential**: credenciales OAuth por tienda
- **Product**: catálogo interno con costo pendiente o cargado
- **Order**: venta importada desde Tienda Nube
- **OrderItem**: líneas de cada venta

## Notas técnicas

- El webhook usa `express.raw()` para validar HMAC con el body original.
- La verificación HMAC usa el header `x-linkedstore-hmac-sha256` y `TIENDANUBE_CLIENT_SECRET`.
- El procesamiento de órdenes es asíncrono (`setImmediate`) para cumplir el timeout de 3s de Tienda Nube.
- La API usa `process.env.PORT` para Railway.

## Próximo paso: frontend

Los endpoints `GET /orders` y `GET /products` ya están listos para consumir desde un panel admin React/Next.js apuntando a `APP_URL`.

# AuxTex Fit

A made-to-measure tailor shop: users pick a garment, choose a material,
select their saved measurements, and place an order. Prices are shown in
Kenyan Shillings (KSh).

- **backend/** — NestJS API (MongoDB via Mongoose, JWT auth)
- **frontend/** — Next.js App Router UI

## Prerequisites

- Node.js 18+
- A running MongoDB instance (local or Atlas) — **or** Docker, see below

## Option A: Run everything with Docker (recommended)

This spins up MongoDB, the backend, and the frontend together — no local
Node/Mongo install required beyond Docker itself.

```bash
docker compose up --build
```

- Frontend: http://localhost:3010
- Backend API: http://localhost:4010/api
- MongoDB: exposed on localhost:27020 too, if you want to inspect it with a
  GUI tool like MongoDB Compass or `mongosh`

(These ports — 3010/4010/27020 — were chosen to avoid clashing with other
projects you might already have running locally. Feel free to change them in
`docker-compose.yml` if they don't suit you, just make sure
`NEXT_PUBLIC_API_URL` under `frontend.build.args` matches whatever host port
you map to the backend.)

Data persists in a named Docker volume (`mongo-data`) across restarts. To
wipe it and start fresh:

```bash
docker compose down -v
```

To rebuild after changing backend or frontend code:

```bash
docker compose up --build
```

Note: the frontend's `NEXT_PUBLIC_API_URL` is baked in at **build time**
(set in `docker-compose.yml` under `frontend.build.args`) because it runs in
the browser, not inside the Docker network — so it must stay
`http://localhost:4010/api`, not `http://backend:4000/api`.

### Seeding the catalog (Docker)

Once the containers are up, populate the catalog with a starter set of
materials and products:

```bash
docker compose exec backend npm run seed
```

## Option B: Run without Docker

### 1. Backend setup

```bash
cd backend
cp .env.example .env      # edit MONGODB_URI / JWT_SECRET as needed
npm install
npm run start:dev
```

API runs at `http://localhost:4000/api`.

### Seeding the catalog (no Docker)

```bash
cd backend
npm run build
npm run seed
```

This clears and repopulates the `materials` and `products` collections with
a starter catalog: classic fabrics (wool, cotton, linen, silk) alongside
African prints (Maasai shuka, Kitenge/Ankara, a Kente-inspired weave, Kikoy
stripe), and six garments (suit, blazer, shirt, trousers, dress, skirt) each
linked to a few compatible materials. Re-run it any time to reset back to
this starter set.

The seed script also creates an **admin account** for managing the catalog
through the UI instead of `curl`:

- Email: `admin@auxtexfit.com`
- Password: `ChangeMe123!`

Log in with these at `/login`, then visit `/admin` to add materials and
products (an "Admin" link also appears in the nav once you're logged in as
this account). Change this password before using this anywhere but your own
machine.

### 2. Frontend setup

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

App runs at `http://localhost:3000`.

## What's included

- **Auth**: register/login with email + password, JWT-based, with a `GET
  /auth/me` endpoint so the frontend can check who's logged in and what
  role they have.
- **Measurement profiles**: users can save multiple profiles (e.g. one for
  themselves, one for a family member) and pick one at checkout — the first
  saved profile is auto-selected on a product page so there's one less click.
- **Materials & Products**: browsable, filterable-by-category catalog,
  materials scoped per product via `compatibleMaterials`. African print
  fabrics (Kitenge, Maasai shuka, Kente-inspired, Kikoy) render as small
  CSS-generated patterns rather than flat colour swatches.
- **Admin portal**: `/admin`, gated to accounts with the `admin` role, for
  adding materials and products without touching the API directly. The
  underlying `POST /materials` and `POST /products` endpoints are
  role-guarded server-side too.
- **Orders**: price is computed server-side (`basePrice + pricePerMeter *
  fabricUsage`) so the client can never manipulate the final price — the
  frontend only shows a matching estimate, in KSh.
- **Seed script**: `backend/src/seed.ts` — a varied starter catalog
  including African print fabrics, plus the admin account described above.

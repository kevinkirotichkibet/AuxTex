# AuxTex Fit

A made-to-measure tailor shop: users pick a garment, choose a material,
select their saved measurements, and place an order.

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
`http://localhost:4000/api`, not `http://backend:4000/api`.

## Option B: Run without Docker

### 1. Backend setup

```bash
cd backend
cp .env.example .env      # edit MONGODB_URI / JWT_SECRET as needed
npm install
npm run start:dev
```

API runs at `http://localhost:4000/api`.

### Seeding some data

There's no seed script yet — the quickest way to get started is to POST a
couple of materials and products directly:

```bash
curl -X POST http://localhost:4000/api/materials \
  -H "Content-Type: application/json" \
  -d '{"name":"Italian Wool - Navy","type":"wool","color":"#1a2744","pricePerMeter":45}'

curl -X POST http://localhost:4000/api/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Bespoke Suit","category":"suit","basePrice":200,"description":"A classic two-piece suit.","compatibleMaterials":["<materialId from above>"]}'
```

(The `POST /materials` and `POST /products` endpoints are open in this
scaffold for convenience — lock them behind an admin-only guard before going
to production.)

### 2. Frontend setup

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

App runs at `http://localhost:3000`.

## What's included

- **Auth**: register/login with email + password, JWT-based.
- **Measurement profiles**: users can save multiple profiles (e.g. one for
  themselves, one for a family member) and pick one at checkout.
- **Materials & Products**: browsable catalog, materials scoped per product
  via `compatibleMaterials`.
- **Orders**: price is computed server-side (`basePrice + pricePerMeter *
  fabricUsage`) so the client can never manipulate the final price — the
  frontend only shows a matching estimate.

## Suggested next steps

- Add an admin-only guard/role check for creating materials/products.
- Add an `/orders` history page on the frontend.
- Add image upload (e.g. S3/Cloudinary) instead of raw image URLs.
- Add pagination/filtering to the catalog and material picker.
- Write e2e tests (NestJS has good support for this out of the box).

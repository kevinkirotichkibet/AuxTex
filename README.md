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
`NEXT_PUBLIC_MY_API_KEY` under `frontend.build.args` matches whatever host port
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

Note: the frontend's `NEXT_PUBLIC_MY_API_KEY` is baked in at **build time**
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

## Deploying to production (Vercel + Render + Atlas)

This deploys the frontend to Vercel, the backend to Render (as a Docker web
service, using the same `backend/Dockerfile` as local Docker), and connects
both to a MongoDB Atlas cluster instead of a local/Docker Mongo.

There's a **chicken-and-egg step** in the middle — the backend needs to know
the frontend's URL (for CORS) and the frontend needs to know the backend's
URL (to call the API) — so deploy in this order: **Atlas → Render → Vercel →
back to Render** to fill in the CORS URL.

### 1. MongoDB Atlas

If you already have a cluster, you just need a connection string scoped to
this app:

1. In Atlas, **Database Access** → add a database user (username +
   password) if you don't already have one for this project.
2. **Network Access** → add an IP entry. Render's free tier doesn't have a
   static outbound IP, so the simplest option is allowing `0.0.0.0/0`
   (access from anywhere) — Atlas still requires the correct username/
   password to actually connect, so this isn't the same as leaving the
   database open. If you're on a paid Render plan with a static IP, you can
   scope this more tightly.
3. **Database** → **Connect** → **Drivers** → copy the connection string.
   It looks like:
   ```
   mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
   ```
   Add a database name before the `?`, e.g. `.../auxtexfit?retryWrites=...`.
   Keep this string somewhere — it's the `MONGODB_URI` for the next step.

### 2. Backend on Render

**Using the blueprint** (`render.yaml` in the repo root):

1. Push this repo to GitHub (Render deploys from a git repo, not a zip
   upload).
2. In Render, **New** → **Blueprint**, point it at the repo. It'll detect
   `render.yaml` and create the `auxtexfit-backend` web service, using
   `backend/Dockerfile`.
3. Render will prompt for the env vars marked `sync: false` in the
   blueprint — fill in:
   - `MONGODB_URI` — the Atlas string from step 1
   - `JWT_SECRET` — any long random string (e.g. `openssl rand -hex 32`)
   - `FRONTEND_URL` — leave blank for now, you'll fill this in after step 3
4. Deploy. Once it's live, note the URL Render gives you, e.g.
   `https://auxtexfit-backend.onrender.com`. Your API is at
   `https://auxtexfit-backend.onrender.com/api`.

**Without the blueprint:** New → Web Service → connect the repo → set
**Root Directory** to `backend`, **Environment** to Docker (it'll pick up
`backend/Dockerfile` automatically) → add the same three env vars above.

Once deployed, seed the catalog the same way as Docker locally, just via
Render's shell instead of `docker compose exec`:

- In the Render dashboard, open the service → **Shell** tab → run:
  ```bash
  npm run seed
  ```
  (The image already has `dist/seed.js` built in, so this works without
  installing dev dependencies — see `backend/src/seed.ts`.)

### 3. Frontend on Vercel

1. In Vercel, **Add New** → **Project**, import the same repo, set **Root
   Directory** to `frontend`. Vercel auto-detects Next.js — no other config
   needed.
2. Under **Environment Variables**, add:
   ```
   NEXT_PUBLIC_MY_API_KEY = https://auxtexfit-backend.onrender.com/api
   ```
   (your actual Render URL from step 2, with `/api` on the end). This gets
   baked into the client bundle at build time, same as the `NEXT_PUBLIC_MY_API_KEY`
   build arg in `docker-compose.yml` — it's not something the frontend
   reads at runtime.
3. Deploy. Note the URL Vercel gives you, e.g.
   `https://auxtex-fit.vercel.app`.

### 4. Close the loop: lock down CORS

Back in Render, open the backend service → **Environment** → set:
```
FRONTEND_URL = https://auxtex-fit.vercel.app
```
and redeploy (or just save — Render restarts automatically on env var
changes). This restricts the API's CORS policy to your actual frontend
instead of allowing any origin, which is what `FRONTEND_URL` in
`backend/src/main.ts` is for. If you also have Vercel preview deployments
you want to allow, add their URLs too, comma-separated.

### Notes

- Render's free tier spins the service down after inactivity — the first
  request after a while will be slow (30s+) while it wakes back up. This is
  a Render free-tier characteristic, not an app issue.
- If you change `frontend/app/globals.css` or anything affecting the built
  output, Vercel redeploys automatically on every push (same for Render and
  the backend) — there's no separate manual rebuild step like there is with
  `docker compose up --build` locally.
- The admin account and starter catalog only exist once you run
  `npm run seed` against whichever database `MONGODB_URI` currently points
  to — running it locally seeds your local/Docker Mongo, running it in
  Render's shell seeds Atlas. They're separate databases unless you point
  both at the same `MONGODB_URI`.

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
  frontend only shows a matching estimate, in KSh. Customers can view their
  orders (`/orders`), edit the material/measurements or cancel while an
  order is still pending (`/orders/[id]`). Admins see every order with the
  customer's name and email attached (`/admin/orders`) and can move orders
  through pending → in production → shipped → delivered.
- **Seed script**: `backend/src/seed.ts` — a varied starter catalog
  including African print fabrics, plus the admin account described above.

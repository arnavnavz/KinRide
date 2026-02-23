# KinRide — Your Trusted Ride Network

A transportation network MVP where riders build a trusted driver network ("Kin") and can request rides from drivers they know and trust.

## Features

- **Ride Requests**: Request rides with pickup/dropoff text fields
- **Kin Network**: Add trusted drivers by their unique Kin Code
- **Prefer Kin**: Toggle "Prefer Kin first" to prioritize your trusted drivers
- **Specific Driver**: Request a specific favorite driver (30s exclusive window)
- **Pre-ride Chat**: Message your driver before and during the ride via Socket.io
- **Safety**: Share trip link with anyone + SOS button (client-side stub)
- **Driver Dashboard**: Go Online/Offline toggle, view incoming offers, manage active rides
- **Realtime Updates**: Socket.io for live ride status and chat

## Tech Stack

- **Frontend**: Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- **Backend**: Next.js API routes + custom Socket.io server
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: NextAuth v4 (credentials provider)
- **Realtime**: Socket.io (WebSocket + polling fallback)
- **Validation**: Zod

## Prerequisites

- Node.js 18+
- Docker & Docker Compose (for PostgreSQL)

## Quick Start

### 1. Start PostgreSQL

```bash
docker compose up -d
```

### 2. Install dependencies

```bash
npm install
```

### 3. Generate Prisma client & push schema

```bash
npm run db:generate
npm run db:setup
```

This pushes the schema to Postgres and seeds demo data.

### 4. Start the dev server

```bash
npm run dev
```

The app runs at **http://localhost:3000** with Socket.io on the same port.

## Demo Accounts

All accounts use password: **`password123`**

### Riders

| Email              | Name          |
| ------------------ | ------------- |
| alice@kinride.com  | Alice Johnson |
| bob@kinride.com    | Bob Smith     |

### Drivers

| Email                        | Name             | Kin Code | Verified |
| ---------------------------- | ---------------- | -------- | -------- |
| driver.carlos@kinride.com    | Carlos Martinez  | CARLOS1  | Yes      |
| driver.diana@kinride.com     | Diana Lee        | DIANA22  | Yes      |
| driver.eric@kinride.com      | Eric Thompson    | ERICT3   | Yes      |
| driver.fiona@kinride.com     | Fiona Garcia     | FIONA4   | No       |
| driver.george@kinride.com    | George Wilson    | GEORGE5  | No       |

### Pre-configured Favorites

- Alice has Carlos and Diana as Kin
- Bob has Eric as Kin

## Testing the Full Flow (Two Browser Sessions)

### Session 1 — Driver

1. Open http://localhost:3000 in **Browser A** (or incognito)
2. Sign in as `driver.carlos@kinride.com` / `password123`
3. You'll land on the Driver Dashboard
4. Click **"Go Online"** to start receiving ride offers

### Session 2 — Rider

1. Open http://localhost:3000 in **Browser B**
2. Sign in as `alice@kinride.com` / `password123`
3. Go to **Request Ride**
4. Enter pickup & dropoff addresses
5. Toggle **"Prefer Kin first"** (Carlos is Alice's Kin)
6. Click **Request Ride**

### Back to Driver (Browser A)

7. An incoming offer appears on the dashboard (polls every 5s + Socket.io push)
8. Click **Accept**
9. You're taken to the ride view

### Ride Flow

10. **Driver**: Click "I'm on my way" → status becomes ARRIVING
11. Both see the chat panel. Send messages back and forth.
12. **Driver**: Click "Start Ride" → status becomes IN_PROGRESS
13. **Driver**: Click "Complete Ride" → status becomes COMPLETED
14. **Rider**: After completion, can click "Add Driver to Kin" to favorite

### Share Trip

- Rider can click **"Share Trip"** to copy a public link
- The link shows trip status (auto-refreshes) without requiring login

## Project Structure

```
├── server.ts                # Custom server: Next.js + Socket.io
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── seed.ts              # Demo data seeder
├── src/
│   ├── app/
│   │   ├── page.tsx         # Landing page
│   │   ├── layout.tsx       # Root layout with SessionProvider
│   │   ├── providers.tsx    # Client-side providers
│   │   ├── auth/signin/     # Sign in page
│   │   ├── rider/
│   │   │   ├── request/     # Request a ride
│   │   │   ├── kin/         # Manage Kin list
│   │   │   └── ride/[id]/   # Active ride view + chat
│   │   ├── driver/
│   │   │   ├── dashboard/   # Online toggle + offers + active rides
│   │   │   └── ride/[id]/   # Ride management + chat
│   │   ├── trip/[token]/    # Public shared trip view
│   │   └── api/
│   │       ├── auth/        # NextAuth endpoints
│   │       ├── rides/       # Ride CRUD, accept, status, messages
│   │       ├── favorites/   # Kin list management
│   │       └── driver/      # Driver profile, toggle, offers
│   ├── components/
│   │   ├── Navbar.tsx
│   │   ├── ChatPanel.tsx
│   │   └── RideStatusBadge.tsx
│   ├── hooks/
│   │   └── useSocket.ts     # Socket.io client hook
│   ├── lib/
│   │   ├── auth.ts          # NextAuth config
│   │   ├── prisma.ts        # Prisma client singleton
│   │   ├── matching.ts      # Ride matching logic
│   │   ├── session.ts       # Server session helpers
│   │   └── validations.ts   # Zod schemas
│   └── types/
│       └── next-auth.d.ts   # Type augmentations
├── docker-compose.yml
└── .env
```

## Matching Logic

1. Rider creates a `RideRequest` with pickup/dropoff
2. If `specificDriverId` is set, only that driver gets an offer (30s window)
3. If `preferKin` is true, online+verified favorite drivers get offers first
4. Otherwise, any online+verified driver gets an offer
5. Offers expire after 30 seconds
6. First driver to accept wins; other offers are expired

## Assumptions & Simplifications

- **No map integration**: Pickup/dropoff are text fields (no geocoding or routing)
- **No pricing**: No fare calculation, surge pricing, or payment
- **Credentials auth**: Using email/password for local dev simplicity (no magic link)
- **Polling + Socket.io**: Pages poll every 5s as a fallback; Socket.io provides faster updates
- **No driver location tracking**: `lastKnownLat/Lng` fields exist in schema but aren't actively updated
- **Offer expiration**: Checked at query time, no background job to expire them
- **Single-instance**: Socket.io runs in-process; no Redis adapter for multi-server deployment
- **Unverified drivers**: Fiona and George are seeded as unverified and won't receive ride offers

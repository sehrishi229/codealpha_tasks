# How to Run CollaboBoard

## Prerequisites
- Node.js v16+
- npm

## Quick Start

```bash
cd project
npm install
npm start
```

Then open: http://localhost:4000

## Demo Credentials

| Username | Password |
|----------|----------|
| admin | password123 |
| ahmed | password123 |
| sarah | password123 |
| mike | password123 |
| elena | password123 |
| james | password123 |

## Commands

- `npm start` - Start the server (port 4000)
- `node scripts/seed.js` - Seed the database with demo data
- WebSocket server runs on port 8080

## Full Setup

1. Install dependencies: `npm install`
2. (Optional) Delete existing database: `rm database/app.db`
3. Seed the database: `node scripts/seed.js`
4. Start the server: `npm start`
5. Open http://localhost:4000 in your browser
6. Login with: admin / password123

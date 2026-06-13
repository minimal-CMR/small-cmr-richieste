# small-cmr-richieste — Guida al servizio

Modulo opzionale. Gestisce le richieste di ferie e permessi (bookings).

## Porte

| Servizio | Porta |
|----------|-------|
| Backend  | 8003  |
| Frontend | 5175  |

## Setup iniziale

**Prima di avviare il backend è obbligatorio creare il file `.env`:**

```bash
cd backend
cp .env.example .env
```

Variabili da personalizzare in `backend/.env`:

| Variabile | Descrizione |
|-----------|-------------|
| `DATABASE_URL` | Stringa di connessione MySQL (porta 3307 in locale) |
| `SECRET_KEY` | Chiave JWT — deve essere uguale in tutti i servizi |
| `SERVICE_SECRET` | Segreto condiviso con `small-cmr-ore` — deve essere uguale nei due servizi |
| `ORE_SERVICE_URL` | URL del backend ore (locale: `http://localhost:8002`) |

## Avvio locale

```bash
cd backend
python -m uvicorn main:app --reload --port 8003

cd frontend
npm install
npm run dev   # http://localhost:5175 (remote standalone)
```

## API Routes

| Metodo | Path | Auth |
|--------|------|------|
| GET | `/api/bookings/my` | JWT (utente corrente) |
| GET | `/api/bookings/all` | JWT (admin/validatore) |
| POST | `/api/bookings/` | JWT |
| PATCH | `/api/bookings/{id}/stato` | JWT (admin/validatore) |
| PATCH | `/api/bookings/bulk/stato` | JWT (admin/validatore) |
| DELETE | `/api/bookings/{id}` | JWT (owner) |
| GET | `/health` | — |

## Dipendenza da ore-service

Quando un booking viene approvato o revocato, viene chiamato `ORE_SERVICE_URL/api/ore/internal/booking` (POST o DELETE) con `SERVICE_SECRET`. Se `ore-service` non è raggiungibile, la risposta è 503.

## Test

```bash
cd backend
pytest tests/ -v
```

I test mockano automaticamente `httpx.post` e `httpx.delete` verso `ore-service`.

## Migrazioni DB

```bash
cd backend
alembic upgrade head
```

Gestisce le tabelle: `bookings`.

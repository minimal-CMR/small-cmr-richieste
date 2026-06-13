"""Test per export CSV e filtri date/utente su /api/bookings/all."""
import csv
import io
import zipfile
from datetime import date

import pytest

from models import Booking
from database import SessionLocal


@pytest.fixture
def seed_bookings():
    """Crea alcuni booking per utenti 3 (opts) coprendo diversi mesi."""
    db = SessionLocal()
    rows = [
        Booking(user_id=3, tipo="ferie", data_inizio=date(2026, 6, 1),
                data_fine=date(2026, 6, 5), tutto_il_giorno=True,
                note="ferie giugno", stato="approvato"),
        Booking(user_id=3, tipo="ferie", data_inizio=date(2026, 7, 10),
                data_fine=date(2026, 7, 15), tutto_il_giorno=True,
                note="ferie luglio", stato="in_validazione"),
        Booking(user_id=3, tipo="permesso", data_inizio=date(2026, 8, 1),
                data_fine=date(2026, 8, 1), ore=4, tutto_il_giorno=False,
                note="visita medica", stato="approvato"),
    ]
    db.add_all(rows)
    db.commit()
    ids = [r.id for r in rows]
    db.close()
    yield ids
    db = SessionLocal()
    db.query(Booking).filter(Booking.id.in_(ids)).delete(synchronize_session=False)
    db.commit()
    db.close()


# ── Filtri date su /all ─────────────────────────────────────────

def test_all_bookings_filter_da(client, val_headers, seed_bookings):
    r = client.get("/api/bookings/all", params={"da": "2026-07-01"},
                    headers=val_headers)
    assert r.status_code == 200
    dates = [b["data_inizio"] for b in r.json()]
    # Esclude giugno
    assert all(d >= "2026-06-01" or d >= "2026-07-01" for d in dates)
    # Verifica che giugno (data_fine=2026-06-05) NON sia incluso
    assert "2026-06-01" not in dates


def test_all_bookings_filter_a(client, val_headers, seed_bookings):
    r = client.get("/api/bookings/all", params={"a": "2026-06-30"},
                    headers=val_headers)
    assert r.status_code == 200
    dates = [b["data_inizio"] for b in r.json()]
    # Esclude luglio e agosto
    assert "2026-07-10" not in dates
    assert "2026-08-01" not in dates


def test_all_bookings_filter_range(client, val_headers, seed_bookings):
    r = client.get("/api/bookings/all",
                    params={"da": "2026-07-01", "a": "2026-07-31"},
                    headers=val_headers)
    assert r.status_code == 200
    dates = [b["data_inizio"] for b in r.json()]
    assert "2026-07-10" in dates
    assert "2026-06-01" not in dates
    assert "2026-08-01" not in dates


def test_all_bookings_filter_user_id(client, val_headers, seed_bookings):
    r = client.get("/api/bookings/all", params={"user_id": 3},
                    headers=val_headers)
    assert r.status_code == 200
    assert all(b["user_id"] == 3 for b in r.json())


def test_all_bookings_filter_nome(client, val_headers, seed_bookings):
    r = client.get("/api/bookings/all", params={"nome": "opts"},
                    headers=val_headers)
    assert r.status_code == 200
    assert len(r.json()) >= 3


# ── Export CSV ──────────────────────────────────────────────────

def test_export_csv_single_user(client, val_headers, seed_bookings):
    r = client.get("/api/bookings/export/csv", params={"user_ids": 3},
                    headers=val_headers)
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("application/zip")
    assert "export_" in r.headers.get("content-disposition", "")

    zf = zipfile.ZipFile(io.BytesIO(r.content))
    names = zf.namelist()
    assert len(names) == 1
    assert names[0].startswith("opts@example.com_") and names[0].endswith(".csv")

    content = zf.read(names[0]).decode("utf-8")
    reader = csv.reader(io.StringIO(content))
    rows = list(reader)
    assert rows[0] == ["id", "tipo", "data_inizio", "data_fine", "ore",
                        "tutto_il_giorno", "note", "stato", "data_inserimento"]
    # 3 booking creati nel fixture
    assert len(rows) >= 4  # header + 3


def test_export_csv_skip_unknown_user(client, val_headers, seed_bookings):
    r = client.get("/api/bookings/export/csv",
                    params=[("user_ids", 3), ("user_ids", 99999)],
                    headers=val_headers)
    assert r.status_code == 200
    zf = zipfile.ZipFile(io.BytesIO(r.content))
    # Solo user 3 esiste, 99999 saltato
    assert len(zf.namelist()) == 1


def test_export_csv_requires_validatore(client, opts_headers):
    r = client.get("/api/bookings/export/csv", params={"user_ids": 3},
                    headers=opts_headers)
    assert r.status_code == 403


def test_export_csv_requires_user_ids_param(client, val_headers):
    r = client.get("/api/bookings/export/csv", headers=val_headers)
    assert r.status_code == 422  # missing required query param

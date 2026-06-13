"""Test bookings — le chiamate HTTP verso ore-service sono mockate in conftest."""
from datetime import date, timedelta


def _booking_payload(**kwargs):
    defaults = {
        "tipo": "ferie", "data_inizio": str(date.today()),
        "data_fine": str(date.today() + timedelta(days=1)),
        "tutto_il_giorno": True, "note": "Test",
    }
    defaults.update(kwargs)
    return defaults


def test_health(client):
    assert client.get("/health").json() == {"status": "ok", "service": "richieste"}


def test_create_booking_requires_auth(client):
    assert client.post("/api/bookings/", json=_booking_payload()).status_code == 401


def test_create_booking(client, opts_headers):
    r = client.post("/api/bookings/", json=_booking_payload(), headers=opts_headers)
    assert r.status_code == 201
    assert r.json()["stato"] == "in_validazione"


def test_stato_always_in_validazione_on_create(client, opts_headers):
    """Lo stato viene forzato a in_validazione indipendentemente dal payload."""
    r = client.post("/api/bookings/", json=_booking_payload(stato="approvato"), headers=opts_headers)
    assert r.status_code == 201
    assert r.json()["stato"] == "in_validazione"


def test_my_bookings(client, opts_headers):
    client.post("/api/bookings/", json=_booking_payload(), headers=opts_headers)
    r = client.get("/api/bookings/my", headers=opts_headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_all_bookings_requires_validatore(client, opts_headers):
    assert client.get("/api/bookings/all", headers=opts_headers).status_code == 403


def test_all_bookings_validatore_allowed(client, val_headers):
    r = client.get("/api/bookings/all", headers=val_headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_update_stato_approva(client, opts_headers, val_headers, mock_ore_service):
    mock_post, _ = mock_ore_service
    r = client.post("/api/bookings/", json=_booking_payload(), headers=opts_headers)
    bid = r.json()["id"]
    r2 = client.patch(f"/api/bookings/{bid}/stato", json={"stato": "approvato"}, headers=val_headers)
    assert r2.status_code == 200
    assert r2.json()["stato"] == "approvato"
    mock_post.assert_called_once()


def test_update_stato_revoca(client, opts_headers, val_headers, mock_ore_service):
    _, mock_delete = mock_ore_service
    r = client.post("/api/bookings/", json=_booking_payload(), headers=opts_headers)
    bid = r.json()["id"]
    client.patch(f"/api/bookings/{bid}/stato", json={"stato": "approvato"}, headers=val_headers)
    r2 = client.patch(f"/api/bookings/{bid}/stato", json={"stato": "non_approvato"}, headers=val_headers)
    assert r2.status_code == 200
    mock_delete.assert_called()


def test_update_stato_opts_forbidden(client, opts_headers):
    r = client.post("/api/bookings/", json=_booking_payload(), headers=opts_headers)
    bid = r.json()["id"]
    assert client.patch(f"/api/bookings/{bid}/stato", json={"stato": "approvato"}, headers=opts_headers).status_code == 403


def test_bulk_update(client, opts_headers, val_headers, mock_ore_service):
    b1 = client.post("/api/bookings/", json=_booking_payload(), headers=opts_headers).json()["id"]
    b2 = client.post("/api/bookings/", json=_booking_payload(), headers=opts_headers).json()["id"]
    r = client.patch("/api/bookings/bulk/stato", json={"booking_ids": [b1, b2], "stato": "approvato"}, headers=val_headers)
    assert r.status_code == 200
    assert all(b["stato"] == "approvato" for b in r.json())


def test_delete_booking(client, opts_headers):
    r = client.post("/api/bookings/", json=_booking_payload(), headers=opts_headers)
    bid = r.json()["id"]
    assert client.delete(f"/api/bookings/{bid}", headers=opts_headers).status_code == 204


def test_delete_booking_other_user_forbidden(client, opts_headers, admin_headers):
    r = client.post("/api/bookings/", json=_booking_payload(), headers=opts_headers)
    bid = r.json()["id"]
    assert client.delete(f"/api/bookings/{bid}", headers=admin_headers).status_code == 404

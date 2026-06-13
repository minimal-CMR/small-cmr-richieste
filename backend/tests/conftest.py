import os
import pathlib
from unittest.mock import patch

_DB_FILE = pathlib.Path(__file__).parent / "test_richieste.db"
if _DB_FILE.exists():
    _DB_FILE.unlink()

os.environ["DATABASE_URL"] = f"sqlite:///{_DB_FILE}"
os.environ["SECRET_KEY"]   = "test-only-secret-do-not-use-in-prod"
os.environ["ORE_SERVICE_URL"] = "http://ore-mock"
os.environ["SERVICE_SECRET"]  = "test-secret"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import event

from database import engine
from main import app
from models import User
from auth import hash_password, create_access_token
from database import SessionLocal


@event.listens_for(engine, "connect")
def _fk_pragma(dbapi_conn, _):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


@pytest.fixture(scope="session", autouse=True)
def _seed_users():
    """Crea utenti di test direttamente nel DB locale (non via API base)."""
    from database import Base
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    admin = User(id=1, nome="Admin", cognome="Test", email="admin@example.com",
                 password_hash=hash_password("testpass123"), ruolo="admin")
    validatore = User(id=2, nome="Val", cognome="Test", email="val@example.com",
                      password_hash=hash_password("pass123"), ruolo="validatore")
    opts = User(id=3, nome="Opts", cognome="Test", email="opts@example.com",
                password_hash=hash_password("pass123"), ruolo="opts")
    db.add_all([admin, validatore, opts])
    db.commit()
    db.close()


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="session", autouse=True)
def _cleanup():
    yield
    try:
        _DB_FILE.unlink(missing_ok=True)
    except PermissionError:
        pass


@pytest.fixture(scope="session")
def admin_headers():
    token = create_access_token({"sub": "1"})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="session")
def val_headers():
    token = create_access_token({"sub": "2"})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="session")
def opts_headers():
    token = create_access_token({"sub": "3"})
    return {"Authorization": f"Bearer {token}"}


# Mock globale per le chiamate HTTP verso ore-service
@pytest.fixture(autouse=True)
def mock_ore_service():
    with patch("routers.bookings.httpx.post") as mock_post, \
         patch("routers.bookings.httpx.delete") as mock_delete:
        mock_post.return_value.__enter__ = lambda s: s
        mock_post.return_value.__exit__ = lambda s, *a: False
        mock_delete.return_value.__enter__ = lambda s: s
        mock_delete.return_value.__exit__ = lambda s, *a: False
        yield mock_post, mock_delete

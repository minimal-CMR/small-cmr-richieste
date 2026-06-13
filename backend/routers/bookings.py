import os
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional
from datetime import date
from datetime import datetime
import csv
import io
import zipfile

from database import get_db
from models import Booking, User
from schemas import BookingCreate, BookingUpdate, BookingOut, BulkUpdateRequest
from auth import get_current_user, require_admin_or_validatore

router = APIRouter(prefix="/api/bookings", tags=["bookings"])

ORE_SERVICE_URL = os.getenv("ORE_SERVICE_URL", "http://ore:8002")
SERVICE_SECRET = os.getenv("SERVICE_SECRET", "")


def _sync_ore(booking: Booking, prev_stato: str):
    """Notifica ore-service del cambio stato del booking."""
    new_stato = booking.stato
    try:
        if prev_stato == "approvato" and new_stato != "approvato":
            httpx.delete(
                f"{ORE_SERVICE_URL}/api/ore/internal/booking/{booking.id}",
                params={"service_secret": SERVICE_SECRET},
                timeout=5,
            )
        elif new_stato == "approvato" and prev_stato != "approvato":
            httpx.post(
                f"{ORE_SERVICE_URL}/api/ore/internal/booking",
                json={
                    "service_secret": SERVICE_SECRET,
                    "booking_id": booking.id,
                    "user_id": booking.user_id,
                    "tipo": booking.tipo,
                    "data_inizio": str(booking.data_inizio),
                    "data_fine": str(booking.data_fine),
                    "ore": float(booking.ore) if booking.ore else None,
                    "tutto_il_giorno": booking.tutto_il_giorno,
                },
                timeout=5,
            )
    except httpx.RequestError:
        raise HTTPException(
            status_code=503,
            detail="Servizio ore non disponibile. Riprovare tra qualche istante.",
        )


# I path statici devono stare prima di /{booking_id}.

@router.get("/my", response_model=List[BookingOut])
def my_bookings(
    year: Optional[int] = None, month: Optional[int] = None,
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
):
    query = db.query(Booking).filter(Booking.user_id == current_user.id)
    if year and month:
        from calendar import monthrange
        last_day = monthrange(year, month)[1]
        query = query.filter(
            and_(
                Booking.data_inizio <= date(year, month, last_day),
                Booking.data_fine >= date(year, month, 1),
            )
        )
    return query.all()


@router.get("/all", response_model=List[BookingOut])
def all_bookings(
    user_id: Optional[int] = None, nome: Optional[str] = None,
    cognome: Optional[str] = None, email: Optional[str] = None,
    azienda: Optional[str] = None, da: Optional[date] = None, a: Optional[date] = None,
    db: Session = Depends(get_db), _: User = Depends(require_admin_or_validatore),
):
    query = db.query(Booking).join(User, Booking.user_id == User.id)
    if user_id:   query = query.filter(Booking.user_id == user_id)
    if nome:      query = query.filter(User.nome.ilike(f"%{nome}%"))
    if cognome:   query = query.filter(User.cognome.ilike(f"%{cognome}%"))
    if email:     query = query.filter(User.email.ilike(f"%{email}%"))
    if azienda:   query = query.filter(User.azienda.ilike(f"%{azienda}%"))
    if da:        query = query.filter(Booking.data_fine >= da)
    if a:         query = query.filter(Booking.data_inizio <= a)
    return query.all()


@router.get("/export/csv")
def export_csv(
    user_ids: List[int] = Query(...),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin_or_validatore),
):
    today = datetime.now().strftime("%Y%m%d")
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for uid in user_ids:
            user = db.query(User).filter(User.id == uid).first()
            if not user:
                continue
            bookings = db.query(Booking).filter(Booking.user_id == uid).all()
            csv_buffer = io.StringIO()
            writer = csv.writer(csv_buffer)
            writer.writerow(["id", "tipo", "data_inizio", "data_fine", "ore", "tutto_il_giorno", "note", "stato", "data_inserimento"])
            for b in bookings:
                writer.writerow([b.id, b.tipo, b.data_inizio, b.data_fine, b.ore, b.tutto_il_giorno, b.note, b.stato, b.data_inserimento])
            zf.writestr(f"{user.email}_{today}.csv", csv_buffer.getvalue())
    zip_buffer.seek(0)
    return StreamingResponse(
        zip_buffer, media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename=export_{today}.zip"},
    )


@router.patch("/bulk/stato", response_model=List[BookingOut])
def bulk_update_stato(
    payload: BulkUpdateRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin_or_validatore),
):
    bookings = db.query(Booking).filter(Booking.id.in_(payload.booking_ids)).all()
    for b in bookings:
        prev_stato = b.stato
        b.stato = payload.stato
        _sync_ore(b, prev_stato)
    db.commit()
    for b in bookings:
        db.refresh(b)
    return bookings


@router.post("/", response_model=BookingOut, status_code=201)
def create_booking(
    payload: BookingCreate, db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    booking = Booking(
        user_id=current_user.id, tipo=payload.tipo,
        data_inizio=payload.data_inizio, data_fine=payload.data_fine,
        ore=payload.ore, tutto_il_giorno=payload.tutto_il_giorno,
        note=payload.note, stato="in_validazione",
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return booking


@router.patch("/{booking_id}/stato", response_model=BookingOut)
def update_stato(
    booking_id: int, payload: BookingUpdate,
    db: Session = Depends(get_db), _: User = Depends(require_admin_or_validatore),
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Prenotazione non trovata")
    if payload.stato:
        prev_stato = booking.stato
        booking.stato = payload.stato
        _sync_ore(booking, prev_stato)
    db.commit()
    db.refresh(booking)
    return booking


@router.delete("/{booking_id}", status_code=204)
def delete_booking(
    booking_id: int, db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    booking = db.query(Booking).filter(
        Booking.id == booking_id, Booking.user_id == current_user.id,
    ).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Prenotazione non trovata")
    # Notifica ore-service per pulizia ore assenze collegate
    if booking.stato == "approvato":
        try:
            httpx.delete(
                f"{ORE_SERVICE_URL}/api/ore/internal/booking/{booking.id}",
                params={"service_secret": SERVICE_SECRET},
                timeout=5,
            )
        except httpx.RequestError:
            pass  # best-effort: il booking viene comunque eliminato
    db.delete(booking)
    db.commit()

from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal


class BookingBase(BaseModel):
    tipo: str
    data_inizio: date
    data_fine: date
    ore: Optional[Decimal] = None
    tutto_il_giorno: bool = False
    note: str
    stato: str = "in_validazione"


class BookingCreate(BookingBase):
    pass


class BookingUpdate(BaseModel):
    stato: Optional[str] = None
    note: Optional[str] = None


class BulkUpdateRequest(BaseModel):
    booking_ids: List[int]
    stato: str


class BookingOut(BookingBase):
    id: int
    user_id: int
    data_inserimento: Optional[datetime] = None
    model_config = {"from_attributes": True}

from sqlalchemy import Column, Integer, String, TIMESTAMP, Enum, Text, Date, Numeric, Boolean, func
from database import Base


class User(Base):
    """Replica locale di users — gestita da small-cmr-base. Solo lettura per auth."""
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True)
    email         = Column(String(255), nullable=False, unique=True)
    password_hash = Column(String(255), nullable=False)
    nome          = Column(String(100), nullable=False)
    cognome       = Column(String(100), nullable=False)
    azienda       = Column(String(255), default="")
    ruolo         = Column(String(200), nullable=False, default="opts")
    created_at    = Column(TIMESTAMP, server_default=func.now())

    def get_ruoli(self) -> list:
        return [r.strip() for r in (self.ruolo or "opts").split(",") if r.strip()]

    def is_admin(self) -> bool:
        return "admin" in self.get_ruoli()

    def has_role(self, *roles: str) -> bool:
        if self.is_admin():
            return True
        return any(r in self.get_ruoli() for r in roles)


class Booking(Base):
    __tablename__ = "bookings"

    id               = Column(Integer, primary_key=True, autoincrement=True)
    user_id          = Column(Integer, nullable=False)
    tipo             = Column(Enum("ferie", "permesso"), nullable=False)
    data_inizio      = Column(Date, nullable=False)
    data_fine        = Column(Date, nullable=False)
    ore              = Column(Numeric(4, 2), nullable=True)
    tutto_il_giorno  = Column(Boolean, nullable=False, default=False)
    note             = Column(Text, nullable=False)
    stato            = Column(
        Enum("in_validazione", "approvato", "non_approvato", "in_attesa_conferma"),
        nullable=False, default="in_validazione",
    )
    data_inserimento = Column(TIMESTAMP, server_default=func.now())

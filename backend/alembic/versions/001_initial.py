"""initial schema — bookings

Revision ID: 001
Revises:
Create Date: 2026-06-07
"""
from alembic import op
import sqlalchemy as sa

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "bookings",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer, nullable=False),
        sa.Column("tipo", sa.Enum("ferie", "permesso"), nullable=False),
        sa.Column("data_inizio", sa.Date, nullable=False),
        sa.Column("data_fine", sa.Date, nullable=False),
        sa.Column("ore", sa.Numeric(4, 2), nullable=True),
        sa.Column("tutto_il_giorno", sa.Boolean, nullable=False, server_default="0"),
        sa.Column("note", sa.Text, nullable=False),
        sa.Column(
            "stato",
            sa.Enum("in_validazione", "approvato", "non_approvato", "in_attesa_conferma"),
            nullable=False, server_default="in_validazione",
        ),
        sa.Column("data_inserimento", sa.TIMESTAMP, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("bookings")

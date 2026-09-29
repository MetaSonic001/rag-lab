"""User model (plain dataclass, rows come from db.py)."""
from dataclasses import dataclass


@dataclass
class User:
    id: int
    email: str
    password_hash: str

    def public(self) -> dict:
        return {"id": self.id, "email": self.email}

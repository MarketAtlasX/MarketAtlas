from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field
from typing import Optional


class OutcomeCategory(str, Enum):
    MARKET = "market"
    ECONOMIC = "economic"
    HUMANITARIAN = "humanitarian"
    DIPLOMATIC = "diplomatic"
    MILITARY = "military"
    ENVIRONMENTAL = "environmental"
    TECHNOLOGICAL = "technological"


class OutcomeSeverity(str, Enum):
    MINOR = "minor"
    MODERATE = "moderate"
    MAJOR = "major"
    CRITICAL = "critical"


class Outcome(BaseModel):
    category: OutcomeCategory
    metric: str
    value: float
    unit: str = ""
    direction: str = "neutral"
    severity: OutcomeSeverity = OutcomeSeverity.MODERATE
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    description: str = ""
    source: Optional[str] = None
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    related_entities: list[str] = Field(default_factory=list)

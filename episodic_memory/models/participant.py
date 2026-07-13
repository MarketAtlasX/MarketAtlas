from enum import Enum
from pydantic import BaseModel, Field
from typing import Optional


class ParticipantRole(str, Enum):
    INITIATOR = "initiator"
    TARGET = "target"
    ALLY = "ally"
    MEDIATOR = "mediator"
    OBSERVER = "observer"
    AFFECTED = "affected"


class ParticipantType(str, Enum):
    NATION = "nation"
    ORGANIZATION = "organization"
    NON_STATE = "non_state"
    INDIVIDUAL = "individual"
    COALITION = "coalition"


class Participant(BaseModel):
    name: str
    participant_type: ParticipantType
    role: ParticipantRole = ParticipantRole.AFFECTED
    aliases: list[str] = Field(default_factory=list)
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    attributes: dict = Field(default_factory=dict)

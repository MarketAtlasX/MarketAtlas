from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional


class ProcedureStep(BaseModel):
    order: int
    name: str
    description: str
    inputs: list[str] = Field(default_factory=list)
    outputs: list[str] = Field(default_factory=list)
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)


class Procedure(BaseModel):
    id: str
    name: str
    description: str
    category: str = "general"
    steps: list[ProcedureStep] = Field(default_factory=list)
    triggers: list[str] = Field(default_factory=list)
    preconditions: list[str] = Field(default_factory=list)
    postconditions: list[str] = Field(default_factory=list)
    source_episode_ids: list[str] = Field(default_factory=list)
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    execution_count: int = 0
    success_rate: float = Field(default=0.0, ge=0.0, le=1.0)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    def add_step(self, step: ProcedureStep) -> None:
        step.order = len(self.steps) + 1
        self.steps.append(step)
        self.updated_at = datetime.utcnow()

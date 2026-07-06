"""ConfidenceEngine — every feature has confidence.

Some values come from direct data (high confidence).
Others are inferred by models (lower confidence).
Downstream models factor confidence into their decisions.
"""

from __future__ import annotations

import logging
from enum import Enum
from typing import Any, Dict, List, Optional

from world_state.core.types import ConfidenceValue, StateVector

logger = logging.getLogger(__name__)


class ConfidenceLevel(Enum):
    DIRECT_OBSERVATION = 1.0
    AUTHORITATIVE_SOURCE = 0.95
    HIGH_CONFIDENCE_MODEL = 0.85
    MEDIUM_CONFIDENCE_MODEL = 0.7
    LOW_CONFIDENCE_MODEL = 0.5
    INFERRED = 0.4
    EXTRAPOLATED = 0.3
    ESTIMATED = 0.2
    DEFAULT = 0.1


class ConfidenceEngine:
    """Assigns and manages confidence for every state variable."""

    def __init__(self) -> None:
        self._source_confidence: Dict[str, float] = {
            "gdelt": 0.85,
            "newsapi": 0.8,
            "rss": 0.7,
            "webhook": 0.9,
            "market_data": 0.95,
            "economic_indicator": 0.9,
            "satellite": 0.85,
            "ais": 0.8,
            "model_inference": 0.6,
            "sentiment_analysis": 0.65,
            "entity_extraction": 0.75,
            "propagation": 0.4,
        }
        self._decay_rate: float = 0.01

    @classmethod
    def for_source(cls, source: str) -> ConfidenceLevel:
        mapping = {
            "market_data": ConfidenceLevel.DIRECT_OBSERVATION,
            "economic_indicator": ConfidenceLevel.AUTHORITATIVE_SOURCE,
            "gdelt": ConfidenceLevel.HIGH_CONFIDENCE_MODEL,
            "webhook": ConfidenceLevel.HIGH_CONFIDENCE_MODEL,
            "satellite": ConfidenceLevel.HIGH_CONFIDENCE_MODEL,
            "ais": ConfidenceLevel.MEDIUM_CONFIDENCE_MODEL,
            "newsapi": ConfidenceLevel.MEDIUM_CONFIDENCE_MODEL,
            "rss": ConfidenceLevel.LOW_CONFIDENCE_MODEL,
            "sentiment_analysis": ConfidenceLevel.INFERRED,
            "propagation": ConfidenceLevel.EXTRAPOLATED,
            "model_inference": ConfidenceLevel.ESTIMATED,
        }
        return mapping.get(source, ConfidenceLevel.DEFAULT)

    def apply_confidence(
        self,
        vector: StateVector,
        source: str,
        key_overrides: Optional[Dict[str, float]] = None,
    ) -> StateVector:
        base_confidence = self._source_confidence.get(source, 0.5)
        overrides = key_overrides or {}

        for key, cv in vector.values.items():
            confidence = overrides.get(key, base_confidence)
            vector.values[key] = ConfidenceValue(
                value=cv.value,
                confidence=min(1.0, max(0.0, confidence)),
            )

        return vector

    def decay(self, vector: StateVector, hours_since_update: float) -> StateVector:
        decay_factor = max(0.1, 1.0 - self._decay_rate * hours_since_update)
        for key, cv in vector.values.items():
            vector.values[key] = ConfidenceValue(
                value=cv.value,
                confidence=cv.confidence * decay_factor,
            )
        return vector

    def merge_vectors(
        self,
        primary: StateVector,
        secondary: StateVector,
        primary_weight: float = 0.7,
    ) -> StateVector:
        merged = StateVector()
        all_keys = set(primary.keys) | set(secondary.keys)

        for key in all_keys:
            p = primary.values.get(key)
            s = secondary.values.get(key)
            if p and s:
                merged.values[key] = p.merge(s, primary_weight)
            elif p:
                merged.values[key] = p.model_copy()
            elif s:
                merged.values[key] = s.model_copy()

        return merged

    def weighted_average(
        self, vectors: List[StateVector], weights: Optional[List[float]] = None
    ) -> StateVector:
        if not vectors:
            return StateVector()
        if weights is None:
            weights = [1.0 / len(vectors)] * len(vectors)

        total_weight = sum(weights)
        if total_weight == 0:
            return StateVector()

        all_keys = set()
        for v in vectors:
            all_keys.update(v.keys)

        result = StateVector()
        for key in all_keys:
            weighted_sum = 0.0
            confidence_sum = 0.0
            for vec, w in zip(vectors, weights):
                cv = vec.values.get(key)
                if cv:
                    weighted_sum += cv.value * w * cv.confidence
                    confidence_sum += w * cv.confidence

            if confidence_sum > 0:
                result.set(
                    key,
                    weighted_sum / confidence_sum,
                    confidence_sum / total_weight,
                )

        return result

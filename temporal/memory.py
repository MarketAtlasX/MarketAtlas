"""TemporalMemory — LSTM learns state evolution instead of raw price movement.

Predict from:
    WorldState(t) → WorldState(t+1)

Sequence:
    W₁ → W₂ → W₃ → W₄

This is a much stronger formulation than predicting directly from news.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

from world_state.core.registry import StateRegistry
from world_state.core.types import WORLD_STATE_KEYS, WorldSnapshot

logger = logging.getLogger(__name__)


class TemporalMemory:
    """Learns how the world state evolves over time.

    Maintains a temporal sequence of world snapshots and can:
    - Predict next state from current state
    - Detect anomalous state transitions
    - Generate multi-step forecasts
    """

    def __init__(self, sequence_length: int = 30, state_dim: int = 12) -> None:
        self.sequence_length = sequence_length
        self.state_dim = state_dim
        self.registry = StateRegistry()

        self._sequence: List[np.ndarray] = []
        self._timestamps: List[str] = []

        self._lstm_weights: Optional[Dict[str, np.ndarray]] = None
        self._trained: bool = False

        self._hidden_size = 64
        self._num_layers = 2

    def add_snapshot(self, snapshot: WorldSnapshot) -> None:
        vector = self._snapshot_to_vector(snapshot)
        self._sequence.append(vector)
        self._timestamps.append(snapshot.timestamp.isoformat())

        if len(self._sequence) > self.sequence_length * 10:
            self._sequence = self._sequence[-self.sequence_length * 5:]
            self._timestamps = self._timestamps[-self.sequence_length * 5:]

    def _snapshot_to_vector(self, snapshot: WorldSnapshot) -> np.ndarray:
        values = []
        for key in WORLD_STATE_KEYS:
            val = snapshot.world_state.get(key, {})
            if isinstance(val, dict):
                values.append(val.get("value", 0.0))
            elif isinstance(val, (int, float)):
                values.append(val)
            else:
                values.append(0.0)
        return np.array(values, dtype=np.float32)

    def get_sequence(self, length: Optional[int] = None) -> np.ndarray:
        n = length or self.sequence_length
        if len(self._sequence) < 2:
            return np.array([])
        return np.array(self._sequence[-n:])

    def predict_next(self) -> Optional[np.ndarray]:
        if len(self._sequence) < 2:
            return None

        if self._trained and self._lstm_weights is not None:
            return self._predict_lstm()
        return self._predict_linear()

    def _predict_linear(self) -> np.ndarray:
        window = min(10, len(self._sequence))
        recent = np.array(self._sequence[-window:])
        deltas = np.diff(recent, axis=0)
        avg_delta = np.mean(deltas, axis=0)
        return recent[-1] + avg_delta

    def _predict_lstm(self) -> np.ndarray:
        seq = np.array(self._sequence[-self.sequence_length:])
        if len(seq) < self.sequence_length:
            return self._predict_linear()

        W_hh = self._lstm_weights.get("W_hh", np.eye(self.state_dim) * 0.01)
        W_xh = self._lstm_weights.get("W_xh", np.eye(self.state_dim) * 0.01)
        b_h = self._lstm_weights.get("b_h", np.zeros(self.state_dim))

        h = np.zeros(self.state_dim)
        for t in range(len(seq)):
            x = seq[t]
            h = np.tanh(W_hh @ h + W_xh @ x + b_h)

        return h

    def train(
        self,
        snapshots: List[WorldSnapshot],
        epochs: int = 50,
        learning_rate: float = 0.01,
    ) -> Dict[str, float]:
        if len(snapshots) < self.sequence_length + 1:
            logger.warning("Not enough snapshots to train: %d < %d", len(snapshots), self.sequence_length + 1)
            return {"error": "insufficient_data"}

        X, y = self._build_training_data(snapshots)
        if X.shape[0] == 0:
            return {"error": "empty_training_data"}

        W_hh = np.random.randn(self.state_dim, self.state_dim) * 0.01
        W_xh = np.random.randn(self.state_dim, self.state_dim) * 0.01
        b_h = np.zeros(self.state_dim)
        W_hy = np.random.randn(self.state_dim, self.state_dim) * 0.01
        b_y = np.zeros(self.state_dim)

        losses = []
        for epoch in range(epochs):
            epoch_loss = 0.0
            for i in range(len(X)):
                x = X[i]
                target = y[i]

                h = np.zeros(self.state_dim)
                for t in range(len(x)):
                    h = np.tanh(W_hh @ h + W_xh @ x[t] + b_h)

                y_pred = W_hy @ h + b_y
                loss = np.mean((y_pred - target) ** 2)
                epoch_loss += loss

                grad_y_pred = 2 * (y_pred - target) / self.state_dim
                grad_W_hy = np.outer(grad_y_pred, h)
                grad_b_y = grad_y_pred
                grad_h = W_hy.T @ grad_y_pred

                d_h = grad_h * (1 - h ** 2)
                grad_W_hh = np.outer(d_h, h)
                grad_W_xh = np.outer(d_h, x[-1])
                grad_b_h = d_h

                W_hy -= learning_rate * grad_W_hy
                b_y -= learning_rate * grad_b_y
                W_hh -= learning_rate * grad_W_hh
                W_xh -= learning_rate * grad_W_xh
                b_h -= learning_rate * grad_b_h

            avg_loss = epoch_loss / len(X)
            losses.append(avg_loss)

            if epoch % 10 == 0:
                logger.info("Epoch %d/%d, loss=%.6f", epoch, epochs, avg_loss)

        self._lstm_weights = {
            "W_hh": W_hh,
            "W_xh": W_xh,
            "b_h": b_h,
            "W_hy": W_hy,
            "b_y": b_y,
        }
        self._trained = True

        return {
            "final_loss": float(losses[-1]) if losses else 0.0,
            "initial_loss": float(losses[0]) if losses else 0.0,
            "epochs": epochs,
            "samples": len(X),
        }

    def _build_training_data(
        self,
        snapshots: List[WorldSnapshot],
    ) -> Tuple[np.ndarray, np.ndarray]:
        vectors = [self._snapshot_to_vector(s) for s in snapshots]
        data = np.array(vectors)

        X, y = [], []
        for i in range(len(data) - self.sequence_length):
            X.append(data[i:i + self.sequence_length])
            y.append(data[i + self.sequence_length])

        if len(X) == 0:
            return np.array([]), np.array([])

        return np.array(X), np.array(y)

    def forecast(self, steps: int = 5) -> List[np.ndarray]:
        predictions = []
        current_vec = self._sequence[-1].copy() if self._sequence else np.zeros(self.state_dim)

        for _ in range(steps):
            if self._trained:
                next_vec = self._predict_lstm_single(current_vec)
            else:
                next_vec = self._predict_linear_single(current_vec)
            predictions.append(next_vec)
            current_vec = next_vec

        return predictions

    def _predict_lstm_single(self, x: np.ndarray) -> np.ndarray:
        if not self._lstm_weights:
            return self._predict_linear_single(x)

        W_hh = self._lstm_weights["W_hh"]
        W_xh = self._lstm_weights["W_xh"]
        b_h = self._lstm_weights["b_h"]
        W_hy = self._lstm_weights["W_hy"]
        b_y = self._lstm_weights["b_y"]

        h = np.tanh(W_hh @ np.zeros(self.state_dim) + W_xh @ x + b_h)
        return W_hy @ h + b_y

    def _predict_linear_single(self, x: np.ndarray) -> np.ndarray:
        window = min(5, len(self._sequence))
        if window < 2:
            return x
        recent = np.array(self._sequence[-window:])
        deltas = np.diff(recent, axis=0)
        avg_delta = np.mean(deltas, axis=0)
        return x + avg_delta

    def get_state(self) -> Dict[str, Any]:
        return {
            "sequence_length": len(self._sequence),
            "state_dim": self.state_dim,
            "trained": self._trained,
            "last_timestamp": self._timestamps[-1] if self._timestamps else None,
        }


class TemporalMemoryTrainer:
    """High-level trainer for the temporal memory using snapshot history."""

    def __init__(self, registry: Optional[StateRegistry] = None) -> None:
        self.registry = registry or StateRegistry()
        self.memory = TemporalMemory()

    def load_from_registry(self, limit: int = 500) -> int:
        snapshots = self.registry.get_world_snapshots(limit=limit)
        for snap in snapshots:
            self.memory.add_snapshot(snap)
        return len(snapshots)

    def train(self, epochs: int = 50, lr: float = 0.01) -> Dict[str, float]:
        snapshots = self.registry.get_world_snapshots(limit=1000)
        return self.memory.train(snapshots, epochs=epochs, learning_rate=lr)

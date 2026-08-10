"""Ingest helpers for external data sources.

These functions attempt to fetch from public/free APIs when possible, but
are resilient: if no API key is provided or network fails they return
deterministic synthetic data so the agents remain runnable in tests.
"""

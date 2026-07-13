.PHONY: install test run clean lint typecheck

install:
	pip install -r requirements.txt
	pip install -e ".[dev,neo4j]"

test:
	pytest

test-verbose:
	pytest -v --tb=long

run:
	python main.py

lint:
	ruff check .

typecheck:
	python -m mypy market_agents --ignore-missing-imports

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	rm -rf .pytest_cache .mypy_cache .ruff_cache

docker-services:
	docker compose -f docker-compose.dev.yml up -d

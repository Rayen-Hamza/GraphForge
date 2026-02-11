SHELL := /bin/sh

BACKEND_DIR := src/api
FRONTEND_DIR := src/ui
VENV := $(BACKEND_DIR)/.venv

ifeq ($(OS),Windows_NT)
PIP := $(VENV)/Scripts/pip.exe
PY := $(VENV)/Scripts/python.exe
RM := powershell -Command "if (Test-Path -Path '$(1)') { Remove-Item -Recurse -Force '$(1)' }"
else
PIP := $(VENV)/bin/pip
PY := $(VENV)/bin/python
RM := rm -rf
endif

.PHONY: help setup backend/setup backend/install backend/run frontend/install frontend/start frontend/build clean

help:
	@echo "Available targets:"
	@echo "  setup            - create backend venv and install backend+frontend deps"
	@echo "  backend/setup    - create backend virtualenv"
	@echo "  backend/install  - install backend dependencies"
	@echo "  backend/run      - run backend (uvicorn)"
	@echo "  frontend/install - run npm install in frontend"
	@echo "  frontend/start   - start frontend dev server"
	@echo "  frontend/build   - build frontend"
	@echo "  clean            - remove created artifacts"

setup: backend/install frontend/install

backend/setup:
	@echo "Creating Python virtualenv in $(VENV)"
	@python -m venv $(VENV)
	@$(PIP) --version >/dev/null 2>&1 || echo "Warning: pip not found in virtualenv"

backend/install: backend/setup
	@echo "Installing backend dependencies"
	@if [ -f $(BACKEND_DIR)/requirements.txt ]; then \
		$(PIP) install -r $(BACKEND_DIR)/requirements.txt; \
	else \
		$(PIP) install fastapi uvicorn python-dotenv neo4j google-adk || true; \
		echo "If your project has different dependencies, add $(BACKEND_DIR)/requirements.txt and re-run 'make backend/install'"; \
	fi

backend/run: backend/install
	@echo "Starting backend (uvicorn)"
	@$(PY) -m uvicorn src.api.main:app --reload --port 8000 --host 127.0.0.1

frontend/install:
	@echo "Installing frontend dependencies"
	@cd $(FRONTEND_DIR) && npm install

frontend/start:
	@echo "Starting frontend dev server"
	@cd $(FRONTEND_DIR) && npm run start

frontend/build:
	@echo "Building frontend"
	@cd $(FRONTEND_DIR) && npm run build

clean:
	@echo "Cleaning virtualenv and node_modules"
	@python - <<'PY'
import shutil, os
def r(p):
    try:
        shutil.rmtree(p)
    except FileNotFoundError:
        pass
r('$(VENV)')
r('$(FRONTEND_DIR)/node_modules')
PY

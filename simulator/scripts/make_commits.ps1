$ErrorActionPreference = "Stop"
$repo = "D:\MY WORK\MarketAtlas\simulator"
Set-Location $repo

# Init and remote
git init
git remote add origin https://github.com/MarketAtlasX/simulator.git
git config user.name "MarketAtlas"
git config user.email "dev@marketatlas.io"

function New-Commit {
    param($files, $message)
    git add $files
    git commit -m $message
}

# 1. Project foundation
New-Commit ".gitignore" "chore: add .gitignore for Python project"
New-Commit "README.md" "docs: add comprehensive README with architecture, engine docs, and usage guide"

# 2. Core models
New-Commit "simulator/models/__init__.py" "feat: add models package with barrel exports"
New-Commit "simulator/models/scenario.py" "feat: add Scenario, InjectedEvent, Assumption, AssumptionGraph, EventType models"
New-Commit "simulator/models/simulation.py" "feat: add Simulation, SimulationRun, HorizonResult, SimulationEpisode models"
New-Commit "simulator/models/world.py" "feat: add SimulationWorld, WorldClone, WorldStateSnapshot models"
New-Commit "simulator/models/agents.py" "feat: add AgentReport, ChiefReport, ImpactMetric, AgentType models"
New-Commit "simulator/models/timeline.py" "feat: add TimelineStep, TimeHorizon, SimulationTimeline models"
New-Commit "simulator/models/propagation.py" "feat: add InfluenceEdge, RiskDelta, PropagationPath models"

# 3. Configuration
New-Commit "simulator/config.py" "feat: add SimulatorConfig with service settings and defaults"
New-Commit "simulator/__init__.py" "chore: init simulator package"

# 4. World clone engine
New-Commit "simulator/world_clone/__init__.py" "feat: init world_clone package"
New-Commit "simulator/world_clone/cloner.py" "feat: implement WorldCloner with fetch-deepcopy-destroy lifecycle"
New-Commit "simulator/world_clone/state.py" "feat: implement simulated world state evolution with decay factors"

# 5. Scenario engine
New-Commit "simulator/scenario_engine/__init__.py" "feat: init scenario_engine package"
New-Commit "simulator/scenario_engine/builder.py" "feat: implement fluent ScenarioBuilder API with chaining"
New-Commit "simulator/scenario_engine/parser.py" "feat: implement NLP ScenarioParser with keyword extraction and entity detection"

# 6. Propagation engine
New-Commit "simulator/propagation_engine/__init__.py" "feat: init propagation_engine package"
New-Commit "simulator/propagation_engine/graph.py" "feat: implement KnowledgeGraphTraverser with BFS, path finding, upstream/downstream"
New-Commit "simulator/propagation_engine/propagator.py" "feat: implement RiskPropagator with default graph and weighted influence propagation"

# 7. AI Agents base
New-Commit "simulator/agents/__init__.py" "feat: init agents package with barrel exports"
New-Commit "simulator/agents/base.py" "feat: implement abstract BaseAgent with impact builder and confidence penalty"

# 8. Specialist agents
New-Commit "simulator/agents/conflict.py" "feat: implement ConflictAgent for military escalation assessment"
New-Commit "simulator/agents/economic.py" "feat: implement EconomicAgent for GDP and inflation impact"
New-Commit "simulator/agents/supply_chain.py" "feat: implement SupplyChainAgent for disruption analysis"
New-Commit "simulator/agents/energy.py" "feat: implement EnergyAgent for oil and gas price forecasting"
New-Commit "simulator/agents/trade.py" "feat: implement TradeAgent for trade flow disruption"
New-Commit "simulator/agents/cyber.py" "feat: implement CyberAgent for cyber threat assessment"
New-Commit "simulator/agents/market.py" "feat: implement MarketAgent for VIX and sector rotation"
New-Commit "simulator/agents/portfolio.py" "feat: implement PortfolioAgent for volatility and drawdown"
New-Commit "simulator/agents/chief.py" "feat: implement ChiefIntelligenceAgent for consensus synthesis"

# 9. Simulation engine
New-Commit "simulator/simulation_engine/__init__.py" "feat: init simulation_engine package"
New-Commit "simulator/simulation_engine/runner.py" "feat: implement SimulationRunner orchestrating agents, propagation, and Monte Carlo"
New-Commit "simulator/simulation_engine/timeline.py" "feat: implement TimelineEngine with horizon checkpoints and interpolation"
New-Commit "simulator/simulation_engine/monte_carlo.py" "feat: implement MonteCarloEngine with stochastic path sampling and distribution stats"

# 10. Market & Portfolio engines
New-Commit "simulator/market_engine/__init__.py" "feat: init market_engine package"
New-Commit "simulator/market_engine/estimator.py" "feat: implement MarketEstimator with sector betas and volatility forecasting"
New-Commit "simulator/portfolio_engine/__init__.py" "feat: init portfolio_engine package"
New-Commit "simulator/portfolio_engine/impact.py" "feat: implement PortfolioImpactEngine with allocation-weighted calculation"

# 11. Confidence & Explainability
New-Commit "simulator/confidence/__init__.py" "feat: init confidence package"
New-Commit "simulator/confidence/analyzer.py" "feat: implement ConfidenceAnalyzer with per-agent, per-horizon, and uncertainty trend"
New-Commit "simulator/explainability/__init__.py" "feat: init explainability package"
New-Commit "simulator/explainability/graph.py" "feat: implement CausalChainBuilder and ReasoningGraph for explainability"

# 12. Counterfactual
New-Commit "simulator/counterfactual/__init__.py" "feat: init counterfactual package"
New-Commit "simulator/counterfactual/engine.py" "feat: implement CounterfactualEngine with assumption toggle, sensitivity, and delta computation"

# 13. Reports
New-Commit "simulator/reports/__init__.py" "feat: init reports package"
New-Commit "simulator/reports/generator.py" "feat: implement ReportGenerator with full structured report and historical analogues"

# 14. API Layer
New-Commit "simulator/api/__init__.py" "feat: init api package"
New-Commit "simulator/api/schemas.py" "feat: add Pydantic request/response schemas for all endpoints"
New-Commit "simulator/api/routes.py" "feat: implement 16 REST endpoints for simulation lifecycle"
New-Commit "simulator/api/websocket.py" "feat: implement WebSocket ConnectionManager with channels and progress streaming"

# 15. Entry point and dependencies
New-Commit "simulator/main.py" "feat: add FastAPI entry point with CORS, lifespan, and WebSocket handler"
New-Commit "simulator/requirements.txt" "chore: add Python dependencies (fastapi, uvicorn, pydantic, numpy)"

# 16. Tests
New-Commit "simulator/tests/__init__.py" "test: init test package"
New-Commit "simulator/tests/test_scenario.py" "test: add scenario builder, parser, and assumption graph tests"
New-Commit "simulator/tests/test_propagation.py" "test: add graph traversal, propagator, and edge/delta tests"
New-Commit "simulator/tests/test_simulation.py" "test: add simulation run, agent reports, and horizon result tests"

Write-Host "All commits created. Pushing..."
git push -u origin main 2>&1
if ($LASTEXITCODE -ne 0) {
    git push -u origin master 2>&1
}
Write-Host "Done!"

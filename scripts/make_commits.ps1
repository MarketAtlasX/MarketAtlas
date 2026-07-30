$ErrorActionPreference = "Stop"
$repo = "D:\MY WORK\MarketAtlas\frontend"
Set-Location $repo

git config user.name "MarketAtlas"
git config user.email "dev@marketatlas.io"

function New-Commit {
    param($files, $message)
    git add $files
    git commit -m $message
}

# 1. Simulation types and API
New-Commit "src/simulation/types.ts" "feat(simulator): add full TypeScript interfaces matching backend models"
New-Commit "src/simulation/api.ts" "feat(simulator): add API client with 120s timeout and WebSocket factory"

# 2. Simulation core components
New-Commit "src/simulation/SimulationView.tsx" "feat(simulator): add main SimulationView with sidebar navigation (Editor/Simulation/Report tabs)"
New-Commit "src/simulation/index.ts" "feat(simulator): add barrel exports for all simulation components"

# 3. Scenario Editor
New-Commit "src/simulation/ScenarioEditor/index.tsx" "feat(simulator): add ScenarioEditor with event builder, assumption graph, and run button"

# 4. Timeline visualization
New-Commit "src/simulation/Timeline/index.tsx" "feat(simulator): add Timeline with Recharts line chart and interactive step indicators"

# 5. Probability Tree
New-Commit "src/simulation/ProbabilityTree/index.tsx" "feat(simulator): add ProbabilityTree with optimistic/pessimistic branch visualization"

# 6. Impact Graph
New-Commit "src/simulation/ImpactGraph/index.tsx" "feat(simulator): add ImpactGraph with sortable metric bars and direction color-coding"

# 7. Agent Panel
New-Commit "src/simulation/AgentPanel/index.tsx" "feat(simulator): add AgentPanel with accordion agent reports and chief intelligence synthesis"

# 8. World Map
New-Commit "src/simulation/WorldMap/index.tsx" "feat(simulator): add WorldMap with country severity grid and risk score overlays"

# 9. Portfolio Impact
New-Commit "src/simulation/PortfolioImpact/index.tsx" "feat(simulator): add PortfolioImpact with Recharts pie and bar charts"

# 10. Confidence Panel
New-Commit "src/simulation/ConfidencePanel/index.tsx" "feat(simulator): add ConfidencePanel with radar and bar confidence analysis"

# 11. Report Viewer
New-Commit "src/simulation/ReportViewer/index.tsx" "feat(simulator): add ReportViewer with 8 collapsible report sections"

# 12. Integration wiring
New-Commit "src/App.tsx" "feat: integrate SimulationView into App with header toggle and full-viewport mode switching"
New-Commit "src/components/Header.tsx" "feat: add Simulator toggle button with FlaskConical icon and active state styling"

# 13. Proxy configuration
New-Commit "vite.config.ts" "feat: add /api/simulation and /ws/simulation proxy rules pointing to simulator on port 8005"

# 14. Documentation
New-Commit "README.md" "docs: add Scenario Simulator section with 9 components, API integration, and quick start guide"

Write-Host "Frontend commits created. Pushing..."
git push 2>&1
Write-Host "Done!"

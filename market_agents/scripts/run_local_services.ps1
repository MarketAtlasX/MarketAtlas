$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Python = Join-Path $Root ".venv\Scripts\python.exe"

$env:PYTHONPATH = Split-Path -Parent $Root
$services = @(
  @{ Name = "market-data"; Module = "market_agents.services.market_service:app"; Port = 8001 },
  @{ Name = "impact"; Module = "market_agents.services.impact_service:app"; Port = 8002 },
  @{ Name = "recommendation"; Module = "market_agents.services.recommendation_service:app"; Port = 8003 },
  @{ Name = "gateway"; Module = "market_agents.services.gateway:app"; Port = 8000 }
)

foreach ($service in $services) {
  $args = @("-m", "uvicorn", $service.Module, "--host", "127.0.0.1", "--port", "$($service.Port)")
  $process = Start-Process -FilePath $Python -ArgumentList $args -WorkingDirectory $Root -WindowStyle Hidden -PassThru
  Write-Output "$($service.Name) pid=$($process.Id) url=http://127.0.0.1:$($service.Port)"
}

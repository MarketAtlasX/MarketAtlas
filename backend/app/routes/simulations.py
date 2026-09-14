from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.schemas.portfolio import SimulationCreate, SimulationRead
from app.services.auth_service import get_current_user
from app.services.event_broadcaster import get_broadcaster
from app.services.simulation_service import SimulationService

router = APIRouter(prefix="/simulations", tags=["simulations"])


@router.post("", response_model=SimulationRead, status_code=status.HTTP_202_ACCEPTED)
async def create_simulation(
    body: SimulationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SimulationRead:
    """Queue a simulation for a portfolio and execute it synchronously.

    The simulation is run inline for now (the simulator is fast enough for an
    MVP). Progress milestones are streamed to ``/ws/simulation`` so the client
    sees live status even during the synchronous run.
    """
    broadcaster = get_broadcaster()

    async def _publish_progress(percent: int, stage: str) -> None:
        max_horizon = int((body.scenario or {}).get("duration_days", 365))
        await broadcaster.broadcast(
            f"simulation:{current_user.id}",
            {"type": "progress", "progress": percent, "horizon_days": max_horizon, "stage": stage},
        )

    service = SimulationService(db)
    try:
        run = await service.create_run(body.portfolio_id, current_user.id, body.model_dump())
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))

    run = await service.execute_run(run, progress_callback=_publish_progress)
    await broadcaster.broadcast(
        f"simulation:{current_user.id}",
        {
            "type": "simulation_complete" if run.status == "completed" else "simulation_error",
            "run_id": run.id,
            "status": run.status,
            **({"error": run.error} if run.status == "failed" else {}),
        },
    )
    return SimulationRead.model_validate(run)


@router.get("/{run_id}", response_model=SimulationRead)
async def get_simulation(
    run_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SimulationRead:
    service = SimulationService(db)
    try:
        run = await service.get_run(run_id, current_user.id)
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return SimulationRead.model_validate(run)


@router.get("", response_model=list[SimulationRead])
async def list_simulations(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[SimulationRead]:
    service = SimulationService(db)
    runs = await service.list_runs(current_user.id, skip, limit)
    return [SimulationRead.model_validate(r) for r in runs]

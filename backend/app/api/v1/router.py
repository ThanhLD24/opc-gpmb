from fastapi import APIRouter
from . import auth, workflow, ho_so, ho, task, chi_tra, reports, dashboard, ke_hoach, ke_hoach_report, global_ho, global_tasks, notifications, phe_duyet

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(workflow.router, prefix="/workflow", tags=["workflow"])
api_router.include_router(ho_so.router, prefix="/ho-so", tags=["ho-so"])
api_router.include_router(ho.router, prefix="/ho-so", tags=["ho"])
api_router.include_router(task.router, prefix="/ho-so", tags=["task"])
api_router.include_router(chi_tra.router, prefix="/ho-so", tags=["chi-tra"])
api_router.include_router(ke_hoach.router, prefix="/ho-so", tags=["ke-hoach"])
api_router.include_router(ke_hoach_report.router, prefix="/ke-hoach-thang", tags=["ke-hoach-report"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(global_ho.router, prefix="/ho", tags=["ho-global"])
api_router.include_router(global_tasks.router, prefix="/tasks", tags=["tasks-global"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(phe_duyet.router, prefix="/phe-duyet", tags=["phe-duyet"])

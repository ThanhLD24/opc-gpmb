"""
Sprint 4 — Demo data enrichment script (S4-BE-02).

Purpose:
  Tạo data đa dạng cho demo May 2 — đảm bảo Dashboard, Báo cáo và
  Bàn giao đều có data nhìn rõ.

Created data (idempotent, skips when already exists):
  - 2 hồ sơ MỚI: HS-202504-002, HS-202504-003 (mỗi cái ~30-50 hộ)
  - Trên HS-202504-001 (đã có sẵn): thêm 10 chi trả với status đa dạng
        * 3 da_phe_duyet
        * 2 cho_phe_duyet
        * 1 bi_tu_choi
        * 4 da_ban_giao (ngày bàn giao 04-25, 04-27, 04-28, 04-29)
  - Trên HS-202504-002: 5 chi trả da_phe_duyet
  - Trên HS-202504-003: 3 chi trả da_tao
  - Audit log entries (action=tao) cho chi trả mới

Idempotency:
  * Skip hồ sơ nếu code đã tồn tại
  * Skip hộ nếu (ho_so_id, ma_ho) đã tồn tại
  * Skip chi trả nếu đã tồn tại record cho cặp (ho_so_id, ho_id)
  * Skip audit log entry nếu đã có entry (entity_id, action='tao')

Run from project root:
    python3 backend/scripts/seed_demo_data.py
hoặc:
    cd backend && python3 scripts/seed_demo_data.py

Phải chạy SAU `seed.py` vì cần users (cbcq, ke_toan, gddh) đã tồn tại.
"""
from __future__ import annotations

import os
import random
import sys
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

# Allow running from project root or backend/ directory
HERE = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(HERE)
sys.path.insert(0, BACKEND_DIR)

from sqlalchemy import create_engine, select, func, and_
from sqlalchemy.orm import sessionmaker, Session

from app.db.models import (  # noqa: E402
    AuditLog,
    ChiTraStatusEnum,
    Ho,
    HoSoChiTra,
    HoSoGPMB,
    HoSoStatusEnum,
    HoSoWorkflowNode,
    HoStatusEnum,
    RoleEnum,
    User,
    WorkflowNode,
    WorkflowTemplate,
)

DB_URL_SYNC = os.environ.get(
    "DATABASE_URL_SYNC",
    "postgresql+psycopg2://opc:opc_secret@localhost:5432/opc_gpmb",
)

# ── Demo dataset shape ──────────────────────────────────────────────────────

# (code, name, dia_chi, num_ho, ma_ho_prefix)
NEW_HO_SO: List[Tuple[str, str, str, int, str]] = [
    (
        "HS-202504-002",
        "KCN Phú Nghĩa mở rộng",
        "Xã Phú Nghĩa, Chương Mỹ, Hà Nội",
        35,
        "PN",
    ),
    (
        "HS-202504-003",
        "Đường vành đai 4 — đoạn Mê Linh",
        "Huyện Mê Linh, Hà Nội",
        45,
        "ML",
    ),
]

# Vietnamese surnames + first names for fake hộ data (deterministic but varied)
HO_LAST = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Vũ", "Đặng", "Bùi", "Đỗ", "Hồ"]
HO_MID = ["Văn", "Thị", "Hữu", "Quốc", "Minh", "Kim", "Đình", "Xuân"]
HO_FIRST = [
    "An", "Bình", "Cường", "Dũng", "Hà", "Hằng", "Hùng", "Khánh", "Lan",
    "Long", "Mai", "Nam", "Phong", "Quang", "Sơn", "Thảo", "Trang", "Tuấn",
    "Vân", "Yến",
]
LOAI_DAT = ["Đất ở", "Đất nông nghiệp", "Đất vườn"]


def seeded_random(seed_str: str) -> random.Random:
    """Get a deterministic Random instance based on a seed string."""
    return random.Random(seed_str)


# ── Helpers ─────────────────────────────────────────────────────────────────


def get_users(session: Session) -> Dict[str, User]:
    """Load admin / cbcq / ke_toan / gddh users from DB. Required by seed.py to have run."""
    rows = session.execute(
        select(User).where(
            User.username.in_(["admin", "cbcq", "ketoan", "gddh"])
        )
    ).scalars().all()
    by_username = {u.username: u for u in rows}
    missing = {"admin", "cbcq", "ketoan", "gddh"} - set(by_username.keys())
    if missing:
        raise RuntimeError(
            f"Required users missing: {missing}. Run scripts/seed.py first."
        )
    return by_username


def _snapshot_workflow(
    session: Session, ho_so_id: uuid.UUID, template_id: uuid.UUID
) -> None:
    nodes: List[WorkflowNode] = (
        session.query(WorkflowNode)
        .filter(WorkflowNode.template_id == template_id)
        .order_by(WorkflowNode.level, WorkflowNode.order)
        .all()
    )
    id_map: Dict[uuid.UUID, uuid.UUID] = {}
    for node in nodes:
        new_id = uuid.uuid4()
        snap = HoSoWorkflowNode(
            id=new_id,
            ho_so_id=ho_so_id,
            source_node_id=node.id,
            parent_id=None,
            code=node.code,
            name=node.name,
            level=node.level,
            order=node.order,
            planned_days=node.planned_days,
            is_milestone=node.is_milestone,
            legal_basis=node.legal_basis,
            org_in_charge=node.org_in_charge,
            org_coordinate=node.org_coordinate,
            per_household=node.per_household,
            require_scan=node.require_scan,
            field_so_vb=node.field_so_vb,
            field_ngay_vb=node.field_ngay_vb,
            field_loai_vb=node.field_loai_vb,
            field_gia_tri_trinh=node.field_gia_tri_trinh,
            field_gia_tri_duyet=node.field_gia_tri_duyet,
            field_ghi_chu=node.field_ghi_chu,
        )
        session.add(snap)
        id_map[node.id] = new_id
    session.flush()
    for node in nodes:
        if node.parent_id and node.parent_id in id_map:
            snap = session.get(HoSoWorkflowNode, id_map[node.id])
            snap.parent_id = id_map[node.parent_id]
    session.flush()


def get_or_create_ho_so(
    session: Session,
    code: str,
    name: str,
    dia_chi: str,
    cbcq_id: uuid.UUID,
    template_id: uuid.UUID,
) -> Tuple[HoSoGPMB, bool]:
    """Return (ho_so, created_flag). Patches missing workflow if hồ sơ already exists."""
    existing = session.execute(
        select(HoSoGPMB).where(HoSoGPMB.code == code)
    ).scalar_one_or_none()
    if existing:
        if existing.template_id is None:
            existing.template_id = template_id
            session.flush()
            _snapshot_workflow(session, existing.id, template_id)
            print(f"    [patch] Attached workflow to existing {code}")
        return existing, False
    hs = HoSoGPMB(
        id=uuid.uuid4(),
        code=code,
        name=name,
        dia_chi=dia_chi,
        status=HoSoStatusEnum.thuc_hien,
        cbcq_id=cbcq_id,
        template_id=template_id,
        ngay_bat_dau=datetime.utcnow().date() - timedelta(days=15),
    )
    session.add(hs)
    session.flush()
    _snapshot_workflow(session, hs.id, template_id)
    return hs, True


def create_ho_for_ho_so(
    session: Session,
    ho_so: HoSoGPMB,
    num_ho: int,
    ma_ho_prefix: str,
) -> Tuple[List[Ho], int]:
    """
    Create households for the ho_so. Skip records where (ho_so_id, ma_ho)
    already exists. Returns (list_of_ho_in_ho_so, num_created_this_run).
    """
    rng = seeded_random(f"ho-{ho_so.code}")
    created = 0
    for i in range(1, num_ho + 1):
        ma_ho = f"{ma_ho_prefix}{i:03d}"
        existing = session.execute(
            select(Ho).where(
                and_(Ho.ho_so_id == ho_so.id, Ho.ma_ho == ma_ho)
            )
        ).scalar_one_or_none()
        if existing:
            continue
        ten = (
            f"{rng.choice(HO_LAST)} {rng.choice(HO_MID)} {rng.choice(HO_FIRST)}"
        )
        ho = Ho(
            id=uuid.uuid4(),
            ho_so_id=ho_so.id,
            ma_ho=ma_ho,
            ten_chu_ho=ten,
            dia_chi=f"Thửa {rng.randint(10, 999)}, {ho_so.dia_chi}",
            loai_dat=rng.choice(LOAI_DAT),
            thua=str(rng.randint(1, 500)),
            dien_tich=round(rng.uniform(50, 500), 1),
            status=HoStatusEnum.moi,
        )
        session.add(ho)
        created += 1
    session.flush()
    all_ho = (
        session.execute(
            select(Ho).where(Ho.ho_so_id == ho_so.id).order_by(Ho.ma_ho)
        )
        .scalars()
        .all()
    )
    return all_ho, created


def has_chi_tra(session: Session, ho_so_id: uuid.UUID, ho_id: uuid.UUID) -> bool:
    cnt = session.execute(
        select(func.count(HoSoChiTra.id)).where(
            and_(
                HoSoChiTra.ho_so_id == ho_so_id,
                HoSoChiTra.ho_id == ho_id,
            )
        )
    ).scalar() or 0
    return cnt > 0


def has_audit_tao(session: Session, chi_tra_id: uuid.UUID) -> bool:
    cnt = session.execute(
        select(func.count(AuditLog.id)).where(
            and_(
                AuditLog.entity_type == "chi_tra",
                AuditLog.entity_id == chi_tra_id,
                AuditLog.action == "tao",
            )
        )
    ).scalar() or 0
    return cnt > 0


def make_chi_tra(
    rng: random.Random,
    ho_so: HoSoGPMB,
    ho: Ho,
    target_status: ChiTraStatusEnum,
    ke_toan: User,
    gddh: User,
    ngay_ban_giao: Optional[datetime] = None,
) -> HoSoChiTra:
    """Construct a new HoSoChiTra in the desired status with consistent fields."""
    so_tien_bt = round(rng.uniform(50_000_000, 200_000_000), -3)
    so_tien_ht = round(rng.uniform(10_000_000, 50_000_000), -3)
    so_tien_tdc = round(rng.uniform(0, 100_000_000), -3)

    ct = HoSoChiTra(
        id=uuid.uuid4(),
        ho_so_id=ho_so.id,
        ho_id=ho.id,
        status=target_status,
        so_tien_bt=so_tien_bt,
        so_tien_ht=so_tien_ht,
        so_tien_tdc=so_tien_tdc,
        ghi_chu=f"Demo seed — {ho.ma_ho}",
        ke_toan_id=ke_toan.id,
    )

    now = datetime.utcnow()
    if target_status in (
        ChiTraStatusEnum.cho_phe_duyet,
        ChiTraStatusEnum.da_phe_duyet,
        ChiTraStatusEnum.bi_tu_choi,
        ChiTraStatusEnum.da_ban_giao,
    ):
        ct.ngay_gui_duyet = now - timedelta(days=rng.randint(3, 8))
    if target_status in (
        ChiTraStatusEnum.da_phe_duyet,
        ChiTraStatusEnum.da_ban_giao,
    ):
        ct.gddh_id = gddh.id
        ct.ngay_duyet = now - timedelta(days=rng.randint(1, 3))
    if target_status == ChiTraStatusEnum.bi_tu_choi:
        ct.gddh_id = gddh.id
        ct.ly_do_tu_choi = "Số tiền bồi thường chưa khớp với biên bản kiểm đếm."
    if target_status == ChiTraStatusEnum.da_ban_giao:
        ct.ngay_ban_giao_mat_bang = ngay_ban_giao or (now - timedelta(days=2))
    return ct


def count_chi_tra_by_status(
    session: Session, ho_so_id: uuid.UUID, status_enum: ChiTraStatusEnum
) -> int:
    return session.execute(
        select(func.count(HoSoChiTra.id)).where(
            and_(
                HoSoChiTra.ho_so_id == ho_so_id,
                HoSoChiTra.status == status_enum,
            )
        )
    ).scalar() or 0


def seed_chi_tra_batch(
    session: Session,
    ho_so: HoSoGPMB,
    ho_pool: List[Ho],
    plan: List[Tuple[ChiTraStatusEnum, int, Optional[List[datetime]]]],
    users: Dict[str, User],
) -> int:
    """
    Plan: list of (status, count, optional list of ban_giao dates aligned by index).

    Idempotency: for each (status, count) entry, check how many records already
    exist with that status on this ho_so. Only create the deficit. We then skip
    households that already have a chi_tra to avoid duplicating per-ho records.

    Returns number of chi_tra created this run.
    """
    rng = seeded_random(f"ct-{ho_so.code}")
    created = 0
    pool_idx = 0
    ke_toan = users["ketoan"]
    gddh = users["gddh"]

    for status_enum, target_count, ban_giao_dates in plan:
        existing = count_chi_tra_by_status(session, ho_so.id, status_enum)
        deficit = max(0, target_count - existing)
        if deficit == 0:
            # Already have enough — skip silently
            continue

        for i in range(deficit):
            # Find next ho without an existing chi_tra
            while pool_idx < len(ho_pool) and has_chi_tra(
                session, ho_so.id, ho_pool[pool_idx].id
            ):
                pool_idx += 1
            if pool_idx >= len(ho_pool):
                print(
                    f"  WARN: ran out of households for status={status_enum.value} "
                    f"in {ho_so.code} after {i}/{deficit} created."
                )
                break
            ho = ho_pool[pool_idx]
            pool_idx += 1

            ngay_bg = None
            if ban_giao_dates and i < len(ban_giao_dates):
                ngay_bg = ban_giao_dates[i]

            ct = make_chi_tra(
                rng=rng,
                ho_so=ho_so,
                ho=ho,
                target_status=status_enum,
                ke_toan=ke_toan,
                gddh=gddh,
                ngay_ban_giao=ngay_bg,
            )
            session.add(ct)
            session.flush()
            created += 1

            # Bring ho status forward to match chi_tra status
            if status_enum == ChiTraStatusEnum.da_phe_duyet:
                ho.status = HoStatusEnum.da_chi_tra
            elif status_enum == ChiTraStatusEnum.da_ban_giao:
                ho.status = HoStatusEnum.da_ban_giao

            # Audit log: action=tao for every newly created chi_tra
            if not has_audit_tao(session, ct.id):
                audit = AuditLog(
                    id=uuid.uuid4(),
                    entity_type="chi_tra",
                    entity_id=ct.id,
                    action="tao",
                    actor_id=ke_toan.id,
                    actor_name=ke_toan.full_name,
                    note="Demo seed",
                    created_at=ct.created_at,
                )
                session.add(audit)
    session.flush()
    return created


# ── Main ────────────────────────────────────────────────────────────────────


def seed():
    print("=" * 60)
    print("Sprint 4 — Demo data enrichment (idempotent)")
    print("=" * 60)

    engine = create_engine(DB_URL_SYNC, pool_pre_ping=True)
    SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)

    summary = {
        "ho_so_created": 0,
        "ho_created": 0,
        "chi_tra_created": 0,
    }

    with SessionLocal() as session:
        try:
            users = get_users(session)
            cbcq_id = users["cbcq"].id

            template = session.execute(
                select(WorkflowTemplate).where(WorkflowTemplate.is_active == True)  # noqa: E712
            ).scalar_one()

            # ── Part A: 2 hồ sơ mới ────────────────────────────────────
            new_ho_so_records: Dict[str, HoSoGPMB] = {}
            for code, name, dia_chi, num_ho, ma_prefix in NEW_HO_SO:
                hs, created = get_or_create_ho_so(
                    session, code, name, dia_chi, cbcq_id, template.id
                )
                if created:
                    summary["ho_so_created"] += 1
                    print(f"[+] Created ho_so: {code} — {name}")
                else:
                    print(f"[=] Ho_so already exists: {code}")

                ho_list, n_created = create_ho_for_ho_so(
                    session, hs, num_ho, ma_prefix
                )
                summary["ho_created"] += n_created
                print(
                    f"    Households: total={len(ho_list)}, "
                    f"created_this_run={n_created}"
                )
                new_ho_so_records[code] = hs

            session.commit()

            # ── Part B: chi trả trên hồ sơ HS-202504-001 (đã có) ──────
            existing_hs = session.execute(
                select(HoSoGPMB).where(HoSoGPMB.code == "HS-202504-001")
            ).scalar_one_or_none()
            if existing_hs is None:
                print(
                    "WARN: HS-202504-001 not found — skipping Part B. "
                    "Run scripts/seed.py first."
                )
            else:
                ho_001 = (
                    session.execute(
                        select(Ho)
                        .where(Ho.ho_so_id == existing_hs.id)
                        .order_by(Ho.ma_ho)
                    )
                    .scalars()
                    .all()
                )
                # Skip the very first ho (HB001) — seed.py uses it for tasks demo
                # We start from later hộ so we don't conflict
                ho_pool_001 = [h for h in ho_001 if h.ma_ho != "HB001"]
                # Date references for da_ban_giao records
                today = datetime.utcnow().replace(
                    hour=0, minute=0, second=0, microsecond=0
                )
                bg_dates = [
                    today - timedelta(days=5),  # 04-25
                    today - timedelta(days=3),  # 04-27
                    today - timedelta(days=2),  # 04-28
                    today - timedelta(days=1),  # 04-29
                ]
                plan_001 = [
                    (ChiTraStatusEnum.da_phe_duyet, 3, None),
                    (ChiTraStatusEnum.cho_phe_duyet, 2, None),
                    (ChiTraStatusEnum.bi_tu_choi, 1, None),
                    (ChiTraStatusEnum.da_ban_giao, 4, bg_dates),
                ]
                created_001 = seed_chi_tra_batch(
                    session, existing_hs, ho_pool_001, plan_001, users
                )
                summary["chi_tra_created"] += created_001
                print(
                    f"[Part B] HS-202504-001 chi_tra created_this_run={created_001}"
                )

            # ── Part C: chi trả cho HS-202504-002 (5 da_phe_duyet) ────
            hs_002 = new_ho_so_records.get("HS-202504-002")
            if hs_002:
                ho_002 = (
                    session.execute(
                        select(Ho)
                        .where(Ho.ho_so_id == hs_002.id)
                        .order_by(Ho.ma_ho)
                    )
                    .scalars()
                    .all()
                )
                plan_002 = [(ChiTraStatusEnum.da_phe_duyet, 5, None)]
                created_002 = seed_chi_tra_batch(
                    session, hs_002, ho_002, plan_002, users
                )
                summary["chi_tra_created"] += created_002
                print(
                    f"[Part C] HS-202504-002 chi_tra created_this_run={created_002}"
                )

            # ── Part D: chi trả cho HS-202504-003 (3 da_tao) ──────────
            hs_003 = new_ho_so_records.get("HS-202504-003")
            if hs_003:
                ho_003 = (
                    session.execute(
                        select(Ho)
                        .where(Ho.ho_so_id == hs_003.id)
                        .order_by(Ho.ma_ho)
                    )
                    .scalars()
                    .all()
                )
                plan_003 = [(ChiTraStatusEnum.da_tao, 3, None)]
                created_003 = seed_chi_tra_batch(
                    session, hs_003, ho_003, plan_003, users
                )
                summary["chi_tra_created"] += created_003
                print(
                    f"[Part D] HS-202504-003 chi_tra created_this_run={created_003}"
                )

            session.commit()
        except Exception:
            session.rollback()
            raise

    print("\n" + "=" * 60)
    print("Summary (this run):")
    for k, v in summary.items():
        print(f"  {k}: {v}")
    print("=" * 60)
    print("Done.")


if __name__ == "__main__":
    seed()

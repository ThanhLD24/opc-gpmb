import uuid
from datetime import datetime, date
from typing import Optional, List
from sqlalchemy import (
    String,
    Boolean,
    Integer,
    Float,
    DateTime,
    Date,
    Text,
    ForeignKey,
    Enum as SAEnum,
    UniqueConstraint,
    Index,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from .base import Base
import enum


class RoleEnum(str, enum.Enum):
    admin = "admin"
    cbcq = "cbcq"
    ke_toan = "ke_toan"
    gddh = "gddh"


class HoSoStatusEnum(str, enum.Enum):
    chuan_bi = "chuan_bi"
    thuc_hien = "thuc_hien"
    hoan_thanh = "hoan_thanh"


class HoStatusEnum(str, enum.Enum):
    moi = "moi"
    dang_xu_ly = "dang_xu_ly"
    da_thong_nhat = "da_thong_nhat"
    da_chi_tra = "da_chi_tra"
    da_ban_giao = "da_ban_giao"


class TaskStatusEnum(str, enum.Enum):
    dang_thuc_hien = "dang_thuc_hien"
    hoan_thanh = "hoan_thanh"


class ChiTraStatusEnum(str, enum.Enum):
    da_tao = "da_tao"
    cho_phe_duyet = "cho_phe_duyet"
    da_phe_duyet = "da_phe_duyet"
    bi_tu_choi = "bi_tu_choi"
    da_ban_giao = "da_ban_giao"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    username: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[RoleEnum] = mapped_column(SAEnum(RoleEnum), nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    ho_so_list: Mapped[List["HoSoGPMB"]] = relationship(
        "HoSoGPMB", back_populates="cbcq_user", foreign_keys="HoSoGPMB.cbcq_id"
    )


class WorkflowTemplate(Base):
    __tablename__ = "workflow_templates"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    nodes: Mapped[List["WorkflowNode"]] = relationship(
        "WorkflowNode", back_populates="template", cascade="all, delete-orphan"
    )


class WorkflowNode(Base):
    __tablename__ = "workflow_nodes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    template_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workflow_templates.id", ondelete="CASCADE"),
        nullable=False,
    )
    parent_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workflow_nodes.id", ondelete="CASCADE"),
        nullable=True,
    )
    code: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    level: Mapped[int] = mapped_column(Integer, nullable=False)
    order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    planned_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    is_milestone: Mapped[bool] = mapped_column(Boolean, default=False)
    legal_basis: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    org_in_charge: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    org_coordinate: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    per_household: Mapped[bool] = mapped_column(Boolean, default=False)
    require_scan: Mapped[bool] = mapped_column(Boolean, default=False)
    field_so_vb: Mapped[bool] = mapped_column(Boolean, default=False)
    field_ngay_vb: Mapped[bool] = mapped_column(Boolean, default=False)
    field_loai_vb: Mapped[bool] = mapped_column(Boolean, default=False)
    field_gia_tri_trinh: Mapped[bool] = mapped_column(Boolean, default=False)
    field_gia_tri_duyet: Mapped[bool] = mapped_column(Boolean, default=False)
    field_ghi_chu: Mapped[bool] = mapped_column(Boolean, default=False)

    template: Mapped["WorkflowTemplate"] = relationship(
        "WorkflowTemplate", back_populates="nodes"
    )
    children: Mapped[List["WorkflowNode"]] = relationship(
        "WorkflowNode",
        back_populates="parent",
        cascade="all, delete-orphan",
        foreign_keys="WorkflowNode.parent_id",
    )
    parent: Mapped[Optional["WorkflowNode"]] = relationship(
        "WorkflowNode",
        back_populates="children",
        remote_side="WorkflowNode.id",
        foreign_keys="WorkflowNode.parent_id",
    )
    documents: Mapped[List["WorkflowNodeDocument"]] = relationship(
        "WorkflowNodeDocument", back_populates="node", cascade="all, delete-orphan"
    )


class WorkflowNodeDocument(Base):
    __tablename__ = "workflow_node_documents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    node_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workflow_nodes.id", ondelete="CASCADE"), nullable=False
    )
    ten_tai_lieu: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    uploaded_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    node: Mapped["WorkflowNode"] = relationship("WorkflowNode", back_populates="documents")


class HoSoGPMB(Base):
    __tablename__ = "ho_so_gpmb"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    dia_chi: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[HoSoStatusEnum] = mapped_column(
        SAEnum(HoSoStatusEnum), nullable=False, default=HoSoStatusEnum.chuan_bi
    )
    cbcq_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    template_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workflow_templates.id", ondelete="SET NULL"),
        nullable=True,
    )
    ngay_bat_dau: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    ngay_ket_thuc: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True, default=None)

    cbcq_user: Mapped[Optional["User"]] = relationship(
        "User", back_populates="ho_so_list", foreign_keys=[cbcq_id]
    )
    workflow_nodes: Mapped[List["HoSoWorkflowNode"]] = relationship(
        "HoSoWorkflowNode", back_populates="ho_so", cascade="all, delete-orphan"
    )
    ho_list: Mapped[List["Ho"]] = relationship(
        "Ho", back_populates="ho_so", cascade="all, delete-orphan"
    )
    chi_tra_list: Mapped[List["HoSoChiTra"]] = relationship(
        "HoSoChiTra", back_populates="ho_so", cascade="all, delete-orphan"
    )


class HoSoWorkflowNode(Base):
    """Snapshot of a workflow node for a specific HoSo"""

    __tablename__ = "ho_so_workflow_nodes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    ho_so_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("ho_so_gpmb.id", ondelete="CASCADE"),
        nullable=False,
    )
    source_node_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workflow_nodes.id", ondelete="SET NULL"),
        nullable=True,
    )
    parent_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("ho_so_workflow_nodes.id", ondelete="CASCADE"),
        nullable=True,
    )
    code: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    level: Mapped[int] = mapped_column(Integer, nullable=False)
    order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    planned_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    is_milestone: Mapped[bool] = mapped_column(Boolean, default=False)
    legal_basis: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    org_in_charge: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    org_coordinate: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    per_household: Mapped[bool] = mapped_column(Boolean, default=False)
    require_scan: Mapped[bool] = mapped_column(Boolean, default=False)
    field_so_vb: Mapped[bool] = mapped_column(Boolean, default=False)
    field_ngay_vb: Mapped[bool] = mapped_column(Boolean, default=False)
    field_loai_vb: Mapped[bool] = mapped_column(Boolean, default=False)
    field_gia_tri_trinh: Mapped[bool] = mapped_column(Boolean, default=False)
    field_gia_tri_duyet: Mapped[bool] = mapped_column(Boolean, default=False)
    field_ghi_chu: Mapped[bool] = mapped_column(Boolean, default=False)

    ho_so: Mapped["HoSoGPMB"] = relationship(
        "HoSoGPMB", back_populates="workflow_nodes"
    )
    source_node: Mapped[Optional["WorkflowNode"]] = relationship("WorkflowNode")
    children: Mapped[List["HoSoWorkflowNode"]] = relationship(
        "HoSoWorkflowNode",
        back_populates="parent",
        cascade="all, delete-orphan",
        foreign_keys="HoSoWorkflowNode.parent_id",
    )
    parent: Mapped[Optional["HoSoWorkflowNode"]] = relationship(
        "HoSoWorkflowNode",
        back_populates="children",
        remote_side="HoSoWorkflowNode.id",
        foreign_keys="HoSoWorkflowNode.parent_id",
    )
    task_instances: Mapped[List["TaskInstance"]] = relationship(
        "TaskInstance", back_populates="workflow_node", cascade="all, delete-orphan"
    )
    scope_assignments: Mapped[List["NodeHouseholdScope"]] = relationship(
        "NodeHouseholdScope",
        back_populates="workflow_node",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("ix_ho_so_workflow_nodes_ho_so_id", "ho_so_id"),
        Index("ix_ho_so_workflow_nodes_parent_id", "parent_id"),
    )


class Ho(Base):
    __tablename__ = "ho"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    ho_so_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("ho_so_gpmb.id", ondelete="CASCADE"),
        nullable=False,
    )
    ma_ho: Mapped[str] = mapped_column(String(50), nullable=False)
    ten_chu_ho: Mapped[str] = mapped_column(Text, nullable=False)
    dia_chi: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    loai_dat: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    thua: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    dien_tich: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    status: Mapped[HoStatusEnum] = mapped_column(
        SAEnum(HoStatusEnum), nullable=False, default=HoStatusEnum.moi
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    ho_so: Mapped["HoSoGPMB"] = relationship("HoSoGPMB", back_populates="ho_list")
    task_instances: Mapped[List["TaskInstance"]] = relationship(
        "TaskInstance", back_populates="ho", cascade="all, delete-orphan"
    )
    chi_tra_list: Mapped[List["HoSoChiTra"]] = relationship(
        "HoSoChiTra", back_populates="ho"
    )
    scope_assignments: Mapped[List["NodeHouseholdScope"]] = relationship(
        "NodeHouseholdScope", back_populates="ho", cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint("ho_so_id", "ma_ho", name="uq_ho_ho_so_ma"),
        Index("ix_ho_ho_so_id", "ho_so_id"),
    )


class NodeHouseholdScope(Base):
    """Tracks which households are assigned to a per_household workflow node"""

    __tablename__ = "node_household_scope"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    workflow_node_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("ho_so_workflow_nodes.id", ondelete="CASCADE"),
        nullable=False,
    )
    ho_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ho.id", ondelete="CASCADE"), nullable=False
    )
    assigned_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    workflow_node: Mapped["HoSoWorkflowNode"] = relationship(
        "HoSoWorkflowNode", back_populates="scope_assignments"
    )
    ho: Mapped["Ho"] = relationship("Ho", back_populates="scope_assignments")

    __table_args__ = (
        UniqueConstraint(
            "workflow_node_id", "ho_id", name="uq_node_household_scope"
        ),
    )


class TaskInstance(Base):
    __tablename__ = "task_instances"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    ho_so_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("ho_so_gpmb.id", ondelete="CASCADE"),
        nullable=False,
    )
    workflow_node_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("ho_so_workflow_nodes.id", ondelete="CASCADE"),
        nullable=False,
    )
    ho_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ho.id", ondelete="CASCADE"), nullable=True
    )
    status: Mapped[TaskStatusEnum] = mapped_column(
        SAEnum(TaskStatusEnum),
        nullable=False,
        default=TaskStatusEnum.dang_thuc_hien,
    )
    so_vb: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    ngay_vb: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    loai_vb: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    gia_tri_trinh: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    gia_tri_duyet: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    ghi_chu: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    scan_file_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    workflow_node: Mapped["HoSoWorkflowNode"] = relationship(
        "HoSoWorkflowNode", back_populates="task_instances"
    )
    ho: Mapped[Optional["Ho"]] = relationship("Ho", back_populates="task_instances")
    attachments: Mapped[List["TaskAttachment"]] = relationship(
        "TaskAttachment", back_populates="task", cascade="all, delete-orphan"
    )

    __table_args__ = (
        # For per_household tasks: unique per (node, ho)
        UniqueConstraint("workflow_node_id", "ho_id", name="uq_task_node_ho"),
        Index("ix_task_instances_ho_so_id", "ho_so_id"),
        Index("ix_task_instances_ho_id", "ho_id"),
        Index("ix_task_instances_workflow_node_id", "workflow_node_id"),
        # Partial unique index for non-per_household tasks (ho_id IS NULL)
        Index(
            "uq_task_node_ho_null",
            "workflow_node_id",
            unique=True,
            postgresql_where="ho_id IS NULL",
        ),
    )


class TaskAttachment(Base):
    __tablename__ = "task_attachments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_instance_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("task_instances.id", ondelete="CASCADE"), nullable=False
    )
    ten_tai_lieu: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    uploaded_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    task: Mapped["TaskInstance"] = relationship("TaskInstance", back_populates="attachments")


class HoSoChiTra(Base):
    __tablename__ = "ho_so_chi_tra"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    ho_so_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("ho_so_gpmb.id", ondelete="CASCADE"),
        nullable=False,
    )
    ho_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ho.id", ondelete="CASCADE"), nullable=False
    )
    status: Mapped[ChiTraStatusEnum] = mapped_column(
        SAEnum(ChiTraStatusEnum),
        nullable=False,
        default=ChiTraStatusEnum.da_tao,
    )
    so_tien_bt: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    so_tien_ht: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    so_tien_tdc: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    ghi_chu: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ke_toan_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    gddh_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    ly_do_tu_choi: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ngay_gui_duyet: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    ngay_duyet: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    ngay_ban_giao_mat_bang: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    ho_so: Mapped["HoSoGPMB"] = relationship(
        "HoSoGPMB", back_populates="chi_tra_list"
    )
    ho: Mapped["Ho"] = relationship("Ho", back_populates="chi_tra_list")
    ke_toan_user: Mapped[Optional["User"]] = relationship(
        "User", foreign_keys=[ke_toan_id]
    )
    gddh_user: Mapped[Optional["User"]] = relationship("User", foreign_keys=[gddh_id])

    __table_args__ = (Index("ix_ho_so_chi_tra_ho_so_id", "ho_so_id"),)


class KeHoachThang(Base):
    __tablename__ = "ke_hoach_thang"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    ho_so_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("ho_so_gpmb.id", ondelete="CASCADE"),
        nullable=False,
    )
    thang: Mapped[int] = mapped_column(Integer, nullable=False)
    nam: Mapped[int] = mapped_column(Integer, nullable=False)
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    da_xuat_bao_cao: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    ngay_xuat: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    ghi_chu: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    items: Mapped[List["KeHoachThangItem"]] = relationship(
        "KeHoachThangItem", back_populates="ke_hoach", cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint("ho_so_id", "thang", "nam", name="uq_ke_hoach_thang"),
    )


class KeHoachThangItem(Base):
    __tablename__ = "ke_hoach_thang_item"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    ke_hoach_thang_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("ke_hoach_thang.id", ondelete="CASCADE"),
        nullable=False,
    )
    task_instance_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("task_instances.id", ondelete="SET NULL"),
        nullable=True,
    )
    ten_cong_viec: Mapped[str] = mapped_column(Text, nullable=False)
    mo_ta: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ngay_du_kien: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    ghi_chu: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    la_viec_phat_sinh: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    da_hoan_thanh: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    thu_tu: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    ke_hoach: Mapped["KeHoachThang"] = relationship(
        "KeHoachThang", back_populates="items"
    )


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    body: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    link_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("ix_notifications_user_id_model", "user_id"),
    )


class AuditLog(Base):
    __tablename__ = "audit_log"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    actor_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    actor_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    actor: Mapped[Optional["User"]] = relationship("User", foreign_keys=[actor_id])

    __table_args__ = (
        Index("idx_audit_log_entity", "entity_type", "entity_id"),
    )

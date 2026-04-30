'use client'
import {
  Tabs, Typography, Spin, notification, Button, Descriptions, Tag,
  Table, Badge, Modal, Form, Input, Select, Space,
  Popconfirm, DatePicker, InputNumber, Alert, Divider,
} from 'antd'
import {
  PlusOutlined, DownloadOutlined, UploadOutlined,
  CheckOutlined, CloseOutlined, EditOutlined, DeleteOutlined,
  SendOutlined, KeyOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import type { ColumnsType } from 'antd/es/table'
import api from '@/lib/api'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { HoSo, Ho, TaskInstance, ChiTra, PaginatedResponse, PivotRow } from '@/types'
import {
  HO_STATUS_LABELS, HO_STATUS_COLORS,
  CHI_TRA_STATUS_LABELS, CHI_TRA_STATUS_COLORS,
} from '@/utils/constants'
import { formatDate, formatVND } from '@/utils/format'
import TaskDetail from '@/components/task/TaskDetail'
import ChiTraForm from '@/components/chi-tra/ChiTraForm'
import HoImport from '@/components/ho/HoImport'
import WorkflowTree from '@/components/task/WorkflowTree'
import EditHoSoModal from '@/components/ho-so/EditHoSoModal'
import EditHoModal from '@/components/ho/EditHoModal'
import EditChiTraModal from '@/components/chi-tra/EditChiTraModal'
import AuditTimeline from '@/components/chi-tra/AuditTimeline'
import BanGiaoMatBangModal from '@/components/chi-tra/BanGiaoMatBangModal'
import KeHoachThangTab from '@/components/ke-hoach/KeHoachThangTab'
import dayjs from 'dayjs'

const { Title } = Typography

// ─── Tab 1: Thong tin chung ──────────────────────────────────────────────────
function ThongTinChung({ hoSo, refetch }: { hoSo: HoSo; refetch: () => void }) {
  const currentUser = useCurrentUser()
  const canTransition = currentUser?.role === 'admin' || currentUser?.role === 'cbcq'
  const [editOpen, setEditOpen] = useState(false)

  const transitionMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const res = await api.patch(`/ho-so/${hoSo.id}/status`, { status: newStatus })
      return res.data
    },
    onSuccess: () => {
      notification.success({ message: 'Cập nhật trạng thái thành công' })
      refetch()
    },
    onError: () => notification.error({ message: 'Cập nhật thất bại' }),
  })

  return (
    <div style={{ background: 'white', padding: 24, borderRadius: 8 }}>
      {canTransition && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <Button icon={<EditOutlined />} onClick={() => setEditOpen(true)}>Sửa thông tin</Button>
        </div>
      )}
      <Descriptions bordered column={2} size="middle">
        <Descriptions.Item label="Mã hồ sơ">{hoSo.code}</Descriptions.Item>
        <Descriptions.Item label="Trạng thái">
          <Tag color={hoSo.status === 'chuan_bi' ? 'default' : hoSo.status === 'thuc_hien' ? 'processing' : 'success'}>
            {hoSo.status === 'chuan_bi' ? 'Chuẩn bị' : hoSo.status === 'thuc_hien' ? 'Thực hiện' : 'Hoàn thành'}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Tên công trình" span={2}>{hoSo.name}</Descriptions.Item>
        <Descriptions.Item label="Địa chỉ" span={2}>{hoSo.dia_chi || '—'}</Descriptions.Item>
        <Descriptions.Item label="CBCQ phụ trách">{hoSo.cbcq?.full_name || '—'}</Descriptions.Item>
        <Descriptions.Item label="Số hộ">{hoSo.so_ho}</Descriptions.Item>
        <Descriptions.Item label="Ngày bắt đầu">{formatDate(hoSo.ngay_bat_dau)}</Descriptions.Item>
        <Descriptions.Item label="Ngày kết thúc">{formatDate(hoSo.ngay_ket_thuc)}</Descriptions.Item>
        <Descriptions.Item label="Ngày tạo">{formatDate(hoSo.created_at)}</Descriptions.Item>
      </Descriptions>
      {canTransition && hoSo.status === 'chuan_bi' && (
        <div style={{ marginTop: 16 }}>
          <Popconfirm
            title="Chuyển hồ sơ sang trạng thái Thực hiện?"
            onConfirm={() => transitionMutation.mutate('thuc_hien')}
          >
            <Button type="primary" loading={transitionMutation.isPending}>
              Chuyển sang Thực hiện
            </Button>
          </Popconfirm>
        </div>
      )}
      {canTransition && hoSo.status === 'thuc_hien' && (
        <div style={{ marginTop: 16 }}>
          <Popconfirm
            title="Chuyển hồ sơ sang trạng thái Hoàn thành?"
            onConfirm={() => transitionMutation.mutate('hoan_thanh')}
          >
            <Button loading={transitionMutation.isPending}>
              Chuyển sang Hoàn thành
            </Button>
          </Popconfirm>
        </div>
      )}
      <EditHoSoModal hoSo={hoSo} open={editOpen} onClose={() => { setEditOpen(false); refetch() }} />
    </div>
  )
}

// ─── Tab 2: Ho ───────────────────────────────────────────────────────────────
function HoTab({ hoSoId }: { hoSoId: string }) {
  const queryClient = useQueryClient()
  const currentUser = useCurrentUser()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [modalOpen, setModalOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [editHoOpen, setEditHoOpen] = useState(false)
  const [selectedHo, setSelectedHo] = useState<Ho | null>(null)
  const [form] = Form.useForm()

  const { data, isLoading } = useQuery<PaginatedResponse<Ho>>({
    queryKey: ['ho', hoSoId, page, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        page_size: '50',
        ...(statusFilter ? { status: statusFilter } : {}),
      })
      const res = await api.get(`/ho-so/${hoSoId}/ho?${params}`)
      return res.data
    },
  })

  const createMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const res = await api.post(`/ho-so/${hoSoId}/ho`, values)
      return res.data
    },
    onSuccess: () => {
      notification.success({ message: 'Thêm hộ thành công' })
      setModalOpen(false)
      form.resetFields()
      queryClient.invalidateQueries({ queryKey: ['ho', hoSoId] })
    },
    onError: () => notification.error({ message: 'Thêm hộ thất bại' }),
  })

  const thongNhatMutation = useMutation({
    mutationFn: async (hoId: string) => {
      const res = await api.patch(`/ho-so/${hoSoId}/ho/${hoId}/status`, { status: 'da_thong_nhat' })
      return res.data
    },
    onSuccess: () => {
      notification.success({ message: 'Cập nhật trạng thái thành công' })
      queryClient.invalidateQueries({ queryKey: ['ho', hoSoId] })
    },
    onError: () => notification.error({ message: 'Cập nhật thất bại' }),
  })

  const deleteHoMutation = useMutation({
    mutationFn: async (hoId: string) => {
      await api.delete(`/ho-so/${hoSoId}/ho/${hoId}`)
    },
    onSuccess: () => {
      notification.success({ message: 'Xóa hộ thành công' })
      queryClient.invalidateQueries({ queryKey: ['ho', hoSoId] })
      queryClient.invalidateQueries({ queryKey: ['ho-so', hoSoId] })
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { detail?: string } } }
      notification.error({ message: e.response?.data?.detail || 'Xóa hộ thất bại' })
    },
  })

  const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'cbcq'

  const columns: ColumnsType<Ho> = [
    { title: 'STT', key: 'stt', width: 60, align: 'center', render: (_: unknown, __: Ho, index: number) => (page - 1) * 50 + index + 1 },
    { title: 'Mã hộ', dataIndex: 'ma_ho', key: 'ma_ho', width: 100 },
    { title: 'Loại đất', dataIndex: 'loai_dat', key: 'loai_dat', width: 100, render: (v: string | null) => v || '—' },
    { title: 'Tên chủ hộ', dataIndex: 'ten_chu_ho', key: 'ten_chu_ho', width: 220, ellipsis: true },
    { title: 'Địa chỉ', dataIndex: 'dia_chi', key: 'dia_chi', width: 150, ellipsis: true, render: (v: string | null) => v || '—' },
    { title: 'Thửa', dataIndex: 'thua', key: 'thua', width: 80, render: (v: string | null) => v || '—' },
    {
      title: 'Diện tích (m²)',
      dataIndex: 'dien_tich',
      key: 'dien_tich',
      width: 120,
      align: 'right',
      render: (v: number | null) => v != null ? v.toLocaleString('vi-VN') : '—',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 180,
      render: (status: string) => (
        <Badge
          status={HO_STATUS_COLORS[status] as 'default' | 'processing' | 'success' | 'error' | 'warning'}
          text={HO_STATUS_LABELS[status]}
        />
      ),
    },
    ...(canEdit ? [{
      title: 'Thao tác',
      key: 'action',
      width: 200,
      render: (_: unknown, record: Ho) => (
        <Space size={4}>
          {record.status === 'dang_xu_ly' && (
            <Popconfirm
              title="Đánh dấu đã thống nhất phương án?"
              onConfirm={() => thongNhatMutation.mutate(record.id)}
            >
              <Button size="small" type="primary">Đã thống nhất</Button>
            </Popconfirm>
          )}
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => { setSelectedHo(record); setEditHoOpen(true) }}
          />
          <Popconfirm
            title={`Xóa hộ ${record.ma_ho}?`}
            description="Chỉ xóa được hộ chưa vào quy trình."
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
            onConfirm={() => deleteHoMutation.mutate(record.id)}
          >
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              loading={deleteHoMutation.isPending}
            />
          </Popconfirm>
        </Space>
      ),
    }] : []),
  ]

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, justifyContent: 'space-between' }}>
        <Select
          style={{ width: 220 }}
          placeholder="Lọc trạng thái"
          allowClear
          value={statusFilter || undefined}
          onChange={(v) => { setStatusFilter(v || ''); setPage(1) }}
          options={Object.entries(HO_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
        />
        {canEdit && (
          <Space>
            <Button icon={<UploadOutlined />} onClick={() => setImportOpen(true)}>Import Excel</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>Thêm hộ</Button>
          </Space>
        )}
      </div>
      <div style={{ background: 'white', borderRadius: 8 }}>
        <Table
          columns={columns}
          dataSource={data?.items}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: 1000 }}
          pagination={{
            current: page,
            pageSize: 50,
            total: data?.total,
            onChange: (p) => setPage(p),
            showSizeChanger: false,
            showTotal: (t) => `Tổng ${t} hộ`,
          }}
          size="small"
        />
      </div>

      <Modal
        title="Thêm hộ"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields() }}
        footer={null}
        width={560}
      >
        <Form form={form} layout="vertical" onFinish={(v) => createMutation.mutate(v)}>
          <Form.Item name="ma_ho" label="Mã hộ" rules={[{ required: true, message: 'Nhập mã hộ' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="ten_chu_ho" label="Tên chủ hộ" rules={[{ required: true, message: 'Nhập tên chủ hộ' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="loai_dat" label="Loại đất">
            <Input />
          </Form.Item>
          <Form.Item name="dia_chi" label="Địa chỉ">
            <Input />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="thua" label="Thửa">
              <Input />
            </Form.Item>
            <Form.Item name="dien_tich" label="Diện tích (m²)">
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => { setModalOpen(false); form.resetFields() }}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={createMutation.isPending}>Thêm hộ</Button>
          </div>
        </Form>
      </Modal>

      <HoImport
        hoSoId={hoSoId}
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['ho', hoSoId] })}
      />

      <EditHoModal
        hoSoId={hoSoId}
        ho={selectedHo}
        open={editHoOpen}
        onClose={() => { setEditHoOpen(false); setSelectedHo(null) }}
      />
    </div>
  )
}

// ─── Helpers: transform backend node-tree into TaskInstance tree ──────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformApiNode(node: any): TaskInstance {
  const tasks = node.tasks || []
  const children: TaskInstance[] = (node.children || []).map(transformApiNode)
  const isStructuralLeaf = children.length === 0
  const completedCount: number = tasks.filter((t: any) => t.status === 'hoan_thanh').length
  const totalCount: number = tasks.length
  // Per-household nodes are never "clickable" in aggregate view
  const isLeaf = isStructuralLeaf && !node.per_household
  const singleTask = !node.per_household && tasks.length === 1 ? tasks[0] : null
  let nodeStatus: TaskInstance['status'] = 'dang_thuc_hien'
  if (singleTask) {
    nodeStatus = singleTask.status
  } else if (totalCount > 0 && completedCount === totalCount) {
    nodeStatus = 'hoan_thanh'
  }
  return {
    id: singleTask?.id ?? node.id,
    node_id: node.id,
    ho_id: singleTask?.ho_id ?? null,
    status: nodeStatus,
    code: node.code,
    name: node.name,
    level: node.level,
    per_household: node.per_household,
    is_leaf: isLeaf,
    completed_count: completedCount,
    total_count: totalCount,
    field_so_vb: node.field_so_vb,
    field_ngay_vb: node.field_ngay_vb,
    field_loai_vb: node.field_loai_vb,
    field_gia_tri_trinh: node.field_gia_tri_trinh,
    field_gia_tri_duyet: node.field_gia_tri_duyet,
    field_ghi_chu: node.field_ghi_chu,
    require_scan: node.require_scan,
    so_vb: singleTask?.so_vb ?? null,
    ngay_vb: singleTask?.ngay_vb ?? null,
    loai_vb: singleTask?.loai_vb ?? null,
    gia_tri_trinh: singleTask?.gia_tri_trinh ?? null,
    gia_tri_duyet: singleTask?.gia_tri_duyet ?? null,
    ghi_chu: singleTask?.ghi_chu ?? null,
    file_scan_url: singleTask?.scan_file_path ? `/uploads/${singleTask.scan_file_path}` : null,
    completed_at: singleTask?.completed_at ?? null,
    children,
  }
}

// ─── Tab 3: Quy trinh & Tien do ──────────────────────────────────────────────
function QuyTrinhTab({ hoSoId }: { hoSoId: string }) {
  const [selectedTask, setSelectedTask] = useState<TaskInstance | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const { data: tasks, isLoading } = useQuery<TaskInstance[]>({
    queryKey: ['tasks', hoSoId],
    queryFn: async () => {
      const res = await api.get(`/ho-so/${hoSoId}/tasks`)
      return (res.data.tree || []).map(transformApiNode)
    },
  })

  const handleTaskClick = (task: TaskInstance) => {
    setSelectedTask(task)
    setDrawerOpen(true)
  }

  if (isLoading) return <Spin style={{ display: 'block', margin: '40px auto' }} />

  return (
    <div style={{ background: 'white', padding: 16, borderRadius: 8 }}>
      <WorkflowTree
        tasks={tasks || []}
        hoSoId={hoSoId}
        onTaskClick={handleTaskClick}
      />
      <TaskDetail
        task={selectedTask}
        hoSoId={hoSoId}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  )
}

// ─── Tab 4: Pivot ─────────────────────────────────────────────────────────────
function PivotTab({ hoSoId }: { hoSoId: string }) {
  const { data: pivot, isLoading } = useQuery<PivotRow[]>({
    queryKey: ['pivot', hoSoId],
    queryFn: async () => {
      const res = await api.get(`/ho-so/${hoSoId}/pivot`)
      const apiData = res.data
      // Transform from {columns, rows} shape to PivotRow[]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (apiData.rows || []).map((row: any) => ({
        ho: {
          id: row.ho_id,
          ho_so_id: hoSoId,
          ma_ho: row.ma_ho,
          ten_chu_ho: row.ten_chu_ho,
          dia_chi: null,
          thua: null,
          loai_dat: null,
          dien_tich: null,
          status: row.ho_status,
          ly_do_kk: null,
        },
        tasks: row.tasks,
      }))
    },
  })

  const handleExport = async () => {
    try {
      const res = await api.get(`/ho-so/${hoSoId}/pivot/export`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `tien-do-${hoSoId}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch {
      notification.error({ message: 'Xuất file thất bại' })
    }
  }

  // Build dynamic columns from first row
  const taskCodes = pivot && pivot.length > 0 ? Object.keys(pivot[0].tasks) : []

  const frozenColumns: ColumnsType<PivotRow> = [
    {
      title: 'STT',
      key: 'stt',
      width: 60,
      fixed: 'left',
      align: 'center',
      render: (_: unknown, __: PivotRow, index: number) => index + 1,
    },
    {
      title: 'Mã hộ',
      key: 'ma_ho',
      width: 100,
      fixed: 'left',
      render: (_: unknown, record: PivotRow) => record.ho.ma_ho,
    },
    {
      title: 'Tên chủ hộ',
      key: 'ten_chu_ho',
      width: 160,
      fixed: 'left',
      render: (_: unknown, record: PivotRow) => record.ho.ten_chu_ho,
    },
  ]

  const taskColumns: ColumnsType<PivotRow> = taskCodes.map((code) => ({
    title: code,
    key: code,
    width: 80,
    align: 'center' as const,
    render: (_: unknown, record: PivotRow) =>
      record.tasks[code] === 'hoan_thanh' ? (
        <CheckOutlined style={{ color: '#52c41a', fontWeight: 700 }} />
      ) : null,
  }))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Button icon={<DownloadOutlined />} onClick={handleExport}>Xuất Excel</Button>
      </div>
      <div style={{ background: 'white', borderRadius: 8 }}>
        <Table
          columns={[...frozenColumns, ...taskColumns]}
          dataSource={pivot}
          rowKey={(r) => r.ho.id}
          loading={isLoading}
          scroll={{ x: 320 + taskCodes.length * 80, y: 500 }}
          pagination={false}
          size="small"
          bordered
        />
      </div>
    </div>
  )
}

// ─── Tab 5: Chi tra ──────────────────────────────────────────────────────────
function ChiTraTab({ hoSoId }: { hoSoId: string }) {
  const queryClient = useQueryClient()
  const currentUser = useCurrentUser()
  const [formOpen, setFormOpen] = useState(false)
  const [editChiTra, setEditChiTra] = useState<ChiTra | null>(null)
  const [tuChoiModal, setTuChoiModal] = useState<{ open: boolean; id: string | null }>({ open: false, id: null })
  const [tuChoiForm] = Form.useForm()
  const [ngayBanGiaoModal, setNgayBanGiaoModal] = useState<{ open: boolean; id: string | null }>({ open: false, id: null })
  const [ngayBanGiaoForm] = Form.useForm()
  // S4-FE-01: Bàn giao mặt bằng modal state
  const [banGiaoChiTra, setBanGiaoChiTra] = useState<ChiTra | null>(null)

  const canEditChiTra = currentUser?.role === 'admin' || currentUser?.role === 'ke_toan'
  const canBanGiao = currentUser?.role === 'admin' || currentUser?.role === 'cbcq'

  const { data: chiTraList, isLoading } = useQuery<ChiTra[]>({
    queryKey: ['chi-tra', hoSoId],
    queryFn: async () => {
      const res = await api.get(`/ho-so/${hoSoId}/chi-tra?page_size=100`)
      return res.data.items || []
    },
  })

  const guiDuyetMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/ho-so/${hoSoId}/chi-tra/${id}/gui-duyet`)
      return res.data
    },
    onSuccess: () => {
      notification.success({ message: 'Gửi duyệt thành công' })
      queryClient.invalidateQueries({ queryKey: ['chi-tra', hoSoId] })
    },
    onError: () => notification.error({ message: 'Gửi duyệt thất bại' }),
  })

  const duyetMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/ho-so/${hoSoId}/chi-tra/${id}/duyet`)
      return res.data
    },
    onSuccess: () => {
      notification.success({ message: 'Phê duyệt thành công' })
      queryClient.invalidateQueries({ queryKey: ['chi-tra', hoSoId] })
    },
    onError: () => notification.error({ message: 'Phê duyệt thất bại' }),
  })

  const tuChoiMutation = useMutation({
    mutationFn: async ({ id, ly_do }: { id: string; ly_do: string }) => {
      const res = await api.post(`/ho-so/${hoSoId}/chi-tra/${id}/tu-choi`, { ly_do })
      return res.data
    },
    onSuccess: () => {
      notification.success({ message: 'Từ chối thành công' })
      setTuChoiModal({ open: false, id: null })
      tuChoiForm.resetFields()
      queryClient.invalidateQueries({ queryKey: ['chi-tra', hoSoId] })
    },
    onError: () => notification.error({ message: 'Từ chối thất bại' }),
  })

  const ngayBanGiaoMutation = useMutation({
    mutationFn: async ({ id, ngay }: { id: string; ngay: string }) => {
      const res = await api.patch(`/ho-so/${hoSoId}/chi-tra/${id}/ngay-ban-giao`, { ngay_ban_giao: ngay })
      return res.data
    },
    onSuccess: () => {
      notification.success({ message: 'Cập nhật ngày bàn giao thành công' })
      setNgayBanGiaoModal({ open: false, id: null })
      ngayBanGiaoForm.resetFields()
      queryClient.invalidateQueries({ queryKey: ['chi-tra', hoSoId] })
    },
    onError: () => notification.error({ message: 'Cập nhật thất bại' }),
  })

  const taiGuiMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/ho-so/${hoSoId}/chi-tra/${id}/tai-gui`)
      return res.data
    },
    onSuccess: () => {
      notification.success({ message: 'Tái gửi duyệt thành công' })
      queryClient.invalidateQueries({ queryKey: ['chi-tra', hoSoId] })
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { detail?: string } } }
      notification.error({ message: e.response?.data?.detail || 'Tái gửi thất bại' })
    },
  })

  const columns: ColumnsType<ChiTra> = [
    {
      title: 'Hộ',
      key: 'ho',
      render: (_: unknown, r: ChiTra) =>
        r.ho ? `${r.ho.ma_ho} - ${r.ho.ten_chu_ho}` : r.ho_id,
    },
    {
      title: 'Tổng chi trả',
      dataIndex: 'tong_so_tien',
      key: 'tong_so_tien',
      width: 160,
      align: 'right',
      render: (v: number) => formatVND(v),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (s: string) => (
        <Tag color={CHI_TRA_STATUS_COLORS[s]}>{CHI_TRA_STATUS_LABELS[s]}</Tag>
      ),
    },
    { title: 'Ngày tạo', dataIndex: 'created_at', key: 'created_at', width: 110, render: (d: string) => formatDate(d) },
    {
      title: 'Thao tác',
      key: 'action',
      width: 240,
      render: (_: unknown, record: ChiTra) => (
        <Space size="small">
          {currentUser?.role === 'ke_toan' && record.status === 'da_tao' && (
            <Popconfirm title="Gửi duyệt hồ sơ chi trả này?" onConfirm={() => guiDuyetMutation.mutate(record.id)}>
              <Button size="small" type="primary">Gửi duyệt</Button>
            </Popconfirm>
          )}
          {currentUser?.role === 'gddh' && record.status === 'cho_phe_duyet' && (
            <>
              <Popconfirm title="Phê duyệt hồ sơ chi trả?" onConfirm={() => duyetMutation.mutate(record.id)}>
                <Button size="small" type="primary" icon={<CheckOutlined />}>Duyệt</Button>
              </Popconfirm>
              <Button
                size="small"
                danger
                icon={<CloseOutlined />}
                onClick={() => setTuChoiModal({ open: true, id: record.id })}
              >
                Từ chối
              </Button>
            </>
          )}
          {currentUser?.role === 'cbcq' && record.status === 'da_phe_duyet' && !record.ngay_ban_giao_mat_bang && (
            <Button size="small" onClick={() => setNgayBanGiaoModal({ open: true, id: record.id })}>
              Cập nhật bàn giao
            </Button>
          )}
          {record.ngay_ban_giao_mat_bang && (
            <span style={{ fontSize: 12, color: '#52c41a' }}>
              Bàn giao: {formatDate(record.ngay_ban_giao_mat_bang)}
            </span>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        {currentUser?.role === 'ke_toan' && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setFormOpen(true)}>
            Tạo mới chi trả
          </Button>
        )}
      </div>
      <div style={{ background: 'white', borderRadius: 8 }}>
        <Table
          columns={columns}
          dataSource={chiTraList}
          rowKey="id"
          loading={isLoading}
          pagination={false}
          size="small"
          expandable={{
            expandedRowRender: (record: ChiTra) => (
              <div style={{ padding: '12px 16px', background: '#fafafa', borderRadius: 6 }}>
                {/* S4-FE-01: Bàn giao mặt bằng action panel */}
                {record.status === 'da_phe_duyet' && canBanGiao && (
                  <div style={{ marginBottom: 16 }}>
                    <Button
                      type="primary"
                      icon={<KeyOutlined />}
                      onClick={() => setBanGiaoChiTra(record)}
                    >
                      Bàn giao mặt bằng
                    </Button>
                    <Divider style={{ margin: '12px 0' }} />
                  </div>
                )}
                {/* S3-FE-02: bi_tu_choi panel */}
                {record.status === 'bi_tu_choi' && (
                  <div style={{ marginBottom: 16 }}>
                    {record.ly_do_tu_choi && (
                      <Alert
                        type="error"
                        message={`Lý do từ chối: ${record.ly_do_tu_choi}`}
                        style={{ marginBottom: 12 }}
                        showIcon
                      />
                    )}
                    {canEditChiTra && (
                      <Space>
                        <Button
                          icon={<EditOutlined />}
                          onClick={() => setEditChiTra(record)}
                        >
                          Sửa
                        </Button>
                        <Popconfirm
                          title="Tái gửi duyệt hồ sơ chi trả này?"
                          description="Hồ sơ sẽ được chuyển về trạng thái chờ phê duyệt."
                          onConfirm={() => taiGuiMutation.mutate(record.id)}
                          okText="Tái gửi"
                          cancelText="Hủy"
                        >
                          <Button
                            type="primary"
                            icon={<SendOutlined />}
                            loading={taiGuiMutation.isPending}
                          >
                            Tái gửi duyệt
                          </Button>
                        </Popconfirm>
                      </Space>
                    )}
                    <Divider style={{ margin: '12px 0' }} />
                  </div>
                )}
                {/* S3-FE-04: Audit timeline */}
                <AuditTimeline hoSoId={hoSoId} chiTraId={record.id} />
              </div>
            ),
          }}
        />
      </div>

      <ChiTraForm
        hoSoId={hoSoId}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['chi-tra', hoSoId] })}
      />

      {/* S3-FE-02: Edit modal */}
      {editChiTra && (
        <EditChiTraModal
          hoSoId={hoSoId}
          chiTra={editChiTra}
          open={editChiTra !== null}
          onClose={() => setEditChiTra(null)}
        />
      )}

      {/* S4-FE-01: Bàn giao mặt bằng modal */}
      {banGiaoChiTra && (
        <BanGiaoMatBangModal
          hoSoId={hoSoId}
          chiTra={banGiaoChiTra}
          open={banGiaoChiTra !== null}
          onClose={() => setBanGiaoChiTra(null)}
        />
      )}

      <Modal
        title="Lý do từ chối"
        open={tuChoiModal.open}
        onCancel={() => { setTuChoiModal({ open: false, id: null }); tuChoiForm.resetFields() }}
        footer={null}
      >
        <Form form={tuChoiForm} layout="vertical" onFinish={(v) => {
          if (tuChoiModal.id) tuChoiMutation.mutate({ id: tuChoiModal.id, ly_do: v.ly_do })
        }}>
          <Form.Item name="ly_do" label="Lý do từ chối" rules={[{ required: true, message: 'Nhập lý do' }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => { setTuChoiModal({ open: false, id: null }); tuChoiForm.resetFields() }}>Hủy</Button>
            <Button type="primary" danger htmlType="submit" loading={tuChoiMutation.isPending}>Từ chối</Button>
          </div>
        </Form>
      </Modal>

      <Modal
        title="Cập nhật ngày bàn giao mặt bằng"
        open={ngayBanGiaoModal.open}
        onCancel={() => { setNgayBanGiaoModal({ open: false, id: null }); ngayBanGiaoForm.resetFields() }}
        footer={null}
      >
        <Form form={ngayBanGiaoForm} layout="vertical" onFinish={(v) => {
          if (ngayBanGiaoModal.id) {
            ngayBanGiaoMutation.mutate({
              id: ngayBanGiaoModal.id,
              ngay: dayjs(v.ngay_ban_giao).format('YYYY-MM-DD'),
            })
          }
        }}>
          <Form.Item name="ngay_ban_giao" label="Ngày bàn giao" rules={[{ required: true, message: 'Chọn ngày' }]}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => { setNgayBanGiaoModal({ open: false, id: null }); ngayBanGiaoForm.resetFields() }}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={ngayBanGiaoMutation.isPending}>Lưu</Button>
          </div>
        </Form>
      </Modal>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HoSoDetailPage() {
  const params = useParams()
  const id = params.id as string

  const { data: hoSo, isLoading, refetch } = useQuery<HoSo>({
    queryKey: ['ho-so', id],
    queryFn: async () => {
      const res = await api.get(`/ho-so/${id}`)
      return res.data
    },
  })

  if (isLoading) return <Spin style={{ display: 'block', margin: '80px auto' }} />
  if (!hoSo) return <div style={{ padding: 24 }}>Không tìm thấy hồ sơ</div>

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          {hoSo.code} — {hoSo.name}
        </Title>
      </div>
      <Tabs
        defaultActiveKey="1"
        type="card"
        items={[
          {
            key: '1',
            label: 'Thông tin chung',
            children: <ThongTinChung hoSo={hoSo} refetch={refetch} />,
          },
          {
            key: '2',
            label: `Hộ (${hoSo.so_ho})`,
            children: <HoTab hoSoId={id} />,
          },
          {
            key: '3',
            label: 'Quy trình & Tiến độ',
            children: <QuyTrinhTab hoSoId={id} />,
          },
          {
            key: '4',
            label: 'Tiến độ theo hộ',
            children: <PivotTab hoSoId={id} />,
          },
          {
            key: '5',
            label: 'Chi trả',
            children: <ChiTraTab hoSoId={id} />,
          },
          {
            key: 'ke-hoach',
            label: 'Kế hoạch tháng',
            children: <KeHoachThangTab hoSoId={id} />,
          },
        ]}
      />
    </div>
  )
}

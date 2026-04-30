'use client'
import { Empty, Select, Space, Spin, Table, Tabs, Tag, Typography } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import type { ColumnsType } from 'antd/es/table'
import api from '@/lib/api'
import { getCurrentUser } from '@/lib/auth'
import { formatDate } from '@/utils/format'

const { Title } = Typography

// ─── Types ────────────────────────────────────────────────────────────────────

interface CongViecItem {
  id: string
  ho_so_id: string
  ho_so_code: string
  ho_so_name: string
  ten_cong_viec: string
  trang_thai: string
  trang_thai_label: string
  cbcq_name: string | null
  updated_at: string | null
}

interface TasksResponse {
  total: number
  page: number
  page_size: number
  items: CongViecItem[]
}

interface HoSoOption {
  id: string
  code: string
  name: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TASK_STATUS_OPTIONS = [
  { value: 'dang_thuc_hien', label: 'Đang thực hiện' },
  { value: 'hoan_thanh', label: 'Hoàn thành' },
]

const TASK_STATUS_COLORS: Record<string, string> = {
  dang_thuc_hien: 'processing',
  hoan_thanh: 'success',
}

// ─── Task table columns factory ───────────────────────────────────────────────

function buildColumns(page: number): ColumnsType<CongViecItem> {
  return [
    {
      title: 'STT',
      key: 'stt',
      width: 60,
      align: 'center',
      render: (_: unknown, __: CongViecItem, index: number) => (page - 1) * 20 + index + 1,
    },
    {
      title: 'Hồ sơ',
      key: 'ho_so',
      width: 180,
      render: (_: unknown, record: CongViecItem) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 12, color: '#9B1B30' }}>{record.ho_so_code}</div>
          <div style={{ fontSize: 12, color: '#555', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>
            {record.ho_so_name}
          </div>
        </div>
      ),
    },
    {
      title: 'Tên công việc',
      dataIndex: 'ten_cong_viec',
      key: 'ten_cong_viec',
      ellipsis: true,
    },
    {
      title: 'Trạng thái',
      key: 'trang_thai',
      width: 160,
      render: (_: unknown, record: CongViecItem) => (
        <Tag color={TASK_STATUS_COLORS[record.trang_thai] ?? 'default'}>
          {record.trang_thai_label}
        </Tag>
      ),
    },
    {
      title: 'CBCQ',
      dataIndex: 'cbcq_name',
      key: 'cbcq_name',
      width: 160,
      render: (v: string | null) => v ?? '—',
    },
    {
      title: 'Cập nhật lúc',
      key: 'updated_at',
      width: 130,
      render: (_: unknown, record: CongViecItem) => formatDate(record.updated_at),
    },
  ]
}

// ─── Tab 1: Tất cả công việc ──────────────────────────────────────────────────

function TatCaCongViecTab({ hoSoOptions }: { hoSoOptions: { value: string; label: string }[] }) {
  const [page, setPage] = useState(1)
  const [hoSoId, setHoSoId] = useState<string | undefined>()
  const [trangThai, setTrangThai] = useState<string | undefined>()

  const user = getCurrentUser()
  const isCbcq = user?.role === 'cbcq'

  const { data, isLoading } = useQuery<TasksResponse>({
    queryKey: ['tasks-all', page, hoSoId, trangThai],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), page_size: '20' })
      if (hoSoId) params.append('ho_so_id', hoSoId)
      if (trangThai) params.append('trang_thai', trangThai)
      const res = await api.get(`/tasks?${params}`)
      return res.data
    },
    enabled: !!hoSoId || isCbcq,
  })

  const columns = buildColumns(page)

  return (
    <div>
      {/* Filters */}
      <div
        style={{
          background: '#fff',
          padding: '12px 16px',
          borderRadius: 8,
          marginBottom: 16,
          border: '1px solid #F0E8E8',
        }}
      >
        <Space wrap>
          <Select
            placeholder="Chọn hồ sơ GPMB để xem công việc"
            style={{ width: 300 }}
            options={hoSoOptions}
            value={hoSoId}
            onChange={(val) => { setHoSoId(val); setPage(1) }}
            allowClear
            showSearch
            filterOption={(input, option) =>
              String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
          />
          <Select
            allowClear
            placeholder="Tất cả trạng thái"
            style={{ width: 180 }}
            options={TASK_STATUS_OPTIONS}
            value={trangThai}
            onChange={(val) => { setTrangThai(val); setPage(1) }}
            disabled={!hoSoId && !isCbcq}
          />
        </Space>
      </div>

      {/* Content */}
      {!hoSoId && !isCbcq ? (
        <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #F0E8E8', padding: 48 }}>
          <Empty description="Vui lòng chọn hồ sơ GPMB để xem công việc" />
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #F0E8E8' }}>
          <Table<CongViecItem>
            columns={columns}
            dataSource={data?.items ?? []}
            rowKey="id"
            loading={isLoading}
            pagination={{
              current: page,
              pageSize: 20,
              total: data?.total ?? 0,
              onChange: setPage,
              showTotal: (total) => `Tổng ${total} công việc`,
              showSizeChanger: false,
            }}
            size="small"
            scroll={{ x: 900 }}
          />
        </div>
      )}
    </div>
  )
}

// ─── Tab 2: Việc của tôi ──────────────────────────────────────────────────────

function ViecCuaToiTab() {
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery<TasksResponse>({
    queryKey: ['tasks-my', page],
    queryFn: async () => {
      const params = new URLSearchParams({ my_tasks: 'true', page: String(page), page_size: '20' })
      const res = await api.get(`/tasks?${params}`)
      return res.data
    },
  })

  const columns = buildColumns(page)

  return (
    <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #F0E8E8' }}>
      {isLoading ? (
        <div style={{ padding: 48, textAlign: 'center' }}>
          <Spin />
        </div>
      ) : (
        <Table<CongViecItem>
          columns={columns}
          dataSource={data?.items ?? []}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: page,
            pageSize: 20,
            total: data?.total ?? 0,
            onChange: setPage,
            showTotal: (total) => `Tổng ${total} công việc`,
            showSizeChanger: false,
          }}
          size="small"
          scroll={{ x: 900 }}
          locale={{ emptyText: 'Không có công việc nào được giao cho bạn' }}
        />
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CongViecPage() {
  // Load hồ sơ list for filter (Tab 1)
  const { data: hoSoList } = useQuery<HoSoOption[]>({
    queryKey: ['ho-so-filter-list'],
    queryFn: async () => {
      const res = await api.get('/ho-so?page_size=200')
      const data = res.data
      return data.items || data
    },
    staleTime: 60_000,
  })

  const hoSoOptions = useMemo(
    () => (hoSoList || []).map((hs) => ({ value: hs.id, label: `${hs.code} — ${hs.name}` })),
    [hoSoList],
  )

  const tabItems = [
    {
      key: 'tat-ca',
      label: 'Tất cả công việc',
      children: <TatCaCongViecTab hoSoOptions={hoSoOptions} />,
    },
    {
      key: 'viec-cua-toi',
      label: 'Việc của tôi',
      children: <ViecCuaToiTab />,
    },
  ]

  return (
    <div>
      <Title level={4} style={{ color: '#9B1B30', marginBottom: 16 }}>
        Quản lý Công việc
      </Title>
      <Tabs defaultActiveKey="tat-ca" items={tabItems} />
    </div>
  )
}

'use client'
import { Input, Select, Space, Table, Tag, Typography } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ColumnsType } from 'antd/es/table'
import api from '@/lib/api'
import { useCurrentUser } from '@/hooks/useCurrentUser'

const { Title } = Typography

// ─── Types ────────────────────────────────────────────────────────────────────

interface HoDanItem {
  id: string
  ho_so_id: string
  ho_so_code: string
  ho_so_name: string
  ten_chu_ho: string
  dia_chi: string | null
  dien_tich: number | null
  trang_thai: string
  trang_thai_label: string
  cbcq_name: string | null
}

interface HoDanResponse {
  total: number
  page: number
  page_size: number
  items: HoDanItem[]
}

interface HoSoOption {
  id: string
  code: string
  name: string
  cbcq?: { id: string; full_name: string } | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TRANG_THAI_OPTIONS = [
  { value: 'moi', label: 'Mới' },
  { value: 'dang_xu_ly', label: 'Đang xử lý' },
  { value: 'da_thong_nhat', label: 'Đã thống nhất' },
  { value: 'da_chi_tra', label: 'Đã chi trả' },
  { value: 'da_ban_giao', label: 'Đã bàn giao' },
]

const TRANG_THAI_COLORS: Record<string, string> = {
  moi: 'default',
  dang_xu_ly: 'processing',
  da_thong_nhat: 'success',
  da_chi_tra: 'warning',
  da_ban_giao: 'green',
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function HoDanPage() {
  const router = useRouter()
  const user = useCurrentUser()
  const [page, setPage] = useState(1)
  const [hoSoId, setHoSoId] = useState<string | undefined>()
  const [trangThai, setTrangThai] = useState<string | undefined>()
  const [cbcqId, setCbcqId] = useState<string | undefined>()
  const [search, setSearch] = useState('')

  // Load hồ sơ list for filter selects
  const { data: hoSoList } = useQuery<HoSoOption[]>({
    queryKey: ['ho-so-filter-list'],
    queryFn: async () => {
      const res = await api.get('/ho-so?page_size=200')
      const data = res.data
      return data.items || data
    },
    staleTime: 60_000,
  })

  // Build unique CBCQ options from ho-so list
  const cbcqOptions = useMemo(() => {
    if (!hoSoList) return []
    const seen = new Set<string>()
    const opts: { value: string; label: string }[] = []
    for (const hs of hoSoList) {
      if (hs.cbcq?.id && !seen.has(hs.cbcq.id)) {
        seen.add(hs.cbcq.id)
        opts.push({ value: hs.cbcq.id, label: hs.cbcq.full_name })
      }
    }
    return opts
  }, [hoSoList])

  const hoSoOptions = useMemo(
    () => (hoSoList || []).map((hs) => ({ value: hs.id, label: `${hs.code} — ${hs.name}` })),
    [hoSoList],
  )

  // Main data query
  const { data, isLoading } = useQuery<HoDanResponse>({
    queryKey: ['ho-dan', page, hoSoId, trangThai, cbcqId, search],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), page_size: '20' })
      if (hoSoId) params.append('ho_so_id', hoSoId)
      if (trangThai) params.append('trang_thai', trangThai)
      if (cbcqId) params.append('cbcq_id', cbcqId)
      if (search) params.append('search', search)
      const res = await api.get(`/ho?${params}`)
      return res.data
    },
  })

  const handleFilterChange = (setter: (v: string | undefined) => void) => (val: string | undefined) => {
    setter(val)
    setPage(1)
  }

  const columns: ColumnsType<HoDanItem> = [
    {
      title: 'STT',
      key: 'stt',
      width: 60,
      align: 'center',
      render: (_: unknown, __: HoDanItem, index: number) => (page - 1) * 20 + index + 1,
    },
    {
      title: 'Hồ sơ',
      key: 'ho_so',
      width: 200,
      render: (_: unknown, record: HoDanItem) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 12, color: '#9B1B30' }}>{record.ho_so_code}</div>
          <div style={{ fontSize: 12, color: '#555' }}>{record.ho_so_name}</div>
        </div>
      ),
    },
    {
      title: 'Tên chủ hộ',
      dataIndex: 'ten_chu_ho',
      key: 'ten_chu_ho',
      ellipsis: true,
    },
    {
      title: 'Địa chỉ',
      dataIndex: 'dia_chi',
      key: 'dia_chi',
      ellipsis: true,
    },
    {
      title: 'Diện tích (m²)',
      dataIndex: 'dien_tich',
      key: 'dien_tich',
      width: 130,
      align: 'right',
      render: (v: number | null) => (v != null ? v.toFixed(1) : '—'),
    },
    {
      title: 'Trạng thái',
      key: 'trang_thai',
      width: 140,
      render: (_: unknown, record: HoDanItem) => (
        <Tag color={TRANG_THAI_COLORS[record.trang_thai] ?? 'default'}>
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
  ]

  return (
    <div>
      <Title level={4} style={{ color: '#9B1B30', marginBottom: 16 }}>
        Quản lý Hộ dân
        {data ? (
          <span style={{ fontSize: 14, fontWeight: 400, color: '#555', marginLeft: 8 }}>
            ({data.total} hộ)
          </span>
        ) : null}
      </Title>

      {/* Filter bar */}
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
            allowClear
            placeholder="Tất cả hồ sơ"
            style={{ width: 260 }}
            options={hoSoOptions}
            value={hoSoId}
            onChange={handleFilterChange(setHoSoId)}
            showSearch
            filterOption={(input, option) =>
              String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
          />
          <Select
            allowClear
            placeholder="Tất cả trạng thái"
            style={{ width: 180 }}
            options={TRANG_THAI_OPTIONS}
            value={trangThai}
            onChange={handleFilterChange(setTrangThai)}
          />
          {user?.role !== 'cbcq' && (
            <Select
              allowClear
              placeholder="Tất cả CBCQ"
              style={{ width: 200 }}
              options={cbcqOptions}
              value={cbcqId}
              onChange={handleFilterChange(setCbcqId)}
              showSearch
              filterOption={(input, option) =>
                String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          )}
          <Input.Search
            placeholder="Tìm theo tên chủ hộ"
            allowClear
            style={{ width: 240 }}
            value={search}
            onChange={(e) => {
              if (!e.target.value) {
                setSearch('')
                setPage(1)
              }
            }}
            onSearch={(val) => {
              setSearch(val)
              setPage(1)
            }}
          />
        </Space>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #F0E8E8' }}>
        <Table<HoDanItem>
          columns={columns}
          dataSource={data?.items ?? []}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: page,
            pageSize: 20,
            total: data?.total ?? 0,
            onChange: setPage,
            showTotal: (total) => `Tổng ${total} hộ`,
            showSizeChanger: false,
          }}
          size="small"
          scroll={{ x: 900 }}
          onRow={(record) => ({
            onClick: () => router.push(`/ho-so-gpmb/${record.ho_so_id}`),
            style: { cursor: 'pointer' },
          })}
        />
      </div>
    </div>
  )
}

'use client'
import {
  Card, Table, Tag, Typography, Select, Button, DatePicker,
  notification, Space, Spin,
} from 'antd'
import { DownloadOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import type { ColumnsType } from 'antd/es/table'
import type { Dayjs } from 'dayjs'
import api from '@/lib/api'
import { CHI_TRA_STATUS_LABELS, CHI_TRA_STATUS_COLORS } from '@/utils/constants'
import { formatDate } from '@/utils/format'
import { HoSo } from '@/types'
import dayjs from 'dayjs'

const { Title } = Typography
const { RangePicker } = DatePicker

interface BaoCaoItem {
  ma_hsct: string
  ho_so: { id: string; code: string; name: string }
  ho: { id: string; ma_ho: string; ten_chu_ho: string }
  so_tien_bt: number | null
  so_tien_ht: number | null
  so_tien_tdc: number | null
  tong_de_nghi: number
  status: string
  approved_at: string | null
  ngay_ban_giao_mat_bang: string | null
}

interface BaoCaoResponse {
  items: BaoCaoItem[]
  total: number
  tong_da_chi_tra: number
  tong_dang_cho_duyet: number
}

function fmtMoney(value: number | null): string {
  if (value == null) return '—'
  return value.toLocaleString('vi-VN') + ' đ'
}

export default function BaoCaoPage() {
  const [hoSoFilter, setHoSoFilter] = useState<string | undefined>(undefined)
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null)
  const [page, setPage] = useState(1)
  const [exportLoading, setExportLoading] = useState(false)

  // Fetch ho so list for Select
  const { data: hoSoList, isLoading: hoSoLoading } = useQuery<HoSo[]>({
    queryKey: ['ho-so-list-bao-cao'],
    queryFn: async () => {
      const res = await api.get('/ho-so?page_size=200')
      return res.data.items || []
    },
    staleTime: 60_000,
  })

  // Build query params
  const queryParams = () => {
    const params: Record<string, string> = {
      page: String(page),
      page_size: '50',
    }
    if (hoSoFilter) params.ho_so_id = hoSoFilter
    if (statusFilter) params.status = statusFilter
    if (dateRange?.[0]) params.tu_ngay = dateRange[0].format('YYYY-MM-DD')
    if (dateRange?.[1]) params.den_ngay = dateRange[1].format('YYYY-MM-DD')
    return params
  }

  const { data, isLoading } = useQuery<BaoCaoResponse>({
    queryKey: ['bao-cao-chi-tra', hoSoFilter, statusFilter, dateRange, page],
    queryFn: async () => {
      const params = new URLSearchParams(queryParams())
      const res = await api.get(`/reports/chi-tra?${params}`)
      return res.data
    },
    staleTime: 0,
  })

  const handleExport = async () => {
    setExportLoading(true)
    try {
      const params = new URLSearchParams(queryParams())
      // Remove pagination for export
      params.delete('page')
      params.delete('page_size')
      const res = await api.get(`/reports/chi-tra/export-excel?${params}`, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data as BlobPart]))
      const a = document.createElement('a')
      a.href = url
      a.download = `bao-cao-chi-tra-${dayjs().format('YYYY-MM-DD')}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      notification.error({ message: 'Xuất Excel thất bại' })
    } finally {
      setExportLoading(false)
    }
  }

  const columns: ColumnsType<BaoCaoItem> = [
    {
      title: 'Mã HSCT',
      dataIndex: 'ma_hsct',
      key: 'ma_hsct',
      width: 120,
    },
    {
      title: 'Hồ sơ GPMB',
      key: 'ho_so',
      width: 160,
      ellipsis: true,
      render: (_: unknown, r: BaoCaoItem) => r.ho_so?.code || '—',
    },
    {
      title: 'Hộ / Tên chủ hộ',
      key: 'ho',
      ellipsis: true,
      render: (_: unknown, r: BaoCaoItem) =>
        r.ho ? `${r.ho.ma_ho} — ${r.ho.ten_chu_ho}` : '—',
    },
    {
      title: 'BT (đ)',
      dataIndex: 'so_tien_bt',
      key: 'so_tien_bt',
      width: 130,
      align: 'right',
      render: (v: number | null) => fmtMoney(v),
    },
    {
      title: 'HT (đ)',
      dataIndex: 'so_tien_ht',
      key: 'so_tien_ht',
      width: 130,
      align: 'right',
      render: (v: number | null) => fmtMoney(v),
    },
    {
      title: 'TĐC (đ)',
      dataIndex: 'so_tien_tdc',
      key: 'so_tien_tdc',
      width: 130,
      align: 'right',
      render: (v: number | null) => fmtMoney(v),
    },
    {
      title: 'Tổng đề nghị',
      dataIndex: 'tong_de_nghi',
      key: 'tong_de_nghi',
      width: 150,
      align: 'right',
      render: (v: number) => (
        <span style={{ fontWeight: 600 }}>{fmtMoney(v)}</span>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (s: string) => (
        <Tag color={CHI_TRA_STATUS_COLORS[s] || 'default'}>
          {CHI_TRA_STATUS_LABELS[s] || s}
        </Tag>
      ),
    },
    {
      title: 'Ngày phê duyệt',
      dataIndex: 'approved_at',
      key: 'approved_at',
      width: 120,
      render: (d: string | null) => formatDate(d),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0 }}>Báo cáo chi trả BTHTTĐC</Title>
        <Button
          icon={<DownloadOutlined />}
          loading={exportLoading}
          onClick={handleExport}
        >
          Xuất Excel
        </Button>
      </div>

      {/* Filter bar */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Select
            style={{ width: 260 }}
            placeholder="Chọn hồ sơ GPMB"
            allowClear
            showSearch
            loading={hoSoLoading}
            value={hoSoFilter}
            onChange={(v) => { setHoSoFilter(v); setPage(1) }}
            filterOption={(input, option) =>
              String(option?.label || '').toLowerCase().includes(input.toLowerCase())
            }
            options={(hoSoList || []).map(hs => ({
              value: hs.id,
              label: `${hs.code} — ${hs.name}`,
            }))}
          />
          <Select
            style={{ width: 200 }}
            placeholder="Trạng thái"
            allowClear
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setPage(1) }}
            options={Object.entries(CHI_TRA_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
          />
          <RangePicker
            format="DD/MM/YYYY"
            placeholder={['Từ ngày', 'Đến ngày']}
            value={dateRange}
            onChange={(range) => { setDateRange(range as [Dayjs | null, Dayjs | null] | null); setPage(1) }}
          />
          <Button
            onClick={() => {
              setHoSoFilter(undefined)
              setStatusFilter(undefined)
              setDateRange(null)
              setPage(1)
            }}
          >
            Xóa bộ lọc
          </Button>
        </Space>
      </Card>

      {/* Table */}
      <Card size="small">
        {isLoading ? (
          <Spin style={{ display: 'block', margin: '40px auto' }} />
        ) : (
          <>
            <Table
              columns={columns}
              dataSource={data?.items || []}
              rowKey="ma_hsct"
              pagination={{
                current: page,
                pageSize: 50,
                total: data?.total || 0,
                onChange: (p) => setPage(p),
                showSizeChanger: false,
                showTotal: (t) => `Tổng ${t} hồ sơ`,
              }}
              size="small"
              scroll={{ x: 1200 }}
              locale={{ emptyText: 'Không có dữ liệu' }}
            />

            {/* Summary row */}
            <div
              style={{
                display: 'flex',
                gap: 32,
                padding: '12px 16px',
                borderTop: '1px solid #f0f0f0',
                marginTop: 4,
                background: '#fafafa',
                borderRadius: '0 0 8px 8px',
              }}
            >
              <div>
                <span style={{ color: '#6B6B6B', marginRight: 8 }}>Tổng đã phê duyệt:</span>
                <span style={{ fontWeight: 700, color: '#52c41a', fontSize: 16 }}>
                  {fmtMoney(data?.tong_da_chi_tra ?? 0)}
                </span>
              </div>
              <div>
                <span style={{ color: '#6B6B6B', marginRight: 8 }}>Tổng chờ duyệt:</span>
                <span style={{ fontWeight: 700, color: '#faad14', fontSize: 16 }}>
                  {fmtMoney(data?.tong_dang_cho_duyet ?? 0)}
                </span>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}

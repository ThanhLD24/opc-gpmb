'use client'
import {
  Alert, Button, DatePicker, Empty, Select, Space, Spin, Table, Tag, Typography, message,
} from 'antd'
import { DownloadOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import type { ColumnsType } from 'antd/es/table'
import dayjs, { type Dayjs } from 'dayjs'
import api from '@/lib/api'
import { formatDate } from '@/utils/format'

const { Title } = Typography

// ─── Types ────────────────────────────────────────────────────────────────────

interface KeHoachItem {
  ho_so_id: string
  ho_so_code: string
  ho_so_name: string
  ke_hoach_id: string
  ten_cong_viec: string
  loai: 'quy_trinh' | 'phat_sinh'
  ngay_du_kien: string | null
  da_hoan_thanh: boolean
  ghi_chu: string | null
}

interface KeHoachResponse {
  thang: number
  nam: number
  total_items: number
  items: KeHoachItem[]
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function KeHoachThangPage() {
  const [month, setMonth] = useState<Dayjs>(dayjs())
  const [exporting, setExporting] = useState(false)
  const [loaiFilter, setLoaiFilter] = useState<'quy_trinh' | 'phat_sinh' | undefined>(undefined)
  const [trangThaiFilter, setTrangThaiFilter] = useState<boolean | undefined>(undefined)
  const [hoSoFilter, setHoSoFilter] = useState<string | undefined>(undefined)

  const thang = month.month() + 1
  const nam = month.year()

  const { data, isLoading, isError, refetch } = useQuery<KeHoachResponse>({
    queryKey: ['ke-hoach-thang-report', thang, nam],
    queryFn: async () => {
      const res = await api.get(`/ke-hoach-thang?thang=${thang}&nam=${nam}`)
      return res.data
    },
  })

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await api.get(`/ke-hoach-thang/export?thang=${thang}&nam=${nam}`, {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `ke-hoach-thang-${String(thang).padStart(2, '0')}-${nam}.xlsx`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch {
      message.error('Không có kế hoạch nào trong tháng này để xuất')
    } finally {
      setExporting(false)
    }
  }

  const filteredItems = (data?.items ?? []).filter(item => {
    if (loaiFilter !== undefined && item.loai !== loaiFilter) return false
    if (trangThaiFilter !== undefined && item.da_hoan_thanh !== trangThaiFilter) return false
    if (hoSoFilter !== undefined && item.ho_so_id !== hoSoFilter) return false
    return true
  })

  const hoSoOptions = useMemo(() => {
    const seen = new Set<string>()
    return (data?.items ?? [])
      .filter(item => { if (seen.has(item.ho_so_id)) return false; seen.add(item.ho_so_id); return true })
      .map(item => ({ value: item.ho_so_id, label: `${item.ho_so_code} — ${item.ho_so_name}` }))
  }, [data?.items])

  const columns: ColumnsType<KeHoachItem> = [
    {
      title: 'STT',
      key: 'stt',
      width: 55,
      align: 'center',
      render: (_: unknown, __: KeHoachItem, index: number) => index + 1,
    },
    {
      title: 'Hồ sơ',
      key: 'ho_so',
      width: 200,
      render: (_: unknown, record: KeHoachItem) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 12, color: '#9B1B30' }}>{record.ho_so_code}</div>
          <div style={{ fontSize: 11, color: '#777' }}>{record.ho_so_name}</div>
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
      title: 'Loại',
      key: 'loai',
      width: 110,
      render: (_: unknown, record: KeHoachItem) => (
        <Tag color={record.loai === 'phat_sinh' ? 'orange' : 'blue'}>
          {record.loai === 'phat_sinh' ? 'Phát sinh' : 'Quy trình'}
        </Tag>
      ),
    },
    {
      title: 'Ngày dự kiến',
      key: 'ngay_du_kien',
      width: 130,
      render: (_: unknown, record: KeHoachItem) =>
        record.ngay_du_kien ? formatDate(record.ngay_du_kien) : <span style={{ color: '#ccc' }}>—</span>,
    },
    {
      title: 'Trạng thái',
      key: 'trang_thai',
      width: 145,
      render: (_: unknown, record: KeHoachItem) => (
        <Tag color={record.da_hoan_thanh ? 'green' : 'default'}>
          {record.da_hoan_thanh ? 'Hoàn thành' : 'Đang thực hiện'}
        </Tag>
      ),
    },
    {
      title: 'Ghi chú',
      dataIndex: 'ghi_chu',
      key: 'ghi_chu',
      ellipsis: true,
      render: (v: string | null) => v ?? <span style={{ color: '#ccc' }}>—</span>,
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ color: '#9B1B30', margin: 0 }}>
          Kế hoạch tháng
          {data ? (
            <span style={{ fontSize: 14, fontWeight: 400, color: '#555', marginLeft: 8 }}>
              ({filteredItems.length !== data.total_items ? `${filteredItems.length}/` : ''}{data.total_items} công việc)
            </span>
          ) : null}
        </Title>
        <Space>
          <DatePicker
            picker="month"
            value={month}
            onChange={(v) => { if (v) { setMonth(v); setLoaiFilter(undefined); setTrangThaiFilter(undefined); setHoSoFilter(undefined) } }}
            format="MM/YYYY"
            allowClear={false}
          />
          <Select
            style={{ width: 220 }}
            placeholder="Tất cả hồ sơ"
            allowClear
            value={hoSoFilter}
            onChange={(v) => setHoSoFilter(v)}
            options={hoSoOptions}
            showSearch
            optionFilterProp="label"
          />
          <Select
            style={{ width: 160 }}
            placeholder="Tất cả loại"
            allowClear
            value={loaiFilter}
            onChange={(v) => setLoaiFilter(v)}
            options={[
              { value: 'quy_trinh', label: 'Quy trình' },
              { value: 'phat_sinh', label: 'Phát sinh' },
            ]}
          />
          <Select
            style={{ width: 160 }}
            placeholder="Tất cả trạng thái"
            allowClear
            value={trangThaiFilter}
            onChange={(v) => setTrangThaiFilter(v)}
            options={[
              { value: true, label: 'Hoàn thành' },
              { value: false, label: 'Đang thực hiện' },
            ]}
          />
          <Button
            icon={<DownloadOutlined />}
            loading={exporting}
            onClick={handleExport}
            disabled={!data?.total_items}
          >
            Xuất Excel
          </Button>
        </Space>
      </div>

      <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #F0E8E8' }}>
        {isLoading ? (
          <div style={{ padding: 64, textAlign: 'center' }}>
            <Spin />
          </div>
        ) : isError ? (
          <div style={{ padding: 32 }}>
            <Alert
              type="error"
              message="Không tải được kế hoạch tháng"
              description="Vui lòng thử lại."
              showIcon
              action={<Button size="small" onClick={() => refetch()}>Thử lại</Button>}
            />
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={{ padding: 64 }}>
            <Empty description={`Không có kế hoạch nào trong tháng ${thang}/${nam}`} />
          </div>
        ) : (
          <Table<KeHoachItem>
            columns={columns}
            dataSource={filteredItems}
            rowKey={(r) => `${r.ke_hoach_id}-${r.ten_cong_viec}`}
            pagination={{
              pageSize: 20,
              showSizeChanger: false,
              showTotal: (total) => `Tổng ${total} công việc`,
            }}
            size="small"
            scroll={{ x: 900 }}
          />
        )}
      </div>
    </div>
  )
}

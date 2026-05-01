'use client'
import {
  Alert, Button, DatePicker, Empty, Input, Popconfirm, Space, Spin, Switch, Table, Tag, message,
} from 'antd'
import { DownloadOutlined, FilePdfOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useRef } from 'react'
import dayjs, { Dayjs } from 'dayjs'
import type { ColumnsType } from 'antd/es/table'
import api from '@/lib/api'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { formatDate } from '@/utils/format'
import ViecPhatSinhModal from './ViecPhatSinhModal'
import TaskDetail from '@/components/task/TaskDetail'
import type { TaskInstance } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface KeHoachThangItem {
  id: string
  ke_hoach_thang_id: string
  task_instance_id: string | null
  ten_cong_viec: string
  mo_ta: string | null
  ngay_du_kien: string | null
  ghi_chu: string | null
  la_viec_phat_sinh: boolean
  da_hoan_thanh: boolean
  thu_tu: number
}

interface KeHoachThang {
  id: string
  ho_so_id: string
  thang: number
  nam: number
  created_by: string | null
  created_at: string
  da_xuat_bao_cao: boolean
  ngay_xuat: string | null
  ghi_chu: string | null
  items: KeHoachThangItem[]
}

interface Props {
  hoSoId: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function KeHoachThangTab({ hoSoId }: Props) {
  const queryClient = useQueryClient()
  const currentUser = useCurrentUser()
  const canEdit = ['admin', 'cbcq'].includes(currentUser?.role ?? '')

  const [selectedMonth, setSelectedMonth] = useState<Dayjs>(dayjs())
  const [generating, setGenerating] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [viecPhatSinhOpen, setViecPhatSinhOpen] = useState(false)
  const [drawerTask, setDrawerTask] = useState<TaskInstance | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Debounce refs: map from itemId -> timeout handle
  const debounceRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const thang = selectedMonth.month() + 1 // dayjs months are 0-indexed
  const nam = selectedMonth.year()

  const {
    data: keHoachList,
    isLoading,
    refetch,
  } = useQuery<KeHoachThang[]>({
    queryKey: ['ke-hoach', hoSoId, thang, nam],
    queryFn: async () => {
      const res = await api.get(`/ho-so/${hoSoId}/ke-hoach?thang=${thang}&nam=${nam}`)
      return res.data
    },
  })

  const keHoach = keHoachList && keHoachList.length > 0 ? keHoachList[0] : null

  // ─── Generate ──────────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      await api.post(`/ho-so/${hoSoId}/ke-hoach/generate`, { thang, nam })
      message.success(`Đã tạo kế hoạch tháng ${thang}/${nam}`)
      queryClient.invalidateQueries({ queryKey: ['ke-hoach', hoSoId, thang, nam] })
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string }; status?: number } }
      if (e.response?.status === 409) {
        message.warning(`Kế hoạch tháng ${thang}/${nam} đã tồn tại`)
        queryClient.invalidateQueries({ queryKey: ['ke-hoach', hoSoId, thang, nam] })
      } else {
        message.error(e.response?.data?.detail || 'Tạo kế hoạch thất bại')
      }
    } finally {
      setGenerating(false)
    }
  }

  // ─── Inline patch (debounced) ──────────────────────────────────────────────

  const patchItem = (itemId: string, payload: { ngay_du_kien?: string | null; ghi_chu?: string | null; da_hoan_thanh?: boolean }) => {
    if (!keHoach) return
    clearTimeout(debounceRefs.current[itemId])
    debounceRefs.current[itemId] = setTimeout(async () => {
      try {
        await api.patch(`/ho-so/${hoSoId}/ke-hoach/${keHoach.id}/items/${itemId}`, payload)
        queryClient.invalidateQueries({ queryKey: ['ke-hoach', hoSoId, thang, nam] })
      } catch {
        message.error('Cập nhật thất bại')
      }
    }, 300)
  }

  // ─── Delete item ───────────────────────────────────────────────────────────

  const handleDeleteItem = async (itemId: string) => {
    if (!keHoach) return
    setDeletingId(itemId)
    try {
      await api.delete(`/ho-so/${hoSoId}/ke-hoach/${keHoach.id}/items/${itemId}`)
      message.success('Đã xóa việc phát sinh')
      queryClient.invalidateQueries({ queryKey: ['ke-hoach', hoSoId, thang, nam] })
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      message.error(e.response?.data?.detail || 'Xóa thất bại')
    } finally {
      setDeletingId(null)
    }
  }

  // ─── Export PDF ───────────────────────────────────────────────────────────

  const handleExportPdf = async () => {
    if (!keHoach) return
    setPdfLoading(true)
    try {
      const response = await api.get(
        `/ho-so/${hoSoId}/ke-hoach/${keHoach.id}/export/pdf`,
        { responseType: 'blob' },
      )
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `ke-hoach-${String(thang).padStart(2, '0')}-${nam}.pdf`
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      message.error('Xuất PDF thất bại')
    } finally {
      setPdfLoading(false)
    }
  }

  // ─── Export Excel ──────────────────────────────────────────────────────────

  const handleExport = async () => {
    if (!keHoach) return
    setExporting(true)
    try {
      const token = localStorage.getItem('opc_token')
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/ho-so/${hoSoId}/ke-hoach/${keHoach.id}/export`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ke-hoach-thang-${thang}-${nam}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      // Invalidate to refresh da_xuat_bao_cao and trigger banner
      queryClient.invalidateQueries({ queryKey: ['ke-hoach', hoSoId, thang, nam] })
    } catch {
      message.error('Xuất Excel thất bại')
    } finally {
      setExporting(false)
    }
  }

  // ─── Table columns ─────────────────────────────────────────────────────────

  const columns: ColumnsType<KeHoachThangItem> = [
    {
      title: 'STT',
      key: 'stt',
      width: 60,
      align: 'center',
      render: (_: unknown, __: KeHoachThangItem, index: number) => index + 1,
    },
    {
      title: 'Tên công việc',
      dataIndex: 'ten_cong_viec',
      key: 'ten_cong_viec',
      ellipsis: true,
      render: (text: string, record: KeHoachThangItem) =>
        !record.la_viec_phat_sinh && record.task_instance_id ? (
          <a
            onClick={async () => {
              try {
                const res = await api.get(`/ho-so/${hoSoId}/tasks/${record.task_instance_id}`)
                setDrawerTask(res.data)
                setDrawerOpen(true)
              } catch {
                message.error('Không tải được thông tin công việc')
              }
            }}
          >
            {text}
          </a>
        ) : text,
    },
    {
      title: 'Loại',
      key: 'loai',
      width: 120,
      render: (_: unknown, record: KeHoachThangItem) =>
        record.la_viec_phat_sinh ? (
          <Tag color="orange">Phát sinh</Tag>
        ) : (
          <Tag color="blue">Quy trình</Tag>
        ),
    },
    {
      title: 'Trạng thái',
      key: 'trang_thai',
      width: 140,
      render: (_: unknown, record: KeHoachThangItem) =>
        record.la_viec_phat_sinh ? (
          <Switch
            size="small"
            checked={record.da_hoan_thanh}
            checkedChildren="Hoàn thành"
            unCheckedChildren="Đang thực hiện"
            disabled={!canEdit}
            onChange={(checked) => patchItem(record.id, { da_hoan_thanh: checked })}
          />
        ) : null,
    },
    {
      title: 'Ngày dự kiến',
      key: 'ngay_du_kien',
      width: 160,
      render: (_: unknown, record: KeHoachThangItem) => (
        <DatePicker
          size="small"
          style={{ width: '100%' }}
          format="DD/MM/YYYY"
          value={record.ngay_du_kien ? dayjs(record.ngay_du_kien) : null}
          disabled={!canEdit}
          onChange={(date) => {
            patchItem(record.id, {
              ngay_du_kien: date ? date.format('YYYY-MM-DD') : null,
            })
          }}
        />
      ),
    },
    {
      title: 'Ghi chú',
      key: 'ghi_chu',
      width: 200,
      render: (_: unknown, record: KeHoachThangItem) => (
        <Input
          size="small"
          defaultValue={record.ghi_chu ?? ''}
          disabled={!canEdit}
          onBlur={(e) => {
            const newVal = e.target.value
            if (newVal !== (record.ghi_chu ?? '')) {
              patchItem(record.id, { ghi_chu: newVal || null })
            }
          }}
        />
      ),
    },
    ...(canEdit
      ? [
          {
            title: 'Thao tác',
            key: 'action',
            width: 90,
            align: 'center' as const,
            render: (_: unknown, record: KeHoachThangItem) =>
              record.la_viec_phat_sinh ? (
                <Popconfirm
                  title="Xóa việc phát sinh này?"
                  okText="Xóa"
                  cancelText="Hủy"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => handleDeleteItem(record.id)}
                >
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    loading={deletingId === record.id}
                  />
                </Popconfirm>
              ) : null,
          },
        ]
      : []),
  ]

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Top bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <DatePicker.MonthPicker
          value={selectedMonth}
          onChange={(d) => { if (d) setSelectedMonth(d) }}
          format="MM/YYYY"
          allowClear={false}
        />
        <Space>
          {canEdit && !keHoach && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              loading={generating}
              onClick={handleGenerate}
            >
              Tạo kế hoạch tháng
            </Button>
          )}
          {canEdit && keHoach && (
            <Button
              icon={<PlusOutlined />}
              onClick={() => setViecPhatSinhOpen(true)}
            >
              Thêm việc phát sinh
            </Button>
          )}
          {keHoach && (
            <Button
              icon={<DownloadOutlined />}
              loading={exporting}
              onClick={handleExport}
            >
              Xuất Excel
            </Button>
          )}
          {keHoach && (
            <Button
              icon={<FilePdfOutlined />}
              loading={pdfLoading}
              onClick={handleExportPdf}
            >
              Xuất PDF
            </Button>
          )}
        </Space>
      </div>

      {/* Content */}
      {isLoading ? (
        <Spin style={{ display: 'block', margin: '40px auto' }} />
      ) : !keHoach ? (
        <Empty description={`Chưa có kế hoạch tháng ${thang}/${nam}`}>
          {canEdit && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              loading={generating}
              onClick={handleGenerate}
            >
              Tạo kế hoạch tháng
            </Button>
          )}
        </Empty>
      ) : (
        <div>
          {/* Banner cảnh báo KH-03 */}
          {keHoach.da_xuat_bao_cao && (
            <Alert
              type="warning"
              message={`Báo cáo tháng ${thang}/${nam} đã xuất ngày ${formatDate(keHoach.ngay_xuat)}. Bạn vẫn có thể chỉnh sửa.`}
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          <div style={{ background: 'white', borderRadius: 8 }}>
            <Table
              columns={columns}
              dataSource={keHoach.items}
              rowKey="id"
              pagination={false}
              size="small"
              scroll={{ x: 700 }}
            />
          </div>
        </div>
      )}

      {/* Task detail drawer */}
      <TaskDetail
        task={drawerTask}
        hoSoId={hoSoId}
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setDrawerTask(null) }}
      />

      {/* Việc phát sinh modal */}
      {keHoach && (
        <ViecPhatSinhModal
          open={viecPhatSinhOpen}
          onClose={() => setViecPhatSinhOpen(false)}
          hoSoId={hoSoId}
          khId={keHoach.id}
          thang={thang}
          nam={nam}
          onSuccess={() => {
            setViecPhatSinhOpen(false)
            queryClient.invalidateQueries({ queryKey: ['ke-hoach', hoSoId, thang, nam] })
          }}
        />
      )}
    </div>
  )
}

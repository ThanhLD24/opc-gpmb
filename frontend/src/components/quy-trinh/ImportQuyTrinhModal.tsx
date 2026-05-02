'use client'
import { Modal, Upload, Button, Table, Tag, notification, Spin, Alert } from 'antd'
import { UploadOutlined, CheckCircleOutlined, DownloadOutlined } from '@ant-design/icons'
import { useState } from 'react'
import type { RcFile } from 'antd/es/upload'
import type { ColumnsType } from 'antd/es/table'
import api from '@/lib/api'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

interface PreviewRow {
  stt: number
  code: string | null
  name: string
  parent_code: string | null
  status: 'ok' | 'error'
  detail: string | null
}

interface PreviewResult {
  rows: PreviewRow[]
  error_count: number
  ok_count: number
}

export default function ImportQuyTrinhModal({ open, onClose, onSuccess }: Props) {
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [lastFile, setLastFile] = useState<RcFile | null>(null)

  const handleUpload = async (file: RcFile) => {
    setLoading(true)
    setLastFile(file)
    setPreview(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await api.post(
        '/workflow/import-excel?mode=preview',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      setPreview(res.data)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      notification.error({ message: e.response?.data?.detail || 'Không thể đọc file' })
    } finally {
      setLoading(false)
    }
    return false
  }

  const handleConfirm = async () => {
    if (!lastFile) return
    setConfirming(true)
    try {
      const formData = new FormData()
      formData.append('file', lastFile)
      const res = await api.post(
        '/workflow/import-excel?mode=confirm',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      const data = res.data as { imported?: number; skipped?: number }
      notification.success({
        message: `Import thành công ${data.imported ?? preview?.ok_count ?? 0} bước` +
          (data.skipped ? `, bỏ qua ${data.skipped} lỗi` : ''),
      })
      setPreview(null)
      setLastFile(null)
      onSuccess()
      onClose()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      notification.error({ message: e.response?.data?.detail || 'Import thất bại' })
    } finally {
      setConfirming(false)
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      const res = await api.get('/workflow/import-template', { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = 'mau-import-quy-trinh.xlsx'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      notification.error({ message: 'Không tải được mẫu' })
    }
  }

  const handleClose = () => {
    setPreview(null)
    setLastFile(null)
    onClose()
  }

  const columns: ColumnsType<PreviewRow> = [
    { title: 'STT', dataIndex: 'stt', key: 'stt', width: 60, align: 'center' },
    { title: 'Mã bước', dataIndex: 'code', key: 'code', width: 110, render: (v: string | null) => v || '—' },
    { title: 'Tên bước', dataIndex: 'name', key: 'name', ellipsis: true },
    { title: 'Parent code', dataIndex: 'parent_code', key: 'parent_code', width: 120, render: (v: string | null) => v || '—' },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (s: 'ok' | 'error') =>
        s === 'ok'
          ? <Tag color="success">Hợp lệ</Tag>
          : <Tag color="error">Lỗi</Tag>,
    },
    {
      title: 'Chi tiết lỗi',
      dataIndex: 'detail',
      key: 'detail',
      render: (v: string | null) => v ? <span style={{ color: '#cf1322', fontSize: 12 }}>{v}</span> : null,
    },
  ]

  const hasErrors = (preview?.error_count ?? 0) > 0
  const okCount = preview?.ok_count ?? 0

  return (
    <Modal
      title="Import quy trình từ Excel"
      open={open}
      onCancel={handleClose}
      footer={null}
      width={820}
    >
      <div style={{ marginBottom: 12 }}>
        <Button icon={<DownloadOutlined />} size="small" onClick={handleDownloadTemplate}>
          Tải xuống mẫu Excel
        </Button>
      </div>

      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Upload
          accept=".xlsx,.xls"
          showUploadList={false}
          beforeUpload={handleUpload}
          disabled={loading || confirming}
        >
          <Button icon={<UploadOutlined />} loading={loading}>
            Chọn file Excel (.xlsx)
          </Button>
        </Upload>
        {lastFile && !loading && (
          <span style={{ fontSize: 13, color: '#6B6B6B' }}>{lastFile.name}</span>
        )}
      </div>

      {loading && <Spin tip="Đang phân tích file..." style={{ display: 'block', margin: '40px auto' }} />}

      {preview && !loading && (
        <div>
          {hasErrors && (
            <Alert
              type="warning"
              message={`Có ${preview.error_count} dòng lỗi. Chỉ ${okCount} dòng hợp lệ sẽ được import.`}
              style={{ marginBottom: 12 }}
            />
          )}

          <Table
            columns={columns}
            dataSource={preview.rows}
            rowKey="stt"
            size="small"
            pagination={false}
            scroll={{ y: 360 }}
            bordered
            onRow={(record) => ({
              style: record.status === 'error' ? { background: '#FFF0F0' } : {},
            })}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <Button onClick={handleClose}>Hủy</Button>
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={handleConfirm}
              loading={confirming}
              disabled={okCount === 0}
            >
              Xác nhận Import ({okCount} bước hợp lệ)
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

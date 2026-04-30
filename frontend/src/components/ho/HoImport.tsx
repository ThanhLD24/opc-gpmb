'use client'
import {
  Drawer, Upload, Button, Table, Typography, notification, Alert, Spin,
} from 'antd'
import { UploadOutlined, CheckCircleOutlined, DownloadOutlined } from '@ant-design/icons'
import { useState } from 'react'
import type { RcFile } from 'antd/es/upload'
import type { ColumnsType } from 'antd/es/table'
import api from '@/lib/api'

interface Props {
  hoSoId: string
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

interface ImportRow {
  row_number: number
  ma_ho: string
  ten_chu_ho: string
  loai_dat: string | null
  dia_chi: string | null
  thua: string | null
  dien_tich: number | null
  error?: string
}

interface PreviewResult {
  valid: ImportRow[]
  errors: ImportRow[]
}

export default function HoImport({ hoSoId, open, onClose, onSuccess }: Props) {
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [lastFile, setLastFile] = useState<RcFile | null>(null)

  const handleUpload = async (file: RcFile) => {
    setLoading(true)
    setLastFile(file)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await api.post(
        `/ho-so/${hoSoId}/ho/import?confirm=false`,
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
      await api.post(
        `/ho-so/${hoSoId}/ho/import?confirm=true`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      notification.success({ message: `Import thành công ${preview?.valid.length || 0} hộ` })
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
      const res = await api.get(`/ho-so/${hoSoId}/ho/import/template`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'mau-import-ho.xlsx')
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch {
      notification.error({ message: 'Tải mẫu thất bại' })
    }
  }

  const handleClose = () => {
    setPreview(null)
    setLastFile(null)
    onClose()
  }

  const baseColumns: ColumnsType<ImportRow> = [
    { title: 'STT', dataIndex: 'row_number', key: 'row_number', width: 60, align: 'center' },
    { title: 'Mã hộ', dataIndex: 'ma_ho', key: 'ma_ho', width: 110 },
    { title: 'Tên chủ hộ', dataIndex: 'ten_chu_ho', key: 'ten_chu_ho' },
    { title: 'Loại đất', dataIndex: 'loai_dat', key: 'loai_dat', width: 100, render: (v: string | null) => v || '—' },
    { title: 'Địa chỉ', dataIndex: 'dia_chi', key: 'dia_chi', ellipsis: true, render: (v: string | null) => v || '—' },
    { title: 'Thửa', dataIndex: 'thua', key: 'thua', width: 70, render: (v: string | null) => v || '—' },
    { title: 'Diện tích', dataIndex: 'dien_tich', key: 'dien_tich', width: 90, align: 'right', render: (v: number | null) => v != null ? v.toLocaleString('vi-VN') : '—' },
  ]

  const errorColumns: ColumnsType<ImportRow> = [
    ...baseColumns,
    {
      title: 'Lý do lỗi',
      dataIndex: 'error',
      key: 'error',
      render: (v: string) => <span style={{ color: '#ff4d4f' }}>{v}</span>,
    },
  ]

  return (
    <Drawer
      title="Import hộ từ Excel"
      open={open}
      onClose={handleClose}
      width={820}
      extra={
        <Button icon={<DownloadOutlined />} size="small" onClick={handleDownloadTemplate}>
          Tải mẫu
        </Button>
      }
    >
      <div style={{ marginBottom: 20 }}>
        <Upload
          accept=".xlsx,.xls"
          showUploadList={false}
          beforeUpload={handleUpload}
          disabled={loading}
        >
          <Button icon={<UploadOutlined />} loading={loading}>
            Chọn file Excel (.xlsx)
          </Button>
        </Upload>
        {lastFile && !loading && (
          <span style={{ marginLeft: 12, color: '#666', fontSize: 13 }}>
            {lastFile.name}
          </span>
        )}
      </div>

      {loading && <Spin tip="Đang phân tích file..." style={{ display: 'block', margin: '40px auto' }} />}

      {preview && !loading && (
        <div>
          {preview.errors.length > 0 && (
            <Alert
              type="warning"
              message={`Có ${preview.errors.length} dòng lỗi sẽ không được import`}
              style={{ marginBottom: 16 }}
            />
          )}

          {preview.valid.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <Typography.Title level={5} style={{ margin: '0 0 8px' }}>
                <CheckCircleOutlined style={{ color: '#52c41a' }} /> Hợp lệ ({preview.valid.length} hộ)
              </Typography.Title>
              <Table
                columns={baseColumns}
                dataSource={preview.valid}
                rowKey="row_number"
                size="small"
                pagination={false}
                scroll={{ y: 200 }}
                bordered
              />
            </div>
          )}

          {preview.errors.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <Typography.Title level={5} style={{ margin: '0 0 8px', color: '#ff4d4f' }}>
                Lỗi ({preview.errors.length} dòng)
              </Typography.Title>
              <Table
                columns={errorColumns}
                dataSource={preview.errors}
                rowKey="row_number"
                size="small"
                pagination={false}
                scroll={{ y: 200 }}
                bordered
                rowClassName={() => 'import-error-row'}
                onRow={() => ({ style: { background: '#fff2f0' } })}
              />
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={handleClose}>Hủy</Button>
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={handleConfirm}
              loading={confirming}
              disabled={preview.valid.length === 0}
            >
              Xác nhận import {preview.valid.length} hộ hợp lệ
            </Button>
          </div>
        </div>
      )}
    </Drawer>
  )
}

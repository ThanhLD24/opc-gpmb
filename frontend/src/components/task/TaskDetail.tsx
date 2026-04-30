'use client'
import {
  Drawer, Form, Input, Select, Switch, Button, Upload, DatePicker,
  InputNumber, Typography, Tag, notification, Space, Divider,
} from 'antd'
import { UploadOutlined, DownloadOutlined } from '@ant-design/icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import type { UploadFile } from 'antd/es/upload/interface'
import type { RcFile } from 'antd/es/upload'
import api from '@/lib/api'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { TaskInstance } from '@/types'
import { TASK_STATUS_LABELS, LOAI_VB_OPTIONS } from '@/utils/constants'
import { formatDate } from '@/utils/format'
import dayjs from 'dayjs'

interface Props {
  task: TaskInstance | null
  hoSoId: string
  open: boolean
  onClose: () => void
}

export default function TaskDetail({ task, hoSoId, open, onClose }: Props) {
  const queryClient = useQueryClient()
  const currentUser = useCurrentUser()
  const [form] = Form.useForm()

  const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'cbcq'
  const isLeaf = task?.is_leaf || false

  useEffect(() => {
    if (task) {
      form.setFieldsValue({
        status: task.status === 'hoan_thanh',
        so_vb: task.so_vb,
        ngay_vb: task.ngay_vb ? dayjs(task.ngay_vb) : null,
        loai_vb: task.loai_vb,
        gia_tri_trinh: task.gia_tri_trinh,
        gia_tri_duyet: task.gia_tri_duyet,
        ghi_chu: task.ghi_chu,
      })
    }
  }, [task, form])

  const statusMutation = useMutation({
    mutationFn: async (checked: boolean) => {
      const res = await api.patch(`/ho-so/${hoSoId}/tasks/${task!.id}/status`, {
        status: checked ? 'hoan_thanh' : 'dang_thuc_hien',
      })
      return res.data
    },
    onSuccess: () => {
      notification.success({ message: 'Cập nhật trạng thái thành công' })
      queryClient.invalidateQueries({ queryKey: ['tasks', hoSoId] })
    },
    onError: () => notification.error({ message: 'Cập nhật thất bại' }),
  })

  const fieldsMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const payload = {
        so_vb: values.so_vb || null,
        ngay_vb: values.ngay_vb ? dayjs(values.ngay_vb as string).format('YYYY-MM-DD') : null,
        loai_vb: values.loai_vb || null,
        gia_tri_trinh: values.gia_tri_trinh || null,
        gia_tri_duyet: values.gia_tri_duyet || null,
        ghi_chu: values.ghi_chu || null,
      }
      const res = await api.patch(`/ho-so/${hoSoId}/tasks/${task!.id}/fields`, payload)
      return res.data
    },
    onSuccess: () => {
      notification.success({ message: 'Lưu thành công' })
      queryClient.invalidateQueries({ queryKey: ['tasks', hoSoId] })
    },
    onError: () => notification.error({ message: 'Lưu thất bại' }),
  })

  const uploadMutation = useMutation({
    mutationFn: async (file: RcFile) => {
      const formData = new FormData()
      formData.append('file', file)
      const res = await api.post(`/ho-so/${hoSoId}/tasks/${task!.id}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return res.data
    },
    onSuccess: () => {
      notification.success({ message: 'Upload file thành công' })
      queryClient.invalidateQueries({ queryKey: ['tasks', hoSoId] })
    },
    onError: () => notification.error({ message: 'Upload thất bại' }),
  })

  if (!task) return null

  const hasAnyField = task.field_so_vb || task.field_ngay_vb || task.field_loai_vb ||
    task.field_gia_tri_trinh || task.field_gia_tri_duyet || task.field_ghi_chu

  return (
    <Drawer
      title={
        <div>
          <div style={{ fontWeight: 600 }}>{task.code ? `[${task.code}] ` : ''}{task.name}</div>
          {task.ho && (
            <div style={{ fontSize: 12, fontWeight: 400, color: '#666' }}>
              Hộ: {task.ho.ma_ho} — {task.ho.ten_chu_ho}
            </div>
          )}
        </div>
      }
      open={open}
      onClose={onClose}
      width={480}
      footer={
        canEdit && hasAnyField ? (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={onClose}>Đóng</Button>
            <Button
              type="primary"
              onClick={() => {
                form.validateFields().then(values => fieldsMutation.mutate(values))
              }}
              loading={fieldsMutation.isPending}
            >
              Lưu
            </Button>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={onClose}>Đóng</Button>
          </div>
        )
      }
    >
      {/* Status */}
      {isLeaf && canEdit && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <span style={{ fontWeight: 500 }}>Trạng thái:</span>
            <Switch
              checked={task.status === 'hoan_thanh'}
              onChange={(checked) => statusMutation.mutate(checked)}
              checkedChildren="Hoàn thành"
              unCheckedChildren="Đang thực hiện"
              loading={statusMutation.isPending}
            />
          </div>
          <Divider />
        </>
      )}
      {!canEdit && (
        <div style={{ marginBottom: 16 }}>
          <span style={{ fontWeight: 500 }}>Trạng thái: </span>
          <Tag color={task.status === 'hoan_thanh' ? 'success' : 'processing'}>
            {TASK_STATUS_LABELS[task.status]}
          </Tag>
          {task.completed_at && (
            <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
              Hoàn thành: {formatDate(task.completed_at)}
            </div>
          )}
        </div>
      )}

      {/* Progress for non-leaf */}
      {!isLeaf && (
        <div style={{ marginBottom: 16 }}>
          <span style={{ fontWeight: 500 }}>Tiến độ: </span>
          {task.completed_count}/{task.total_count} bước hoàn thành
        </div>
      )}

      {/* Custom fields */}
      {hasAnyField && (
        <Form form={form} layout="vertical">
          {task.field_so_vb && (
            <Form.Item name="so_vb" label="Số văn bản">
              <Input disabled={!canEdit} placeholder="Nhập số văn bản" />
            </Form.Item>
          )}
          {task.field_ngay_vb && (
            <Form.Item name="ngay_vb" label="Ngày văn bản">
              <DatePicker style={{ width: '100%' }} disabled={!canEdit} format="DD/MM/YYYY" />
            </Form.Item>
          )}
          {task.field_loai_vb && (
            <Form.Item name="loai_vb" label="Loại văn bản">
              <Select disabled={!canEdit} options={LOAI_VB_OPTIONS} placeholder="Chọn loại văn bản" allowClear />
            </Form.Item>
          )}
          {task.field_gia_tri_trinh && (
            <Form.Item name="gia_tri_trinh" label="Giá trị trình (VND)">
              <InputNumber
                style={{ width: '100%' }}
                disabled={!canEdit}
                formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                parser={(v) => Number(v!.replace(/\./g, '')) as 0}
                min={0}
              />
            </Form.Item>
          )}
          {task.field_gia_tri_duyet && (
            <Form.Item name="gia_tri_duyet" label="Giá trị duyệt (VND)">
              <InputNumber
                style={{ width: '100%' }}
                disabled={!canEdit}
                formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                parser={(v) => Number(v!.replace(/\./g, '')) as 0}
                min={0}
              />
            </Form.Item>
          )}
          {task.field_ghi_chu && (
            <Form.Item name="ghi_chu" label="Ghi chú">
              <Input.TextArea rows={3} disabled={!canEdit} />
            </Form.Item>
          )}
        </Form>
      )}

      {/* File scan */}
      {task.require_scan && (
        <div style={{ marginTop: hasAnyField ? 0 : 8 }}>
          <Divider />
          <div style={{ fontWeight: 500, marginBottom: 8 }}>File scan</div>
          {task.file_scan_url ? (
            <Space>
              <a href={task.file_scan_url} target="_blank" rel="noreferrer">
                <Button icon={<DownloadOutlined />} size="small">Tải xuống</Button>
              </a>
              {canEdit && (
                <Upload
                  showUploadList={false}
                  beforeUpload={(file) => {
                    uploadMutation.mutate(file)
                    return false
                  }}
                >
                  <Button icon={<UploadOutlined />} size="small" loading={uploadMutation.isPending}>
                    Thay thế
                  </Button>
                </Upload>
              )}
            </Space>
          ) : canEdit ? (
            <Upload
              showUploadList={false}
              beforeUpload={(file) => {
                uploadMutation.mutate(file)
                return false
              }}
            >
              <Button icon={<UploadOutlined />} loading={uploadMutation.isPending}>
                Upload file scan
              </Button>
            </Upload>
          ) : (
            <span style={{ color: '#999' }}>Chưa có file scan</span>
          )}
        </div>
      )}
    </Drawer>
  )
}

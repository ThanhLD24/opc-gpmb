'use client'
import { Button, DatePicker, Form, Input, Modal, message } from 'antd'
import { useMutation } from '@tanstack/react-query'
import dayjs, { Dayjs } from 'dayjs'
import api from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onClose: () => void
  hoSoId: string
  khId: string
  thang: number
  nam: number
  onSuccess: () => void
}

interface ViecPhatSinhFormValues {
  ten_cong_viec: string
  mo_ta?: string
  ngay_du_kien?: Dayjs
  ghi_chu?: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ViecPhatSinhModal({ open, onClose, hoSoId, khId, onSuccess }: Props) {
  const [form] = Form.useForm<ViecPhatSinhFormValues>()

  const createMutation = useMutation({
    mutationFn: async (values: ViecPhatSinhFormValues) => {
      const payload = {
        ten_cong_viec: values.ten_cong_viec,
        mo_ta: values.mo_ta ?? null,
        ngay_du_kien: values.ngay_du_kien ? dayjs(values.ngay_du_kien).format('YYYY-MM-DD') : null,
        ghi_chu: values.ghi_chu ?? null,
      }
      const res = await api.post(`/ho-so/${hoSoId}/ke-hoach/${khId}/items`, payload)
      return res.data
    },
    onSuccess: () => {
      message.success('Đã thêm việc phát sinh')
      form.resetFields()
      onSuccess()
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { detail?: string } } }
      message.error(e.response?.data?.detail || 'Thêm việc phát sinh thất bại')
    },
  })

  const handleClose = () => {
    form.resetFields()
    onClose()
  }

  return (
    <Modal
      title="Thêm việc phát sinh"
      open={open}
      onCancel={handleClose}
      footer={null}
      width={520}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={(v) => createMutation.mutate(v)}
      >
        <Form.Item
          name="ten_cong_viec"
          label="Tên công việc"
          rules={[{ required: true, message: 'Nhập tên công việc' }]}
        >
          <Input placeholder="Nhập tên công việc" />
        </Form.Item>

        <Form.Item name="mo_ta" label="Mô tả">
          <Input.TextArea rows={3} placeholder="Mô tả (không bắt buộc)" />
        </Form.Item>

        <Form.Item name="ngay_du_kien" label="Ngày dự kiến">
          <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Chọn ngày dự kiến" />
        </Form.Item>

        <Form.Item name="ghi_chu" label="Ghi chú">
          <Input placeholder="Ghi chú (không bắt buộc)" />
        </Form.Item>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={handleClose}>Hủy</Button>
          <Button type="primary" htmlType="submit" loading={createMutation.isPending}>
            Thêm
          </Button>
        </div>
      </Form>
    </Modal>
  )
}

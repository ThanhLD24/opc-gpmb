'use client'
import { Modal, Form, Input, InputNumber, Button, notification } from 'antd'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import api from '@/lib/api'
import { Ho } from '@/types'

interface Props {
  hoSoId: string
  ho: Ho | null
  open: boolean
  onClose: () => void
}

export default function EditHoModal({ hoSoId, ho, open, onClose }: Props) {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (open && ho) {
      form.setFieldsValue({
        ma_ho: ho.ma_ho,
        loai_dat: ho.loai_dat,
        ten_chu_ho: ho.ten_chu_ho,
        dia_chi: ho.dia_chi,
        thua: ho.thua,
        dien_tich: ho.dien_tich,
      })
    }
  }, [open, ho, form])

  const updateMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const res = await api.patch(`/ho-so/${hoSoId}/ho/${ho!.id}`, values)
      return res.data
    },
    onSuccess: () => {
      notification.success({ message: 'Cập nhật hộ thành công' })
      queryClient.invalidateQueries({ queryKey: ['ho', hoSoId] })
      onClose()
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { detail?: string } } }
      notification.error({ message: e.response?.data?.detail || 'Cập nhật thất bại' })
    },
  })

  const handleClose = () => {
    form.resetFields()
    onClose()
  }

  return (
    <Modal
      title="Sửa thông tin hộ"
      open={open}
      onCancel={handleClose}
      footer={null}
      width={520}
    >
      <Form form={form} layout="vertical" onFinish={(values) => updateMutation.mutate(values)}>
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
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <Button onClick={handleClose}>Hủy</Button>
          <Button type="primary" htmlType="submit" loading={updateMutation.isPending}>Lưu thay đổi</Button>
        </div>
      </Form>
    </Modal>
  )
}

'use client'
import {
  Modal, Form, InputNumber, Input, Button, notification,
} from 'antd'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { ChiTra } from '@/types'
import { formatVND } from '@/utils/format'

interface Props {
  hoSoId: string
  chiTra: ChiTra
  open: boolean
  onClose: () => void
}

interface EditChiTraValues {
  so_tien_bt?: number
  so_tien_ht?: number
  so_tien_tdc?: number
  noi_dung?: string
  ghi_chu?: string
}

export default function EditChiTraModal({ hoSoId, chiTra, open, onClose }: Props) {
  const [form] = Form.useForm<EditChiTraValues>()
  const queryClient = useQueryClient()
  const [tong, setTong] = useState(0)

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        so_tien_bt: chiTra.so_tien_bt ?? undefined,
        so_tien_ht: chiTra.so_tien_ht ?? undefined,
        so_tien_tdc: chiTra.so_tien_tdc ?? undefined,
        ghi_chu: chiTra.ghi_chu ?? undefined,
      })
      const bt = chiTra.so_tien_bt ?? 0
      const ht = chiTra.so_tien_ht ?? 0
      const tdc = chiTra.so_tien_tdc ?? 0
      setTong(bt + ht + tdc)
    }
  }, [open, chiTra, form])

  const handleValuesChange = (_changed: Partial<EditChiTraValues>, all: EditChiTraValues) => {
    const bt = Number(all.so_tien_bt ?? 0)
    const ht = Number(all.so_tien_ht ?? 0)
    const tdc = Number(all.so_tien_tdc ?? 0)
    setTong(bt + ht + tdc)
  }

  const editMutation = useMutation({
    mutationFn: async (values: EditChiTraValues) => {
      const res = await api.patch(`/ho-so/${hoSoId}/chi-tra/${chiTra.id}`, values)
      return res.data
    },
    onSuccess: () => {
      notification.success({ message: 'Cập nhật chi trả thành công' })
      queryClient.invalidateQueries({ queryKey: ['chi-tra', hoSoId] })
      handleClose()
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { detail?: string } } }
      notification.error({ message: e.response?.data?.detail || 'Cập nhật thất bại' })
    },
  })

  const handleClose = () => {
    form.resetFields()
    setTong(0)
    onClose()
  }

  return (
    <Modal
      title="Sửa hồ sơ chi trả"
      open={open}
      onCancel={handleClose}
      footer={null}
      width={560}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={(v) => editMutation.mutate(v)}
        onValuesChange={handleValuesChange}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <Form.Item name="so_tien_bt" label="Tiền BT (đ)">
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
              parser={(v) => Number(v!.replace(/\./g, '')) as 0}
            />
          </Form.Item>
          <Form.Item name="so_tien_ht" label="Tiền HT (đ)">
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
              parser={(v) => Number(v!.replace(/\./g, '')) as 0}
            />
          </Form.Item>
          <Form.Item name="so_tien_tdc" label="Tiền TĐC (đ)">
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
              parser={(v) => Number(v!.replace(/\./g, '')) as 0}
            />
          </Form.Item>
        </div>

        <div
          style={{
            background: '#f5f5f5',
            padding: '8px 12px',
            borderRadius: 6,
            marginBottom: 16,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontWeight: 500 }}>Tổng đề nghị (tự tính):</span>
          <span style={{ fontWeight: 700, fontSize: 16, color: '#1677ff' }}>
            {formatVND(tong)}
          </span>
        </div>

        <Form.Item name="ghi_chu" label="Ghi chú">
          <Input.TextArea rows={3} placeholder="Ghi chú thêm" />
        </Form.Item>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={handleClose}>Hủy</Button>
          <Button type="primary" htmlType="submit" loading={editMutation.isPending}>
            Lưu thay đổi
          </Button>
        </div>
      </Form>
    </Modal>
  )
}

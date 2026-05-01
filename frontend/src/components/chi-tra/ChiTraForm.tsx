'use client'
import {
  Modal, Form, Select, InputNumber, Input, Button, notification,
} from 'antd'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import api from '@/lib/api'
import { Ho } from '@/types'
import { formatVND } from '@/utils/format'

interface Props {
  hoSoId: string
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function ChiTraForm({ hoSoId, open, onClose, onSuccess }: Props) {
  const [form] = Form.useForm()
  const [tong, setTong] = useState(0)

  const { data: hoList } = useQuery<Ho[]>({
    queryKey: ['ho-thong-nhat', hoSoId],
    queryFn: async () => {
      const res = await api.get(`/ho-so/${hoSoId}/ho?status=da_thong_nhat&page_size=500`)
      return res.data.items ?? []
    },
    enabled: open,
    staleTime: 0,
  })

  const createMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const res = await api.post(`/ho-so/${hoSoId}/chi-tra`, values)
      return res.data
    },
    onSuccess: () => {
      notification.success({ message: 'Tạo hồ sơ chi trả thành công' })
      form.resetFields()
      setTong(0)
      onSuccess()
      onClose()
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { detail?: string } } }
      notification.error({ message: e.response?.data?.detail || 'Tạo chi trả thất bại' })
    },
  })

  const handleValuesChange = (_changed: Record<string, unknown>, all: Record<string, unknown>) => {
    const bt = Number(all.so_tien_bt || 0)
    const ht = Number(all.so_tien_ht || 0)
    const tdc = Number(all.so_tien_tdc || 0)
    setTong(bt + ht + tdc)
  }

  const handleClose = () => {
    form.resetFields()
    setTong(0)
    onClose()
  }

  return (
    <Modal
      title="Tạo hồ sơ chi trả"
      open={open}
      onCancel={handleClose}
      footer={null}
      width={560}
    >
      <Form form={form} layout="vertical" onFinish={(v) => createMutation.mutate(v)} onValuesChange={handleValuesChange}>
        <Form.Item name="ho_id" label="Hộ" rules={[{ required: true, message: 'Chọn hộ' }]}>
          <Select
            placeholder="Chọn hộ (đã thống nhất phương án)"
            showSearch
            filterOption={(input, option) =>
              String(option?.label || '').toLowerCase().includes(input.toLowerCase())
            }
            options={(hoList || []).map(h => ({
              value: h.id,
              label: `${h.ma_ho} — ${h.ten_chu_ho}`,
            }))}
          />
        </Form.Item>

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

        <div style={{ background: '#f5f5f5', padding: '8px 12px', borderRadius: 6, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 500 }}>Tổng chi trả:</span>
          <span style={{ fontWeight: 700, fontSize: 16, color: '#1677ff' }}>{formatVND(tong)}</span>
        </div>

        <Form.Item name="ghi_chu" label="Ghi chú">
          <Input.TextArea rows={2} placeholder="Ghi chú thêm" />
        </Form.Item>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={handleClose}>Hủy</Button>
          <Button type="primary" htmlType="submit" loading={createMutation.isPending}>
            Tạo hồ sơ chi trả
          </Button>
        </div>
      </Form>
    </Modal>
  )
}

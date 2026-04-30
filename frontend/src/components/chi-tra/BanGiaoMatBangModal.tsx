'use client'
import { Modal, Form, DatePicker, Input, Button, message } from 'antd'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import dayjs, { Dayjs } from 'dayjs'
import api from '@/lib/api'
import { ChiTra } from '@/types'

interface Props {
  hoSoId: string
  chiTra: ChiTra
  open: boolean
  onClose: () => void
}

interface BanGiaoValues {
  ngay_ban_giao: Dayjs
  ghi_chu?: string
}

export default function BanGiaoMatBangModal({ hoSoId, chiTra, open, onClose }: Props) {
  const [form] = Form.useForm<BanGiaoValues>()
  const queryClient = useQueryClient()

  const banGiaoMutation = useMutation({
    mutationFn: async (values: BanGiaoValues) => {
      const payload = {
        ngay_ban_giao: values.ngay_ban_giao.format('YYYY-MM-DD'),
        ghi_chu: values.ghi_chu ?? null,
      }
      const res = await api.post(
        `/ho-so/${hoSoId}/chi-tra/${chiTra.id}/ban-giao`,
        payload,
      )
      return res.data
    },
    onSuccess: () => {
      message.success('Đã bàn giao mặt bằng thành công')
      // Invalidate chi-tra list, ho list, audit log, ho-so detail, dashboard
      queryClient.invalidateQueries({ queryKey: ['chi-tra', hoSoId] })
      queryClient.invalidateQueries({ queryKey: ['ho', hoSoId] })
      queryClient.invalidateQueries({ queryKey: ['ho-so', hoSoId] })
      queryClient.invalidateQueries({ queryKey: ['audit', hoSoId, chiTra.id] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      handleClose()
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { detail?: string } } }
      message.error(e.response?.data?.detail || 'Bàn giao thất bại')
    },
  })

  const handleClose = () => {
    form.resetFields()
    onClose()
  }

  // ADR-S4-02: disable future dates and dates more than 30 days in the past
  const disabledDate = (current: Dayjs) => {
    if (!current) return false
    const today = dayjs().endOf('day')
    const thirtyDaysAgo = dayjs().subtract(30, 'day').startOf('day')
    return current.isAfter(today) || current.isBefore(thirtyDaysAgo)
  }

  return (
    <Modal
      title="Bàn giao mặt bằng"
      open={open}
      onCancel={handleClose}
      footer={null}
      width={520}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ ngay_ban_giao: dayjs() }}
        onFinish={(v) => banGiaoMutation.mutate(v)}
      >
        <Form.Item
          name="ngay_ban_giao"
          label="Ngày bàn giao"
          rules={[{ required: true, message: 'Chọn ngày bàn giao' }]}
        >
          <DatePicker
            style={{ width: '100%' }}
            format="DD/MM/YYYY"
            disabledDate={disabledDate}
            placeholder="Chọn ngày bàn giao"
          />
        </Form.Item>

        <Form.Item name="ghi_chu" label="Ghi chú">
          <Input.TextArea
            rows={3}
            placeholder="VD: Bàn giao mặt bằng tại hiện trường — hộ ký nhận"
          />
        </Form.Item>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={handleClose}>Hủy</Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={banGiaoMutation.isPending}
          >
            Xác nhận bàn giao
          </Button>
        </div>
      </Form>
    </Modal>
  )
}

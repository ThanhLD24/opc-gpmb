'use client'
import { Modal, Form, Input, Select, DatePicker, Button, notification } from 'antd'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import api from '@/lib/api'
import { HoSo, User } from '@/types'

interface Props {
  hoSo: HoSo
  open: boolean
  onClose: () => void
}

export default function EditHoSoModal({ hoSo, open, onClose }: Props) {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const [cbcqList, setCbcqList] = useState<User[]>([])

  useEffect(() => {
    api.get('/auth/users?role=cbcq')
      .then(res => setCbcqList(res.data.items || res.data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        name: hoSo.name,
        dia_chi: hoSo.dia_chi,
        cbcq_id: hoSo.cbcq?.id,
        ngay_bat_dau: hoSo.ngay_bat_dau ? dayjs(hoSo.ngay_bat_dau) : null,
        ngay_ket_thuc: hoSo.ngay_ket_thuc ? dayjs(hoSo.ngay_ket_thuc) : null,
      })
    }
  }, [open, hoSo, form])

  const updateMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const payload = {
        ...values,
        ngay_bat_dau: values.ngay_bat_dau
          ? dayjs(values.ngay_bat_dau as string).format('YYYY-MM-DD')
          : null,
        ngay_ket_thuc: values.ngay_ket_thuc
          ? dayjs(values.ngay_ket_thuc as string).format('YYYY-MM-DD')
          : null,
      }
      const res = await api.patch(`/ho-so/${hoSo.id}`, payload)
      return res.data
    },
    onSuccess: () => {
      notification.success({ message: 'Cập nhật hồ sơ thành công' })
      queryClient.invalidateQueries({ queryKey: ['ho-so', hoSo.id] })
      queryClient.invalidateQueries({ queryKey: ['ho-so'] })
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
      title="Sửa thông tin hồ sơ"
      open={open}
      onCancel={handleClose}
      footer={null}
      width={560}
    >
      <Form form={form} layout="vertical" onFinish={(values) => updateMutation.mutate(values)}>
        <Form.Item name="name" label="Tên công trình" rules={[{ required: true, message: 'Nhập tên công trình' }]}>
          <Input placeholder="Tên công trình / dự án" />
        </Form.Item>
        <Form.Item name="dia_chi" label="Địa chỉ">
          <Input placeholder="Địa chỉ công trình" />
        </Form.Item>
        <Form.Item name="cbcq_id" label="CBCQ phụ trách">
          <Select
            placeholder="Chọn cán bộ chuyên quản"
            allowClear
            options={cbcqList.map(u => ({ value: u.id, label: u.full_name }))}
          />
        </Form.Item>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Form.Item name="ngay_bat_dau" label="Ngày bắt đầu">
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="ngay_ket_thuc" label="Ngày kết thúc">
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="DD/MM/YYYY" />
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

'use client'
import { Button, Form, Input, Modal, message } from 'antd'
import { useState } from 'react'
import api from '@/lib/api'

interface Props {
  open: boolean
  onClose: () => void
}

interface FormValues {
  current_password: string
  new_password: string
  confirm_password: string
}

export default function ChangePasswordModal({ open, onClose }: Props) {
  const [form] = Form.useForm<FormValues>()
  const [loading, setLoading] = useState(false)

  const handleClose = () => {
    form.resetFields()
    onClose()
  }

  const handleFinish = async (values: FormValues) => {
    setLoading(true)
    try {
      await api.patch('/auth/change-password', {
        current_password: values.current_password,
        new_password: values.new_password,
      })
      message.success('Đổi mật khẩu thành công')
      handleClose()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string }; status?: number } }
      if (e.response?.status === 400) {
        form.setFields([
          {
            name: 'current_password',
            errors: [e.response?.data?.detail || 'Mật khẩu hiện tại không đúng'],
          },
        ])
      } else {
        message.error('Đổi mật khẩu thất bại')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      title="Đổi mật khẩu"
      open={open}
      onCancel={handleClose}
      footer={null}
      width={420}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        style={{ marginTop: 16 }}
      >
        <Form.Item
          name="current_password"
          label="Mật khẩu hiện tại"
          rules={[{ required: true, message: 'Vui lòng nhập mật khẩu hiện tại' }]}
        >
          <Input.Password placeholder="Nhập mật khẩu hiện tại" />
        </Form.Item>

        <Form.Item
          name="new_password"
          label="Mật khẩu mới"
          rules={[
            { required: true, message: 'Vui lòng nhập mật khẩu mới' },
            { min: 8, message: 'Mật khẩu mới phải có ít nhất 8 ký tự' },
          ]}
        >
          <Input.Password placeholder="Nhập mật khẩu mới (ít nhất 8 ký tự)" />
        </Form.Item>

        <Form.Item
          name="confirm_password"
          label="Xác nhận mật khẩu mới"
          dependencies={['new_password']}
          rules={[
            { required: true, message: 'Vui lòng xác nhận mật khẩu mới' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('new_password') === value) {
                  return Promise.resolve()
                }
                return Promise.reject(new Error('Mật khẩu xác nhận không khớp'))
              },
            }),
          ]}
        >
          <Input.Password placeholder="Nhập lại mật khẩu mới" />
        </Form.Item>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={handleClose}>Hủy</Button>
          <Button type="primary" htmlType="submit" loading={loading}>
            Đổi mật khẩu
          </Button>
        </div>
      </Form>
    </Modal>
  )
}

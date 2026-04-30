'use client'
import { Form, Input, Button, Alert, Checkbox } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { login } from '@/lib/auth'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true)
    setError(null)
    try {
      await login(values.username, values.password)
      router.replace('/ho-so-gpmb')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setError(e.response?.data?.detail || 'Đăng nhập thất bại')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #9B1B30 0%, #C0392B 50%, #9B1B30 100%)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Decorative circles */}
      <div style={{
        position: 'absolute',
        width: 400,
        height: 400,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.05)',
        top: -100,
        left: -100,
      }} />
      <div style={{
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.05)',
        bottom: -80,
        right: -80,
      }} />

      {/* Login card */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: 12,
        padding: '40px 40px 32px',
        width: 400,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Logo block */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 60,
            height: 60,
            background: '#9B1B30',
            borderRadius: 12,
            marginBottom: 12,
          }}>
            <span style={{ color: 'white', fontWeight: 800, fontSize: 18, letterSpacing: 0.5 }}>AG</span>
          </div>
          <div style={{ fontWeight: 800, fontSize: 22, color: '#9B1B30', letterSpacing: 1, lineHeight: '28px' }}>
            AGRIBANK
          </div>
          <div style={{ fontSize: 14, color: '#1A1A1A', fontWeight: 600, marginTop: 4, lineHeight: '20px' }}>
            Hệ thống GPMB
          </div>
          <div style={{ fontSize: 12, color: '#6B6B6B', marginTop: 4 }}>
            Đăng nhập để tiếp tục sử dụng
          </div>
        </div>

        {error && <Alert message={error} type="error" style={{ marginBottom: 16 }} showIcon />}

        <Form onFinish={onFinish} layout="vertical" requiredMark={false}>
          <Form.Item
            name="username"
            label={<span style={{ fontWeight: 500, color: '#1A1A1A' }}>Tên đăng nhập</span>}
            rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập' }]}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#9B1B30' }} />}
              placeholder="Nhập tên đăng nhập"
              size="large"
              style={{ borderRadius: 6 }}
            />
          </Form.Item>
          <Form.Item
            name="password"
            label={<span style={{ fontWeight: 500, color: '#1A1A1A' }}>Mật khẩu</span>}
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#9B1B30' }} />}
              placeholder="Nhập mật khẩu"
              size="large"
              style={{ borderRadius: 6 }}
            />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Checkbox style={{ fontSize: 13, color: '#6B6B6B' }}>Lưu mật khẩu</Checkbox>
            <a href="#" style={{ fontSize: 13, color: '#9B1B30' }}>Quên mật khẩu?</a>
          </div>

          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            block
            size="large"
            style={{
              background: '#9B1B30',
              borderColor: '#9B1B30',
              borderRadius: 6,
              fontWeight: 600,
              height: 44,
            }}
          >
            Đăng nhập
          </Button>
        </Form>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#6B6B6B' }}>
          © 2025 Agribank — Hệ thống quản lý Giải phóng mặt bằng
        </div>
      </div>
    </div>
  )
}

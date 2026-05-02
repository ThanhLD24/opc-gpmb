'use client'
import { Layout, Menu, Avatar, Badge, Dropdown, Popover } from 'antd'
import {
  FileTextOutlined, ApartmentOutlined, LogoutOutlined, UserOutlined,
  BellOutlined, DashboardOutlined, BarChartOutlined,
  TeamOutlined, CheckSquareOutlined, KeyOutlined, CheckCircleOutlined,
  CalendarOutlined,
} from '@ant-design/icons'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getCurrentUser, logout, isAuthenticated } from '@/lib/auth'
import api from '@/lib/api'
import { User } from '@/types'
import { ROLE_LABELS } from '@/utils/constants'
import ChangePasswordModal from '@/components/ChangePasswordModal'
import NotificationDropdown, { NotifData } from '@/components/NotificationDropdown'

const { Sider, Header, Content } = Layout

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login')
      return
    }
    setUser(getCurrentUser())
  }, [router])

  // Notification polling
  const { data: notifData } = useQuery<NotifData>({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then(r => r.data),
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    staleTime: 30_000,
  })

  // Pending approval count for sidebar badge (gddh + admin only)
  const { data: pendingApprovalData } = useQuery<{ total: number }>({
    queryKey: ['phe-duyet-count'],
    queryFn: () => api.get('/phe-duyet?tab=cho_phe_duyet&page_size=1').then(r => r.data),
    enabled: user?.role === 'gddh' || user?.role === 'admin',
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    staleTime: 30_000,
  })

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: 'Tổng quan',
    },
    {
      key: '/ho-so-gpmb',
      icon: <FileTextOutlined />,
      label: 'Hồ sơ GPMB',
    },
    {
      key: '/ho-dan',
      icon: <TeamOutlined />,
      label: 'Quản lý Hộ dân',
    },
    {
      key: '/cong-viec',
      icon: <CheckSquareOutlined />,
      label: 'Quản lý Công việc',
    },
    ...(user?.role === 'gddh' || user?.role === 'admin' ? [{
      key: '/phe-duyet',
      icon: <CheckCircleOutlined />,
      label: (
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Phê duyệt
          {(pendingApprovalData?.total ?? 0) > 0 && (
            <Badge count={pendingApprovalData!.total} size="small" style={{ marginLeft: 4 }} />
          )}
        </span>
      ),
    }] : []),
    ...(user?.role === 'admin' ? [{
      key: '/quy-trinh',
      icon: <ApartmentOutlined />,
      label: 'Quy trình GPMB',
    }] : []),
    ...(user?.role === 'cbcq' || user?.role === 'admin' ? [{
      key: '/ke-hoach-thang',
      icon: <CalendarOutlined />,
      label: 'Kế hoạch tháng',
    }] : []),
    {
      key: '/bao-cao',
      icon: <BarChartOutlined />,
      label: 'Báo cáo',
    },
  ]

  const handleLogout = () => {
    logout()
    router.replace('/login')
  }

  return (
    <Layout style={{ minHeight: '100vh', background: '#FBF1F1' }}>
      <Sider
        width={240}
        theme="light"
        style={{
          position: 'fixed',
          height: '100vh',
          left: 0,
          top: 0,
          overflow: 'auto',
          background: '#FFFFFF',
          borderRight: '1px solid #F0E8E8',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Logo area */}
        <div style={{
          padding: '20px 16px 16px',
          borderBottom: '1px solid #F0E8E8',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <div style={{
            width: 36,
            height: 36,
            background: '#9B1B30',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 700,
            fontSize: 14,
            flexShrink: 0,
          }}>
            AG
          </div>
          <div>
            <div style={{ color: '#9B1B30', fontWeight: 700, fontSize: 15, lineHeight: '18px' }}>OPC</div>
            <div style={{ color: '#6B6B6B', fontSize: 11, lineHeight: '14px' }}>Hệ thống GPMB</div>
          </div>
        </div>

        {/* Navigation menu */}
        <Menu
          theme="light"
          mode="inline"
          selectedKeys={[pathname || '']}
          items={menuItems}
          onClick={({ key }) => router.push(key)}
          style={{
            marginTop: 8,
            border: 'none',
            paddingBottom: 68,
          }}
        />

        {/* Profile section — pinned to viewport bottom via absolute positioning */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '12px 16px',
          borderTop: '1px solid #F0E8E8',
          background: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <Dropdown
            menu={{
              items: [{
                key: 'change-pwd',
                icon: <KeyOutlined />,
                label: 'Đổi mật khẩu',
              }],
              onClick: ({ key }) => {
                if (key === 'change-pwd') setChangePasswordOpen(true)
              },
            }}
            trigger={['click']}
            placement="topLeft"
          >
            <Avatar
              icon={<UserOutlined />}
              style={{ background: '#9B1B30', flexShrink: 0, cursor: 'pointer' }}
              size={36}
            />
          </Dropdown>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: '#1A1A1A', lineHeight: '18px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.full_name || '—'}
            </div>
            <div style={{ fontSize: 11, color: '#6B6B6B', lineHeight: '15px' }}>
              {user ? ROLE_LABELS[user.role] : ''}
            </div>
          </div>
          <LogoutOutlined
            style={{ color: '#9B1B30', cursor: 'pointer', fontSize: 16 }}
            title="Đăng xuất"
            onClick={handleLogout}
          />
        </div>
      </Sider>

      <Layout style={{ marginLeft: 240, background: '#FBF1F1' }}>
        <Header style={{
          background: '#FFFFFF',
          padding: '0 24px',
          borderBottom: '1px solid #F0E8E8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          gap: 16,
        }}>
          <Popover
            open={notifOpen}
            onOpenChange={setNotifOpen}
            trigger="click"
            placement="bottomRight"
            content={
              <NotificationDropdown
                data={notifData}
              />
            }
            arrow={false}
            styles={{ body: { padding: 0 } }}
          >
            <Badge count={notifData?.unread_count ?? 0} showZero={false}>
              <BellOutlined style={{ fontSize: 20, color: '#6B6B6B', cursor: 'pointer' }} />
            </Badge>
          </Popover>
        </Header>
        <Content style={{ padding: 24, background: '#FBF1F1' }}>
          {children}
        </Content>
      </Layout>

      <ChangePasswordModal
        open={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
      />
    </Layout>
  )
}

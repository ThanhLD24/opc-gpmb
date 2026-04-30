'use client'
import {
  Table, Button, Tag, Space, Modal, Form, Input, Select, DatePicker,
  Typography, notification, Tooltip, Spin, Popconfirm,
} from 'antd'
import { PlusOutlined, EyeOutlined, SearchOutlined, DeleteOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { ColumnsType } from 'antd/es/table'
import api from '@/lib/api'
import { getCurrentUser } from '@/lib/auth'
import { HoSo, User, PaginatedResponse } from '@/types'
import { HO_SO_STATUS_LABELS, HO_SO_STATUS_COLORS } from '@/utils/constants'
import { formatDate } from '@/utils/format'
import dayjs from 'dayjs'

const { Title } = Typography

export default function HoSoListPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm()
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [search, setSearch] = useState<string>('')
  const [searchInput, setSearchInput] = useState<string>('')
  const [cbcqList, setCbcqList] = useState<User[]>([])

  useEffect(() => {
    setCurrentUser(getCurrentUser())
  }, [])

  const { data, isLoading } = useQuery<PaginatedResponse<HoSo>>({
    queryKey: ['ho-so', page, pageSize, statusFilter, search],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(search ? { search } : {}),
      })
      const res = await api.get(`/ho-so?${params}`)
      return res.data
    },
  })

  useEffect(() => {
    api.get('/auth/users?role=cbcq').then(res => setCbcqList(res.data.items || res.data))
      .catch(() => {})
  }, [])

  const createMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const payload = {
        ...values,
        ngay_bat_dau: values.ngay_bat_dau ? dayjs(values.ngay_bat_dau as string).format('YYYY-MM-DD') : null,
        ngay_ket_thuc: values.ngay_ket_thuc ? dayjs(values.ngay_ket_thuc as string).format('YYYY-MM-DD') : null,
      }
      const res = await api.post('/ho-so', payload)
      return res.data
    },
    onSuccess: () => {
      notification.success({ message: 'Tạo hồ sơ thành công' })
      setModalOpen(false)
      form.resetFields()
      queryClient.invalidateQueries({ queryKey: ['ho-so'] })
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { detail?: string } } }
      notification.error({ message: e.response?.data?.detail || 'Tạo hồ sơ thất bại' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/ho-so/${id}`)
    },
    onSuccess: () => {
      notification.success({ message: 'Xóa hồ sơ thành công' })
      queryClient.invalidateQueries({ queryKey: ['ho-so'] })
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { detail?: string } } }
      notification.error({ message: e.response?.data?.detail || 'Xóa hồ sơ thất bại' })
    },
  })

  const columns: ColumnsType<HoSo> = [
    {
      title: 'Mã hồ sơ',
      dataIndex: 'code',
      key: 'code',
      width: 130,
      render: (code: string) => <span style={{ fontWeight: 500 }}>{code}</span>,
    },
    {
      title: 'Tên công trình',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
    },
    {
      title: 'CBCQ',
      key: 'cbcq',
      width: 160,
      render: (_: unknown, record: HoSo) => record.cbcq?.full_name || '—',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status: string) => (
        <Tag color={HO_SO_STATUS_COLORS[status]}>{HO_SO_STATUS_LABELS[status]}</Tag>
      ),
    },
    {
      title: 'Số hộ',
      dataIndex: 'so_ho',
      key: 'so_ho',
      width: 80,
      align: 'center',
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (d: string) => formatDate(d),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 100,
      align: 'center',
      render: (_: unknown, record: HoSo) => (
        <Space size={0}>
          <Tooltip title="Xem chi tiết">
            <Button
              type="link"
              icon={<EyeOutlined />}
              onClick={(e) => { e.stopPropagation(); router.push(`/ho-so-gpmb/${record.id}`) }}
            />
          </Tooltip>
          {currentUser?.role === 'admin' && (
            <Popconfirm
              title="Xóa hồ sơ này?"
              description="Chỉ xóa được hồ sơ ở trạng thái Chuẩn bị. Không thể hoàn tác."
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
              onConfirm={(e) => { e?.stopPropagation(); deleteMutation.mutate(record.id) }}
              onPopupClick={(e) => e.stopPropagation()}
            >
              <Button
                type="link"
                danger
                icon={<DeleteOutlined />}
                loading={deleteMutation.isPending}
                onClick={(e) => e.stopPropagation()}
              />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  const canCreate = currentUser?.role === 'admin' || currentUser?.role === 'cbcq'

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Hồ sơ GPMB</Title>
        {canCreate && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            Thêm mới hồ sơ
          </Button>
        )}
      </div>

      <div style={{ background: 'white', padding: 16, borderRadius: 8, marginBottom: 16, display: 'flex', gap: 12 }}>
        <Select
          style={{ width: 180 }}
          placeholder="Lọc trạng thái"
          allowClear
          value={statusFilter || undefined}
          onChange={(v) => { setStatusFilter(v || ''); setPage(1) }}
          options={Object.entries(HO_SO_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
        />
        <Input
          style={{ width: 280 }}
          placeholder="Tìm kiếm theo tên, mã hồ sơ..."
          prefix={<SearchOutlined />}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onPressEnter={() => { setSearch(searchInput); setPage(1) }}
          allowClear
          onClear={() => { setSearch(''); setSearchInput(''); setPage(1) }}
        />
        <Button onClick={() => { setSearch(searchInput); setPage(1) }}>Tìm kiếm</Button>
      </div>

      <div style={{ background: 'white', borderRadius: 8 }}>
        <Table
          columns={columns}
          dataSource={data?.items}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: page,
            pageSize,
            total: data?.total,
            onChange: (p) => setPage(p),
            showSizeChanger: false,
            showTotal: (total) => `Tổng ${total} hồ sơ`,
          }}
          onRow={(record) => ({
            onClick: () => router.push(`/ho-so-gpmb/${record.id}`),
            style: { cursor: 'pointer' },
          })}
        />
      </div>

      <Modal
        title="Thêm mới hồ sơ GPMB"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields() }}
        footer={null}
        width={560}
      >
        <Form form={form} layout="vertical" onFinish={(values) => createMutation.mutate(values)}>
          <Form.Item name="code" label="Mã hồ sơ" rules={[{ required: true, message: 'Nhập mã hồ sơ' }]}>
            <Input placeholder="VD: HS-202504-002" />
          </Form.Item>
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
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => { setModalOpen(false); form.resetFields() }}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={createMutation.isPending}>Tạo hồ sơ</Button>
          </div>
        </Form>
      </Modal>
    </div>
  )
}

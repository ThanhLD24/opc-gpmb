'use client'
import {
  Button, Table, Tag, Typography, Space, Popconfirm, Modal, Form, Input,
  notification, Spin,
} from 'antd'
import {
  PlusOutlined, EyeOutlined, CheckCircleOutlined, DeleteOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ColumnsType } from 'antd/es/table'
import api from '@/lib/api'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { formatDate } from '@/utils/format'

const { Title } = Typography

interface TemplateRow {
  id: string
  name: string
  is_active: boolean
  created_at: string
  node_count: number
}

export default function QuyTrinhListPage() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const currentUser = useCurrentUser()
  const isAdmin = currentUser?.role === 'admin'

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm] = Form.useForm()

  const { data: templates = [], isLoading } = useQuery<TemplateRow[]>({
    queryKey: ['workflow-templates'],
    queryFn: async () => {
      const res = await api.get('/workflow/templates')
      return res.data
    },
  })

  const createMutation = useMutation({
    mutationFn: async (values: { name: string }) => {
      const res = await api.post('/workflow/templates', values)
      return res.data
    },
    onSuccess: (data) => {
      notification.success({ message: 'Tạo quy trình thành công' })
      setCreateOpen(false)
      createForm.resetFields()
      queryClient.invalidateQueries({ queryKey: ['workflow-templates'] })
      // Navigate to detail immediately
      router.push(`/quy-trinh/${data.id}`)
    },
    onError: () => notification.error({ message: 'Tạo quy trình thất bại' }),
  })

  const activateMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.put(`/workflow/templates/${id}`, { is_active: true })
    },
    onSuccess: () => {
      notification.success({ message: 'Đã đặt làm quy trình hoạt động' })
      queryClient.invalidateQueries({ queryKey: ['workflow-templates'] })
    },
    onError: () => notification.error({ message: 'Thao tác thất bại' }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/workflow/templates/${id}`)
    },
    onSuccess: () => {
      notification.success({ message: 'Đã xóa quy trình' })
      queryClient.invalidateQueries({ queryKey: ['workflow-templates'] })
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { detail?: string } } }
      notification.error({ message: e.response?.data?.detail || 'Xóa thất bại' })
    },
  })

  const columns: ColumnsType<TemplateRow> = [
    {
      title: 'STT',
      key: 'stt',
      width: 60,
      align: 'center',
      render: (_: unknown, __: TemplateRow, i: number) => i + 1,
    },
    {
      title: 'Tên quy trình',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: TemplateRow) => (
        <a onClick={() => router.push(`/quy-trinh/${record.id}`)} style={{ fontWeight: 500 }}>
          {name}
        </a>
      ),
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 140,
      align: 'center',
      render: (_: unknown, record: TemplateRow) =>
        record.is_active ? (
          <Tag color="green">Đang hoạt động</Tag>
        ) : (
          <Tag color="default">Không hoạt động</Tag>
        ),
    },
    {
      title: 'Số bước',
      dataIndex: 'node_count',
      key: 'node_count',
      width: 100,
      align: 'center',
      render: (v: number) => <Tag>{v}</Tag>,
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 140,
      render: (v: string) => formatDate(v),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 180,
      align: 'center',
      render: (_: unknown, record: TemplateRow) => (
        <Space size="small">
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => router.push(`/quy-trinh/${record.id}`)}
          >
            Chi tiết
          </Button>
          {isAdmin && !record.is_active && (
            <Popconfirm
              title="Đặt quy trình này làm hoạt động?"
              okText="Đặt hoạt động"
              cancelText="Hủy"
              onConfirm={() => activateMutation.mutate(record.id)}
            >
              <Button size="small" icon={<CheckCircleOutlined />} type="dashed">
                Kích hoạt
              </Button>
            </Popconfirm>
          )}
          {isAdmin && !record.is_active && (
            <Popconfirm
              title="Xóa quy trình này?"
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
              onConfirm={() => deleteMutation.mutate(record.id)}
            >
              <Button size="small" danger icon={<DeleteOutlined />} loading={deleteMutation.isPending} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 16 }}>
        {isAdmin && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            Tạo quy trình mới
          </Button>
        )}
      </div>

      {isLoading ? (
        <Spin style={{ display: 'block', margin: '60px auto' }} />
      ) : (
        <Table
          columns={columns}
          dataSource={templates}
          rowKey="id"
          pagination={false}
          size="small"
        />
      )}

      <Modal
        title="Tạo quy trình mới"
        open={createOpen}
        onCancel={() => { setCreateOpen(false); createForm.resetFields() }}
        onOk={() => createForm.submit()}
        confirmLoading={createMutation.isPending}
        okText="Tạo"
        cancelText="Hủy"
      >
        <Form form={createForm} layout="vertical" onFinish={(v) => createMutation.mutate(v)}>
          <Form.Item
            name="name"
            label="Tên quy trình"
            rules={[{ required: true, message: 'Nhập tên quy trình' }]}
          >
            <Input placeholder="Ví dụ: Quy trình GPMB 2025" autoFocus />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

'use client'
import {
  Tree, Form, Input, InputNumber, Switch, Button, Typography,
  notification, Spin, Space, Popconfirm, Card, Divider,
} from 'antd'
import { PlusOutlined, DeleteOutlined, UploadOutlined, DownloadOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import type { DataNode } from 'antd/es/tree'
import api from '@/lib/api'
import { getCurrentUser } from '@/lib/auth'
import { WorkflowNode } from '@/types'
import ImportQuyTrinhModal from '@/components/quy-trinh/ImportQuyTrinhModal'
import dayjs from 'dayjs'

const { Title } = Typography

function buildTreeData(nodes: WorkflowNode[]): DataNode[] {
  const map = new Map<string, DataNode & { raw: WorkflowNode }>()
  const roots: (DataNode & { raw: WorkflowNode })[] = []

  nodes.forEach(n => {
    map.set(n.id, {
      key: n.id,
      title: `${n.code ? `[${n.code}] ` : ''}${n.name}`,
      raw: n,
      children: [],
    })
  })

  nodes.forEach(n => {
    const node = map.get(n.id)!
    if (n.parent_id && map.has(n.parent_id)) {
      const parent = map.get(n.parent_id)!
      ;(parent.children as (DataNode & { raw: WorkflowNode })[]).push(node)
    } else {
      roots.push(node)
    }
  })

  return roots
}

export default function QuyTrinhPage() {
  const queryClient = useQueryClient()
  const currentUser = getCurrentUser()
  const isAdmin = currentUser?.role === 'admin'
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [form] = Form.useForm()

  const handleExport = async () => {
    setExportLoading(true)
    try {
      const res = await api.get('/workflow/export-excel', { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data as BlobPart]))
      const a = document.createElement('a')
      a.href = url
      a.download = `quy-trinh-${dayjs().format('YYYY-MM-DD')}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      notification.error({ message: 'Xuất Excel thất bại' })
    } finally {
      setExportLoading(false)
    }
  }

  const { data: templateData, isLoading } = useQuery<{ id: string; nodes: WorkflowNode[] }>({
    queryKey: ['workflow-template'],
    queryFn: async () => {
      const res = await api.get('/workflow/template')
      return { id: res.data.id as string, nodes: res.data.nodes || [] }
    },
  })
  const template = templateData?.nodes

  useEffect(() => {
    if (selectedNode) {
      form.setFieldsValue({
        name: selectedNode.name,
        code: selectedNode.code,
        planned_days: selectedNode.planned_days,
        per_household: selectedNode.per_household,
        field_so_vb: selectedNode.field_so_vb,
        field_ngay_vb: selectedNode.field_ngay_vb,
        field_loai_vb: selectedNode.field_loai_vb,
        field_gia_tri_trinh: selectedNode.field_gia_tri_trinh,
        field_gia_tri_duyet: selectedNode.field_gia_tri_duyet,
        field_ghi_chu: selectedNode.field_ghi_chu,
        require_scan: selectedNode.require_scan,
        legal_basis: selectedNode.legal_basis,
        org_in_charge: selectedNode.org_in_charge,
      })
    }
  }, [selectedNode, form])

  const updateMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const res = await api.put(`/workflow/nodes/${selectedNode!.id}`, values)
      return res.data
    },
    onSuccess: () => {
      notification.success({ message: 'Cập nhật thành công' })
      queryClient.invalidateQueries({ queryKey: ['workflow-template'] })
    },
    onError: () => notification.error({ message: 'Cập nhật thất bại' }),
  })

  const addChildMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/workflow/nodes', {
        template_id: templateData!.id,
        parent_id: selectedNode!.id,
        name: 'Bước mới',
        level: (selectedNode!.level ?? 0) + 1,
        per_household: selectedNode?.per_household || false,
      })
      return res.data
    },
    onSuccess: () => {
      notification.success({ message: 'Thêm bước thành công' })
      queryClient.invalidateQueries({ queryKey: ['workflow-template'] })
    },
    onError: () => notification.error({ message: 'Thêm bước thất bại' }),
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await api.delete(`/workflow/nodes/${selectedNode!.id}`)
      return res.data
    },
    onSuccess: () => {
      notification.success({ message: 'Xóa thành công' })
      setSelectedNode(null)
      form.resetFields()
      queryClient.invalidateQueries({ queryKey: ['workflow-template'] })
    },
    onError: () => notification.error({ message: 'Xóa thất bại. Node có thể đang có con.' }),
  })

  const treeData = template ? buildTreeData(template) : []

  const hasChildren = selectedNode
    ? (template || []).some(n => n.parent_id === selectedNode.id)
    : false

  const parentNode = selectedNode && selectedNode.parent_id
    ? (template || []).find(n => n.id === selectedNode.parent_id)
    : null
  const parentPerHousehold = parentNode?.per_household || false

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>Quản lý quy trình GPMB</Title>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, alignItems: 'start' }}>
        <Card
          title="Cây quy trình"
          size="small"
          extra={
            isAdmin && (
              <Space>
                <Button
                  size="small"
                  icon={<UploadOutlined />}
                  onClick={() => setImportOpen(true)}
                >
                  Nhập file
                </Button>
                <Button
                  size="small"
                  icon={<DownloadOutlined />}
                  loading={exportLoading}
                  onClick={handleExport}
                >
                  Xuất Excel
                </Button>
              </Space>
            )
          }
        >
          {isLoading ? (
            <Spin style={{ display: 'block', margin: '40px auto' }} />
          ) : (
            <Tree
              treeData={treeData}
              defaultExpandAll
              selectedKeys={selectedNode ? [selectedNode.id] : []}
              onSelect={(keys, info) => {
                if (keys.length > 0) {
                  const raw = (info.node as unknown as { raw: WorkflowNode }).raw
                  setSelectedNode(raw)
                }
              }}
            />
          )}
        </Card>

        <Card
          title={selectedNode ? `Chỉnh sửa: ${selectedNode.name}` : 'Chọn một bước để chỉnh sửa'}
          size="small"
          extra={
            selectedNode && (
              <Space>
                {isAdmin && (
                  <Button
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => addChildMutation.mutate()}
                    loading={addChildMutation.isPending}
                  >
                    Thêm bước con
                  </Button>
                )}
                {!hasChildren && (
                  <Popconfirm title="Xóa bước này?" onConfirm={() => deleteMutation.mutate()}>
                    <Button
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      loading={deleteMutation.isPending}
                    >
                      Xóa
                    </Button>
                  </Popconfirm>
                )}
              </Space>
            )
          }
        >
          {selectedNode ? (
            <Form form={form} layout="vertical" onFinish={(v) => updateMutation.mutate(v)}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Form.Item name="name" label="Tên bước" rules={[{ required: true, message: 'Nhập tên bước' }]}>
                  <Input />
                </Form.Item>
                <Form.Item name="code" label="Mã bước">
                  <Input />
                </Form.Item>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Form.Item name="planned_days" label="Thời gian kế hoạch (ngày)">
                  <InputNumber style={{ width: '100%' }} min={0} />
                </Form.Item>
                <Form.Item name="per_household" label="Theo từng hộ" valuePropName="checked">
                  <Switch disabled={parentPerHousehold} />
                </Form.Item>
              </div>

              <Divider orientation="left" plain style={{ fontSize: 12 }}>Trường dữ liệu</Divider>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <Form.Item name="field_so_vb" label="Số văn bản" valuePropName="checked">
                  <Switch />
                </Form.Item>
                <Form.Item name="field_ngay_vb" label="Ngày văn bản" valuePropName="checked">
                  <Switch />
                </Form.Item>
                <Form.Item name="field_loai_vb" label="Loại văn bản" valuePropName="checked">
                  <Switch />
                </Form.Item>
                <Form.Item name="field_gia_tri_trinh" label="Giá trị trình" valuePropName="checked">
                  <Switch />
                </Form.Item>
                <Form.Item name="field_gia_tri_duyet" label="Giá trị duyệt" valuePropName="checked">
                  <Switch />
                </Form.Item>
                <Form.Item name="field_ghi_chu" label="Ghi chú" valuePropName="checked">
                  <Switch />
                </Form.Item>
                <Form.Item name="require_scan" label="Yêu cầu scan" valuePropName="checked">
                  <Switch />
                </Form.Item>
              </div>

              <Divider orientation="left" plain style={{ fontSize: 12 }}>Pháp lý & Tổ chức</Divider>
              <Form.Item name="legal_basis" label="Cơ sở pháp lý">
                <Input.TextArea rows={2} />
              </Form.Item>
              <Form.Item name="org_in_charge" label="Đơn vị phụ trách">
                <Input />
              </Form.Item>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button type="primary" htmlType="submit" loading={updateMutation.isPending} disabled={!isAdmin}>
                  Lưu thay đổi
                </Button>
              </div>
            </Form>
          ) : (
            <div style={{ textAlign: 'center', color: '#999', padding: 40 }}>
              Chọn một bước từ cây bên trái để chỉnh sửa
            </div>
          )}
        </Card>
      </div>

      <ImportQuyTrinhModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['workflow-template'] })}
      />
    </div>
  )
}

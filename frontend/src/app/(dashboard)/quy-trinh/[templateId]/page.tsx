'use client'
import {
  Tree, Form, Input, InputNumber, Switch, Button, Typography,
  notification, Spin, Space, Popconfirm, Card, Divider, List, Upload, Tag, Badge,
} from 'antd'
import {
  PlusOutlined, DeleteOutlined, UploadOutlined, DownloadOutlined,
  FileTextOutlined, ArrowLeftOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import type { DataNode } from 'antd/es/tree'
import type { RcFile } from 'antd/es/upload'
import api from '@/lib/api'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { WorkflowNode, WorkflowNodeDocument } from '@/types'
import ImportQuyTrinhModal from '@/components/quy-trinh/ImportQuyTrinhModal'
import { getFileUrl } from '@/utils/format'
import dayjs from 'dayjs'

const { Title, Text } = Typography

// ─── NodeDocuments sub-component ─────────────────────────────────────────────

function NodeDocuments({ nodeId, isAdmin }: { nodeId: string; isAdmin: boolean }) {
  const queryClient = useQueryClient()
  const [docName, setDocName] = useState('')

  const { data: docs = [], isLoading } = useQuery<WorkflowNodeDocument[]>({
    queryKey: ['node-docs', nodeId],
    queryFn: async () => {
      const res = await api.get(`/workflow/nodes/${nodeId}/documents`)
      return res.data
    },
  })

  const uploadMutation = useMutation({
    mutationFn: async ({ file, tenTaiLieu }: { file: RcFile; tenTaiLieu: string }) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('ten_tai_lieu', tenTaiLieu || file.name)
      const res = await api.post(`/workflow/nodes/${nodeId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return res.data
    },
    onSuccess: () => {
      notification.success({ message: 'Upload tài liệu thành công' })
      setDocName('')
      queryClient.invalidateQueries({ queryKey: ['node-docs', nodeId] })
      queryClient.invalidateQueries({ queryKey: ['workflow-template-detail'] })
    },
    onError: () => notification.error({ message: 'Upload thất bại' }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (docId: string) => {
      await api.delete(`/workflow/nodes/${nodeId}/documents/${docId}`)
    },
    onSuccess: () => {
      notification.success({ message: 'Đã xóa tài liệu' })
      queryClient.invalidateQueries({ queryKey: ['node-docs', nodeId] })
      queryClient.invalidateQueries({ queryKey: ['workflow-template-detail'] })
    },
    onError: () => notification.error({ message: 'Xóa thất bại' }),
  })

  return (
    <div>
      {isLoading ? (
        <Spin size="small" />
      ) : (
        <>
          {docs.length > 0 ? (
            <List
              size="small"
              dataSource={docs}
              renderItem={(doc) => (
                <List.Item
                  actions={[
                    <a key="dl" href={getFileUrl(doc.url)} target="_blank" rel="noreferrer">
                      <Button size="small" icon={<DownloadOutlined />}>Xem</Button>
                    </a>,
                    isAdmin && (
                      <Popconfirm
                        key="del"
                        title="Xóa tài liệu này?"
                        okText="Xóa"
                        cancelText="Hủy"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => deleteMutation.mutate(doc.id)}
                      >
                        <Button size="small" danger icon={<DeleteOutlined />} loading={deleteMutation.isPending} />
                      </Popconfirm>
                    ),
                  ].filter(Boolean)}
                >
                  <List.Item.Meta
                    avatar={<FileTextOutlined style={{ color: '#1677ff' }} />}
                    title={<span style={{ fontSize: 13 }}>{doc.ten_tai_lieu}</span>}
                  />
                </List.Item>
              )}
            />
          ) : (
            <div style={{ color: '#999', fontSize: 13, marginBottom: 8 }}>Chưa có tài liệu</div>
          )}

          {isAdmin && (
            <Space direction="vertical" style={{ width: '100%', marginTop: 8 }}>
              <Input
                size="small"
                placeholder="Tên tài liệu (để trống sẽ dùng tên file)"
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
              />
              <Upload
                showUploadList={false}
                beforeUpload={(file) => {
                  uploadMutation.mutate({ file, tenTaiLieu: docName })
                  return false
                }}
              >
                <Button icon={<UploadOutlined />} size="small" loading={uploadMutation.isPending}>
                  Tải lên tài liệu
                </Button>
              </Upload>
            </Space>
          )}
        </>
      )}
    </div>
  )
}

// ─── Tree builder ─────────────────────────────────────────────────────────────

function flattenTree(nodes: WorkflowNode[]): WorkflowNode[] {
  const result: WorkflowNode[] = []
  const walk = (ns: WorkflowNode[]) => {
    ns.forEach(n => {
      result.push(n)
      if (n.children) walk(n.children)
    })
  }
  walk(nodes)
  return result
}

function buildTreeData(nodes: WorkflowNode[]): DataNode[] {
  const buildNode = (n: WorkflowNode): DataNode & { raw: WorkflowNode } => ({
    key: n.id,
    title: (
      <span>
        {n.code ? <Text type="secondary" style={{ fontSize: 12, marginRight: 4 }}>[{n.code}]</Text> : null}
        {n.name}
        {n.documents && n.documents.length > 0 && (
          <Tag color="blue" style={{ marginLeft: 6, fontSize: 11, padding: '0 4px' }}>
            {n.documents.length} tài liệu
          </Tag>
        )}
      </span>
    ),
    raw: n,
    children: n.children ? n.children.map(buildNode) : undefined,
  })
  return nodes.map(buildNode)
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function QuyTrinhDetailPage() {
  const params = useParams<{ templateId: string }>()
  const templateId = params.templateId
  const queryClient = useQueryClient()
  const router = useRouter()
  const currentUser = useCurrentUser()
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

  const { data: templateData, isLoading } = useQuery<{ id: string; name: string; is_active: boolean; nodes: WorkflowNode[] }>({
    queryKey: ['workflow-template-detail', templateId],
    queryFn: async () => {
      const res = await api.get(`/workflow/templates/${templateId}`)
      return res.data
    },
  })

  const allNodes = templateData ? flattenTree(templateData.nodes) : []

  useEffect(() => {
    if (selectedNode) {
      // Sync selectedNode from fresh data after mutations
      const fresh = allNodes.find(n => n.id === selectedNode.id)
      if (fresh) {
        form.setFieldsValue({
          name: fresh.name,
          code: fresh.code,
          planned_days: fresh.planned_days,
          per_household: fresh.per_household,
          field_so_vb: fresh.field_so_vb,
          field_ngay_vb: fresh.field_ngay_vb,
          field_loai_vb: fresh.field_loai_vb,
          field_gia_tri_trinh: fresh.field_gia_tri_trinh,
          field_gia_tri_duyet: fresh.field_gia_tri_duyet,
          field_ghi_chu: fresh.field_ghi_chu,
          require_scan: fresh.require_scan,
          legal_basis: fresh.legal_basis,
          org_in_charge: fresh.org_in_charge,
        })
      }
    }
  }, [templateData, selectedNode?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const updateMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const res = await api.put(`/workflow/nodes/${selectedNode!.id}`, values)
      return res.data
    },
    onSuccess: () => {
      notification.success({ message: 'Cập nhật thành công' })
      queryClient.invalidateQueries({ queryKey: ['workflow-template-detail', templateId] })
      queryClient.invalidateQueries({ queryKey: ['workflow-templates'] })
    },
    onError: () => notification.error({ message: 'Cập nhật thất bại' }),
  })

  const addChildMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/workflow/nodes', {
        template_id: templateId,
        parent_id: selectedNode!.id,
        name: 'Bước mới',
        level: (selectedNode!.level ?? 0) + 1,
        per_household: selectedNode?.per_household || false,
      })
      return res.data
    },
    onSuccess: () => {
      notification.success({ message: 'Thêm bước thành công' })
      queryClient.invalidateQueries({ queryKey: ['workflow-template-detail', templateId] })
      queryClient.invalidateQueries({ queryKey: ['workflow-templates'] })
    },
    onError: () => notification.error({ message: 'Thêm bước thất bại' }),
  })

  const addRootMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/workflow/nodes', {
        template_id: templateId,
        parent_id: null,
        name: 'Bước mới',
        level: 1,
        per_household: false,
      })
      return res.data
    },
    onSuccess: () => {
      notification.success({ message: 'Thêm bước gốc thành công' })
      queryClient.invalidateQueries({ queryKey: ['workflow-template-detail', templateId] })
      queryClient.invalidateQueries({ queryKey: ['workflow-templates'] })
    },
    onError: () => notification.error({ message: 'Thêm bước thất bại' }),
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/workflow/nodes/${selectedNode!.id}`)
    },
    onSuccess: () => {
      notification.success({ message: 'Xóa thành công' })
      setSelectedNode(null)
      form.resetFields()
      queryClient.invalidateQueries({ queryKey: ['workflow-template-detail', templateId] })
      queryClient.invalidateQueries({ queryKey: ['workflow-templates'] })
    },
    onError: () => notification.error({ message: 'Xóa thất bại. Node có thể đang có con.' }),
  })

  const treeData = templateData ? buildTreeData(templateData.nodes) : []
  const hasChildren = selectedNode ? allNodes.some(n => n.parent_id === selectedNode.id) : false
  const parentNode = selectedNode?.parent_id ? allNodes.find(n => n.id === selectedNode.parent_id) : null
  const parentPerHousehold = parentNode?.per_household || false

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/quy-trinh')}>
          Danh sách
        </Button>
        <div>
          <Title level={4} style={{ margin: 0 }}>
            {templateData?.name ?? '...'}
            {templateData?.is_active && (
              <Badge status="success" text={<Tag color="green" style={{ marginLeft: 8 }}>Đang hoạt động</Tag>} />
            )}
          </Title>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16, alignItems: 'start' }}>
        {/* Left: tree */}
        <Card
          title="Cây quy trình"
          size="small"
          extra={
            isAdmin && (
              <Space>
                <Button size="small" icon={<PlusOutlined />} onClick={() => addRootMutation.mutate()} loading={addRootMutation.isPending}>
                  Thêm bước gốc
                </Button>
                <Button size="small" icon={<UploadOutlined />} onClick={() => setImportOpen(true)}>
                  Nhập
                </Button>
                <Button size="small" icon={<DownloadOutlined />} loading={exportLoading} onClick={handleExport}>
                  Xuất
                </Button>
              </Space>
            )
          }
        >
          {isLoading ? (
            <Spin style={{ display: 'block', margin: '40px auto' }} />
          ) : treeData.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#999', padding: 24 }}>
              Chưa có bước nào.{isAdmin && ' Nhấn "Thêm bước gốc" để bắt đầu.'}
            </div>
          ) : (
            <Tree
              treeData={treeData}
              defaultExpandAll
              selectedKeys={selectedNode ? [selectedNode.id] : []}
              onSelect={(keys, info) => {
                if (keys.length > 0) {
                  const raw = (info.node as unknown as { raw: WorkflowNode }).raw
                  setSelectedNode(raw)
                  form.setFieldsValue({
                    name: raw.name,
                    code: raw.code,
                    planned_days: raw.planned_days,
                    per_household: raw.per_household,
                    field_so_vb: raw.field_so_vb,
                    field_ngay_vb: raw.field_ngay_vb,
                    field_loai_vb: raw.field_loai_vb,
                    field_gia_tri_trinh: raw.field_gia_tri_trinh,
                    field_gia_tri_duyet: raw.field_gia_tri_duyet,
                    field_ghi_chu: raw.field_ghi_chu,
                    require_scan: raw.require_scan,
                    legal_basis: raw.legal_basis,
                    org_in_charge: raw.org_in_charge,
                  })
                }
              }}
            />
          )}
        </Card>

        {/* Right: node editor */}
        <Card
          title={selectedNode ? `Chi tiết bước: ${selectedNode.code ? `[${selectedNode.code}] ` : ''}${selectedNode.name}` : 'Chọn một bước để chỉnh sửa'}
          size="small"
          extra={
            selectedNode && isAdmin && (
              <Space>
                <Button
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => addChildMutation.mutate()}
                  loading={addChildMutation.isPending}
                >
                  Thêm bước con
                </Button>
                {!hasChildren && (
                  <Popconfirm title="Xóa bước này?" okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }} onConfirm={() => deleteMutation.mutate()}>
                    <Button size="small" danger icon={<DeleteOutlined />} loading={deleteMutation.isPending}>
                      Xóa
                    </Button>
                  </Popconfirm>
                )}
              </Space>
            )
          }
        >
          {selectedNode ? (
            <>
              <Form form={form} layout="vertical" onFinish={(v) => updateMutation.mutate(v)}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <Form.Item name="name" label="Tên bước" rules={[{ required: true, message: 'Nhập tên bước' }]}>
                    <Input disabled={!isAdmin} />
                  </Form.Item>
                  <Form.Item name="code" label="Mã bước">
                    <Input disabled={!isAdmin} />
                  </Form.Item>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <Form.Item name="planned_days" label="Thời gian kế hoạch (ngày)">
                    <InputNumber style={{ width: '100%' }} min={0} disabled={!isAdmin} />
                  </Form.Item>
                  <Form.Item name="per_household" label="Theo từng hộ" valuePropName="checked">
                    <Switch disabled={!isAdmin || parentPerHousehold} />
                  </Form.Item>
                </div>

                <Divider orientation="left" plain style={{ fontSize: 12 }}>Trường dữ liệu bắt buộc</Divider>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  {[
                    ['field_so_vb', 'Số văn bản'],
                    ['field_ngay_vb', 'Ngày văn bản'],
                    ['field_loai_vb', 'Loại văn bản'],
                    ['field_gia_tri_trinh', 'Giá trị trình'],
                    ['field_gia_tri_duyet', 'Giá trị duyệt'],
                    ['field_ghi_chu', 'Ghi chú'],
                    ['require_scan', 'Yêu cầu scan'],
                  ].map(([name, label]) => (
                    <Form.Item key={name} name={name} label={label} valuePropName="checked">
                      <Switch disabled={!isAdmin} />
                    </Form.Item>
                  ))}
                </div>

                <Divider orientation="left" plain style={{ fontSize: 12 }}>Pháp lý & Tổ chức</Divider>
                <Form.Item name="legal_basis" label="Cơ sở pháp lý">
                  <Input.TextArea rows={2} disabled={!isAdmin} />
                </Form.Item>
                <Form.Item name="org_in_charge" label="Đơn vị phụ trách">
                  <Input disabled={!isAdmin} />
                </Form.Item>

                {isAdmin && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button type="primary" htmlType="submit" loading={updateMutation.isPending}>
                      Lưu thay đổi
                    </Button>
                  </div>
                )}
              </Form>

              <Divider orientation="left" plain style={{ fontSize: 12 }}>Tài liệu hướng dẫn</Divider>
              <NodeDocuments nodeId={selectedNode.id} isAdmin={isAdmin} />
            </>
          ) : (
            <div style={{ textAlign: 'center', color: '#999', padding: 40 }}>
              Chọn một bước từ cây bên trái để xem và chỉnh sửa
            </div>
          )}
        </Card>
      </div>

      <ImportQuyTrinhModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['workflow-template-detail', templateId] })
          queryClient.invalidateQueries({ queryKey: ['workflow-templates'] })
        }}
      />
    </div>
  )
}

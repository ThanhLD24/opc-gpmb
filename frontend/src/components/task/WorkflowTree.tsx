'use client'
import { Tree, Tag, Progress, Button, Modal, Checkbox, notification } from 'antd'
import { CheckCircleFilled, ClockCircleOutlined, TeamOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { DataNode } from 'antd/es/tree'
import api from '@/lib/api'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { TaskInstance, Ho } from '@/types'

interface Props {
  tasks: TaskInstance[]
  hoSoId: string
  onTaskClick: (task: TaskInstance) => void
}

interface ScopeModalState {
  open: boolean
  nodeId: string | null
  nodeName: string
  selectedHoIds: string[]
}

export default function WorkflowTree({ tasks, hoSoId, onTaskClick }: Props) {
  const queryClient = useQueryClient()
  const currentUser = useCurrentUser()
  const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'cbcq'
  const [scopeModal, setScopeModal] = useState<ScopeModalState>({
    open: false,
    nodeId: null,
    nodeName: '',
    selectedHoIds: [],
  })

  const { data: hoList } = useQuery<Ho[]>({
    queryKey: ['ho-all', hoSoId],
    queryFn: async () => {
      const res = await api.get(`/ho-so/${hoSoId}/ho?page_size=500`)
      return res.data.items || res.data
    },
    enabled: scopeModal.open,
  })

  const scopeMutation = useMutation({
    mutationFn: async ({ nodeId, hoIds }: { nodeId: string; hoIds: string[] }) => {
      const res = await api.put(`/ho-so/${hoSoId}/nodes/${nodeId}/scope`, { ho_ids: hoIds })
      return res.data
    },
    onSuccess: () => {
      notification.success({ message: 'Cập nhật phạm vi hộ thành công' })
      setScopeModal({ open: false, nodeId: null, nodeName: '', selectedHoIds: [] })
      queryClient.invalidateQueries({ queryKey: ['tasks', hoSoId] })
    },
    onError: () => notification.error({ message: 'Cập nhật thất bại' }),
  })

  const openScopeModal = async (task: TaskInstance, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const res = await api.get(`/ho-so/${hoSoId}/nodes/${task.node_id}/scope`)
      const currentHoIds = (res.data as Ho[]).map((h: Ho) => h.id)
      setScopeModal({
        open: true,
        nodeId: task.node_id,
        nodeName: task.name,
        selectedHoIds: currentHoIds,
      })
    } catch {
      setScopeModal({
        open: true,
        nodeId: task.node_id,
        nodeName: task.name,
        selectedHoIds: [],
      })
    }
  }

  function renderNode(task: TaskInstance): DataNode {
    const isComplete = task.status === 'hoan_thanh'
    const progress = task.total_count > 0
      ? Math.round((task.completed_count / task.total_count) * 100)
      : 0

    const title = (
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: task.is_leaf ? 'pointer' : 'default', padding: '2px 0' }}
        onClick={() => task.is_leaf && onTaskClick(task)}
      >
        {isComplete
          ? <CheckCircleFilled style={{ color: '#52c41a', flexShrink: 0 }} />
          : <ClockCircleOutlined style={{ color: '#faad14', flexShrink: 0 }} />}
        <span style={{ fontSize: 13 }}>
          {task.code ? <strong>[{task.code}]</strong> : null}
          {task.code ? ' ' : ''}{task.name}
        </span>
        {task.per_household && task.total_count > 0 && (
          <Tag color="blue" style={{ fontSize: 11, padding: '0 4px', lineHeight: '16px', height: 16, marginLeft: 4 }}>
            {task.completed_count}/{task.total_count} hộ
          </Tag>
        )}
        {!task.per_household && !task.is_leaf && (
          <Tag color={isComplete ? 'success' : 'processing'} style={{ fontSize: 11, padding: '0 4px', lineHeight: '16px', height: 16 }}>
            {task.completed_count}/{task.total_count}
          </Tag>
        )}
        {task.per_household && canEdit && (
          <Button
            size="small"
            type="text"
            icon={<TeamOutlined />}
            onClick={(e) => openScopeModal(task, e)}
            style={{ fontSize: 11, height: 20, padding: '0 4px' }}
          >
            Gán hộ
          </Button>
        )}
      </div>
    )

    return {
      key: task.id,
      title,
      children: task.children ? task.children.map(renderNode) : undefined,
      isLeaf: task.is_leaf,
    }
  }

  const treeData = tasks.map(renderNode)

  return (
    <div>
      <Tree
        treeData={treeData}
        defaultExpandAll
        showLine={{ showLeafIcon: false }}
        blockNode
      />

      <Modal
        title={`Gán hộ cho: ${scopeModal.nodeName}`}
        open={scopeModal.open}
        onCancel={() => setScopeModal({ open: false, nodeId: null, nodeName: '', selectedHoIds: [] })}
        footer={null}
        width={480}
      >
        <div style={{ marginBottom: 12 }}>
          <Button
            size="small"
            onClick={() => setScopeModal(prev => ({ ...prev, selectedHoIds: (hoList || []).map(h => h.id) }))}
          >
            Chọn tất cả
          </Button>
          <Button
            size="small"
            style={{ marginLeft: 8 }}
            onClick={() => setScopeModal(prev => ({ ...prev, selectedHoIds: [] }))}
          >
            Bỏ chọn tất cả
          </Button>
        </div>
        <div style={{ maxHeight: 400, overflowY: 'auto', border: '1px solid #f0f0f0', borderRadius: 6, padding: 8 }}>
          {(hoList || []).map(ho => (
            <div key={ho.id} style={{ padding: '4px 0', borderBottom: '1px solid #fafafa' }}>
              <Checkbox
                checked={scopeModal.selectedHoIds.includes(ho.id)}
                onChange={(e) => {
                  setScopeModal(prev => ({
                    ...prev,
                    selectedHoIds: e.target.checked
                      ? [...prev.selectedHoIds, ho.id]
                      : prev.selectedHoIds.filter(id => id !== ho.id),
                  }))
                }}
              >
                {ho.ma_ho} — {ho.ten_chu_ho}
              </Checkbox>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <Button onClick={() => setScopeModal({ open: false, nodeId: null, nodeName: '', selectedHoIds: [] })}>Hủy</Button>
          <Button
            type="primary"
            loading={scopeMutation.isPending}
            onClick={() => {
              if (scopeModal.nodeId) {
                scopeMutation.mutate({ nodeId: scopeModal.nodeId, hoIds: scopeModal.selectedHoIds })
              }
            }}
          >
            Lưu ({scopeModal.selectedHoIds.length} hộ)
          </Button>
        </div>
      </Modal>
    </div>
  )
}

'use client'
import { Timeline, Alert, Spin, Typography } from 'antd'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import dayjs from 'dayjs'
import 'dayjs/locale/vi'

dayjs.locale('vi')

const { Text } = Typography

interface AuditLog {
  id: string
  action: string
  actor_name: string | null
  note: string | null
  created_at: string
}

const ACTION_LABELS: Record<string, string> = {
  tao: 'Tạo hồ sơ',
  gui_duyet: 'Gửi duyệt',
  phe_duyet: 'Phê duyệt',
  tu_choi: 'Từ chối',
  tai_gui: 'Tái gửi',
  ban_giao: 'Bàn giao mặt bằng',
}

const ACTION_COLORS: Record<string, string> = {
  tao: 'gray',
  gui_duyet: 'blue',
  phe_duyet: 'green',
  tu_choi: 'red',
  tai_gui: 'orange',
  ban_giao: '#52c41a',
}

interface Props {
  hoSoId: string
  chiTraId: string
}

export default function AuditTimeline({ hoSoId, chiTraId }: Props) {
  const { data: logs, isLoading } = useQuery<AuditLog[]>({
    queryKey: ['audit', hoSoId, chiTraId],
    queryFn: async () => {
      const res = await api.get(`/ho-so/${hoSoId}/chi-tra/${chiTraId}/audit`)
      return res.data
    },
    staleTime: 0,
  })

  if (isLoading) {
    return <Spin style={{ display: 'block', margin: '20px auto' }} size="small" />
  }

  if (!logs || logs.length === 0) {
    return (
      <div style={{ color: '#999', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>
        Chưa có lịch sử
      </div>
    )
  }

  const timelineItems = logs.map((log) => ({
    key: log.id,
    color: ACTION_COLORS[log.action] || 'gray',
    children: (
      <div>
        <div>
          <Text strong>{ACTION_LABELS[log.action] || log.action}</Text>
          {log.actor_name && (
            <Text type="secondary"> bởi {log.actor_name}</Text>
          )}
          <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
            — {dayjs(log.created_at).format('DD/MM/YYYY HH:mm')}
          </Text>
        </div>
        {log.action === 'tu_choi' && log.note && (
          <Alert
            message={log.note}
            type="error"
            style={{ marginTop: 6, fontSize: 13 }}
            showIcon={false}
          />
        )}
        {log.action !== 'tu_choi' && log.note && (
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
            {log.note}
          </Text>
        )}
      </div>
    ),
  }))

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>Lịch sử thao tác</div>
      <Timeline items={timelineItems} />
    </div>
  )
}

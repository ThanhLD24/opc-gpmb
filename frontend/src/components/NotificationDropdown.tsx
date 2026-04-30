'use client'
import { Button, List, Typography } from 'antd'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { formatDate } from '@/utils/format'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NotifItem {
  id: string
  title: string
  body: string | null
  is_read: boolean
  link_url: string | null
  created_at: string
}

export interface NotifData {
  unread_count: number
  items: NotifItem[]
}

interface Props {
  data: NotifData | undefined
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NotificationDropdown({ data }: Props) {
  const router = useRouter()
  const queryClient = useQueryClient()

  const readOneMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/notifications/${id}/read`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const readAllMutation = useMutation({
    mutationFn: async () => {
      await api.patch('/notifications/read-all')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const handleClickItem = (item: NotifItem) => {
    if (!item.is_read) {
      readOneMutation.mutate(item.id)
    }
    if (item.link_url) {
      router.push(item.link_url)
    }
  }

  const items = data?.items?.slice(0, 10) ?? []

  return (
    <div style={{ width: 360 }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid #f0e8e8',
        }}
      >
        <Typography.Text strong>Thông báo</Typography.Text>
        {(data?.unread_count ?? 0) > 0 && (
          <Button
            type="link"
            size="small"
            loading={readAllMutation.isPending}
            onClick={() => readAllMutation.mutate()}
            style={{ padding: 0, color: '#9B1B30' }}
          >
            Đánh dấu tất cả đã đọc
          </Button>
        )}
      </div>

      {/* List */}
      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
        {items.length === 0 ? (
          <div
            style={{
              padding: '32px 16px',
              textAlign: 'center',
              color: '#888',
              fontSize: 13,
            }}
          >
            Không có thông báo nào
          </div>
        ) : (
          <List
            dataSource={items}
            renderItem={(item) => (
              <List.Item
                key={item.id}
                style={{
                  padding: '10px 16px',
                  cursor: item.link_url ? 'pointer' : 'default',
                  background: item.is_read ? 'transparent' : '#FFF8F8',
                  borderBottom: '1px solid #f5f5f5',
                  alignItems: 'flex-start',
                }}
                onClick={() => handleClickItem(item)}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    {!item.is_read && (
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: '#9B1B30',
                          flexShrink: 0,
                          marginTop: 5,
                        }}
                      />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Typography.Text
                        strong={!item.is_read}
                        style={{
                          display: 'block',
                          fontSize: 13,
                          lineHeight: '18px',
                          color: '#1a1a1a',
                        }}
                      >
                        {item.title}
                      </Typography.Text>
                      {item.body && (
                        <Typography.Text
                          style={{
                            display: 'block',
                            fontSize: 12,
                            color: '#666',
                            marginTop: 2,
                            lineHeight: '16px',
                          }}
                          ellipsis
                        >
                          {item.body}
                        </Typography.Text>
                      )}
                      <Typography.Text
                        style={{
                          display: 'block',
                          fontSize: 11,
                          color: '#999',
                          marginTop: 4,
                        }}
                      >
                        {formatDate(item.created_at)}
                      </Typography.Text>
                    </div>
                  </div>
                </div>
              </List.Item>
            )}
          />
        )}
      </div>
    </div>
  )
}

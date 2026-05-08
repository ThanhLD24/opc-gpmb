'use client'
import { Drawer, Descriptions, Badge, Table, Spin, Divider } from 'antd'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Ho, HoDatInfo } from '@/types'
import { HO_STATUS_LABELS, HO_STATUS_COLORS } from '@/utils/constants'
import { LOAI_DAT_OPTIONS } from './EditHoModal'

interface Props {
  hoSoId: string
  hoId: string | null
  open: boolean
  onClose: () => void
}

const loaiDatLabel = (code: string) =>
  LOAI_DAT_OPTIONS.find((o) => o.value === code)?.label ?? code

const DAT_COLUMNS = [
  {
    title: 'Loại đất',
    dataIndex: 'loai_dat',
    key: 'loai_dat',
    render: (v: string) => <span style={{ fontSize: 12 }}>{loaiDatLabel(v)}</span>,
  },
  {
    title: 'Số thửa',
    dataIndex: 'so_thua',
    key: 'so_thua',
    width: 80,
    render: (v: string | null) => v || '—',
  },
  {
    title: 'Tờ BĐ',
    dataIndex: 'so_to_ban_do',
    key: 'so_to_ban_do',
    width: 70,
    render: (v: string | null) => v || '—',
  },
  {
    title: 'DT (m²)',
    dataIndex: 'dien_tich',
    key: 'dien_tich',
    width: 90,
    align: 'right' as const,
    render: (v: number | null) =>
      v != null ? v.toLocaleString('vi-VN', { maximumFractionDigits: 0 }) : '—',
  },
  {
    title: 'Tỷ lệ (%)',
    dataIndex: 'ty_le_thu_hoi',
    key: 'ty_le_thu_hoi',
    width: 80,
    align: 'right' as const,
    render: (v: number | null) => (v != null ? `${v}%` : '—'),
  },
  {
    title: 'Bồi thường',
    dataIndex: 'so_tien',
    key: 'so_tien',
    width: 100,
    align: 'right' as const,
    render: (v: number | null) =>
      v != null ? (
        <span style={{ color: '#9B1B30', fontWeight: 500 }}>
          {(v / 1_000_000_000).toFixed(2)} tỷ
        </span>
      ) : (
        '—'
      ),
  },
]

export default function HoDetailDrawer({ hoSoId, hoId, open, onClose }: Props) {
  const { data: ho, isLoading } = useQuery<Ho>({
    queryKey: ['ho-detail', hoSoId, hoId],
    queryFn: async () => {
      const res = await api.get(`/ho-so/${hoSoId}/ho/${hoId}`)
      return res.data
    },
    enabled: open && !!hoId,
    staleTime: 30_000,
  })

  const dat = ho?.dat_info ?? []
  const totalArea = dat.reduce((s, d) => s + (d.dien_tich ?? 0), 0)
  const totalMoney = dat.reduce((s, d) => s + (d.so_tien ?? 0), 0)

  return (
    <Drawer
      title={ho ? `Chi tiết hộ — ${ho.ma_ho}` : 'Chi tiết hộ dân'}
      open={open}
      onClose={onClose}
      width={740}
      destroyOnClose
    >
      {isLoading && (
        <div style={{ textAlign: 'center', paddingTop: 60 }}>
          <Spin size="large" />
        </div>
      )}

      {ho && (
        <>
          {/* ── Thông tin cơ bản ─────────────────────────── */}
          <Descriptions bordered column={2} size="small" style={{ marginBottom: 20 }}>
            <Descriptions.Item label="Mã hộ">
              <strong>{ho.ma_ho}</strong>
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              <Badge
                status={
                  (HO_STATUS_COLORS[ho.status] ?? 'default') as
                    | 'default'
                    | 'processing'
                    | 'success'
                    | 'error'
                    | 'warning'
                }
                text={HO_STATUS_LABELS[ho.status] ?? ho.status}
              />
            </Descriptions.Item>

            <Descriptions.Item label="Tên chủ hộ / tổ chức" span={2}>
              <strong>{ho.ten_chu_ho}</strong>
            </Descriptions.Item>

            <Descriptions.Item label="Loại đối tượng">
              {ho.loai_doi_tuong === 'to_chuc'
                ? 'Tổ chức'
                : ho.loai_doi_tuong === 'ca_nhan'
                ? 'Cá nhân'
                : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Số điện thoại">
              {ho.so_dien_thoai || '—'}
            </Descriptions.Item>

            <Descriptions.Item label="Địa chỉ" span={2}>
              {ho.dia_chi || '—'}
            </Descriptions.Item>

            <Descriptions.Item label="CCCD / VNeID">{ho.cccd || '—'}</Descriptions.Item>
            {ho.loai_doi_tuong === 'to_chuc' ? (
              <Descriptions.Item label="ĐKKD / MST">{ho.dkkd_mst || '—'}</Descriptions.Item>
            ) : (
              <Descriptions.Item label="Ghi chú">{ho.ghi_chu || '—'}</Descriptions.Item>
            )}

            {ho.loai_doi_tuong === 'to_chuc' && ho.ghi_chu && (
              <Descriptions.Item label="Ghi chú" span={2}>
                {ho.ghi_chu}
              </Descriptions.Item>
            )}

            {ho.ly_do_kk && (
              <Descriptions.Item label="Lý do khó khăn" span={2}>
                <span style={{ color: '#cf1322' }}>{ho.ly_do_kk}</span>
              </Descriptions.Item>
            )}
          </Descriptions>

          {/* ── Thửa đất ─────────────────────────────────── */}
          <Divider orientation="left" style={{ marginBottom: 12, color: '#9B1B30' }}>
            Thông tin thửa đất ({dat.length} thửa)
          </Divider>

          {dat.length > 0 ? (
            <Table<HoDatInfo>
              columns={DAT_COLUMNS}
              dataSource={dat}
              rowKey="id"
              size="small"
              pagination={false}
              scroll={{ x: 580 }}
              summary={() => (
                <Table.Summary.Row style={{ background: '#fafafa' }}>
                  <Table.Summary.Cell index={0} colSpan={3}>
                    <strong>Tổng cộng</strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="right">
                    <strong>
                      {totalArea.toLocaleString('vi-VN', { maximumFractionDigits: 0 })} m²
                    </strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={2} />
                  <Table.Summary.Cell index={3} align="right">
                    <strong style={{ color: '#9B1B30' }}>
                      {(totalMoney / 1_000_000_000).toFixed(2)} tỷ
                    </strong>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              )}
            />
          ) : (
            <div style={{ color: '#aaa', textAlign: 'center', padding: '24px 0' }}>
              Chưa có thông tin thửa đất
            </div>
          )}
        </>
      )}
    </Drawer>
  )
}

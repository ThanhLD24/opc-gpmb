'use client'
import {
  Button, Descriptions, Empty, Form, Input, Modal,
  Spin, Table, Tabs, Tag, Typography, message,
} from 'antd'
import { CheckOutlined, CloseOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { ColumnsType } from 'antd/es/table'
import api from '@/lib/api'
import { getCurrentUser } from '@/lib/auth'
import { formatDate, formatVND } from '@/utils/format'

const { Title } = Typography

// ─── Types ────────────────────────────────────────────────────────────────────

interface PheDuyetItem {
  id: string
  ho_so_id: string
  ho_so_code: string
  ho_so_name: string
  ten_chu_ho: string
  tong_tien: number
  trang_thai: string
  trang_thai_label: string
  created_at: string
  updated_at: string
}

interface PheDuyetResponse {
  total: number
  page: number
  page_size: number
  tab: string
  items: PheDuyetItem[]
}

interface ChiTraDetail {
  id: string
  ho_so_id: string
  ho_id: string
  so_tien_bt: number | null
  so_tien_ht: number | null
  so_tien_tdc: number | null
  tong_so_tien: number
  ghi_chu: string | null
  status: string
  ly_do_tu_choi: string | null
  ngay_gui_duyet: string | null
  ngay_duyet: string | null
  created_at: string
  updated_at: string
  ho?: {
    ma_ho: string
    ten_chu_ho: string
  } | null
}

const TRANG_THAI_TAG_COLORS: Record<string, string> = {
  da_phe_duyet: 'green',
  bi_tu_choi: 'red',
  da_ban_giao: 'blue',
  cho_phe_duyet: 'orange',
}

// ─── ChiTra Detail Modal ──────────────────────────────────────────────────────

interface DetailModalProps {
  record: PheDuyetItem | null
  isChoPheDuyet: boolean
  onClose: () => void
}

function ChiTraDetailModal({ record, isChoPheDuyet, onClose }: DetailModalProps) {
  const queryClient = useQueryClient()
  const [tuChoiOpen, setTuChoiOpen] = useState(false)
  const [tuChoiForm] = Form.useForm<{ ly_do: string }>()

  const { data: detail, isLoading } = useQuery<ChiTraDetail>({
    queryKey: ['chi-tra-detail', record?.ho_so_id, record?.id],
    queryFn: async () => {
      const res = await api.get(`/ho-so/${record!.ho_so_id}/chi-tra/${record!.id}`)
      return res.data
    },
    enabled: !!record,
  })

  const approveMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/ho-so/${record!.ho_so_id}/chi-tra/${record!.id}/duyet`)
    },
    onSuccess: () => {
      message.success('Phê duyệt thành công')
      queryClient.invalidateQueries({ queryKey: ['phe-duyet'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      onClose()
    },
    onError: () => message.error('Phê duyệt thất bại'),
  })

  const rejectMutation = useMutation({
    mutationFn: async (ly_do: string) => {
      await api.post(`/ho-so/${record!.ho_so_id}/chi-tra/${record!.id}/tu-choi`, { ly_do })
    },
    onSuccess: () => {
      message.success('Từ chối thành công')
      setTuChoiOpen(false)
      tuChoiForm.resetFields()
      queryClient.invalidateQueries({ queryKey: ['phe-duyet'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      onClose()
    },
    onError: () => message.error('Từ chối thất bại'),
  })

  const handleClose = () => {
    setTuChoiOpen(false)
    tuChoiForm.resetFields()
    onClose()
  }

  const footer = isChoPheDuyet ? (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
      <Button onClick={handleClose}>Đóng</Button>
      <Button
        danger
        icon={<CloseOutlined />}
        loading={rejectMutation.isPending}
        onClick={() => setTuChoiOpen(true)}
      >
        Từ chối
      </Button>
      <Button
        type="primary"
        style={{ background: '#52c41a', borderColor: '#52c41a' }}
        icon={<CheckOutlined />}
        loading={approveMutation.isPending}
        onClick={() => approveMutation.mutate()}
      >
        Phê duyệt
      </Button>
    </div>
  ) : (
    <Button onClick={handleClose}>Đóng</Button>
  )

  return (
    <>
      <Modal
        title={`Chi tiết Chi trả — ${record?.ten_chu_ho ?? ''}`}
        open={!!record}
        onCancel={handleClose}
        footer={footer}
        width={620}
        destroyOnClose
      >
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <Spin />
          </div>
        ) : detail ? (
          <Descriptions bordered column={2} size="small" style={{ marginTop: 8 }}>
            <Descriptions.Item label="Hồ sơ" span={2}>
              <span style={{ fontWeight: 600, color: '#9B1B30' }}>{record?.ho_so_code}</span>
              {' — '}
              {record?.ho_so_name}
            </Descriptions.Item>
            <Descriptions.Item label="Tên chủ hộ" span={2}>
              {record?.ten_chu_ho}
            </Descriptions.Item>
            <Descriptions.Item label="Mã hộ">
              {detail.ho?.ma_ho ?? '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              <Tag color={TRANG_THAI_TAG_COLORS[detail.status] ?? 'default'}>
                {record?.trang_thai_label ?? detail.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Tiền bồi thường">
              {formatVND(detail.so_tien_bt)}
            </Descriptions.Item>
            <Descriptions.Item label="Tiền hỗ trợ">
              {formatVND(detail.so_tien_ht)}
            </Descriptions.Item>
            <Descriptions.Item label="Tiền tái định cư">
              {formatVND(detail.so_tien_tdc)}
            </Descriptions.Item>
            <Descriptions.Item label="Tổng chi trả">
              <span style={{ fontWeight: 600 }}>{formatVND(detail.tong_so_tien)}</span>
            </Descriptions.Item>
            <Descriptions.Item label="Ghi chú" span={2}>
              {detail.ghi_chu ?? '—'}
            </Descriptions.Item>
            {detail.ly_do_tu_choi && (
              <Descriptions.Item label="Lý do từ chối" span={2}>
                <span style={{ color: '#cf1322' }}>{detail.ly_do_tu_choi}</span>
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Ngày gửi duyệt">
              {formatDate(detail.ngay_gui_duyet)}
            </Descriptions.Item>
            <Descriptions.Item label="Ngày duyệt">
              {formatDate(detail.ngay_duyet)}
            </Descriptions.Item>
            <Descriptions.Item label="Ngày tạo">
              {formatDate(detail.created_at)}
            </Descriptions.Item>
            <Descriptions.Item label="Cập nhật lúc">
              {formatDate(detail.updated_at)}
            </Descriptions.Item>
          </Descriptions>
        ) : null}
      </Modal>

      {/* Từ chối sub-modal */}
      <Modal
        title="Lý do từ chối"
        open={tuChoiOpen}
        onCancel={() => { setTuChoiOpen(false); tuChoiForm.resetFields() }}
        footer={null}
        width={440}
      >
        <Form
          form={tuChoiForm}
          layout="vertical"
          onFinish={(v) => rejectMutation.mutate(v.ly_do)}
          style={{ marginTop: 12 }}
        >
          <Form.Item
            name="ly_do"
            label="Lý do từ chối"
            rules={[{ required: true, message: 'Vui lòng nhập lý do từ chối' }]}
          >
            <Input.TextArea rows={3} placeholder="Nhập lý do từ chối..." />
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => { setTuChoiOpen(false); tuChoiForm.resetFields() }}>Hủy</Button>
            <Button type="primary" danger htmlType="submit" loading={rejectMutation.isPending}>
              Từ chối
            </Button>
          </div>
        </Form>
      </Modal>
    </>
  )
}

// ─── Tab 1: Chờ phê duyệt ────────────────────────────────────────────────────

function ChoPheDuyetTab() {
  const [page, setPage] = useState(1)
  const [selectedRecord, setSelectedRecord] = useState<PheDuyetItem | null>(null)

  const { data, isLoading } = useQuery<PheDuyetResponse>({
    queryKey: ['phe-duyet', 'cho_phe_duyet', page],
    queryFn: async () => {
      const res = await api.get(`/phe-duyet?tab=cho_phe_duyet&page=${page}&page_size=20`)
      return res.data
    },
  })

  const columns: ColumnsType<PheDuyetItem> = [
    {
      title: 'STT',
      key: 'stt',
      width: 60,
      align: 'center',
      render: (_: unknown, __: PheDuyetItem, index: number) => (page - 1) * 20 + index + 1,
    },
    {
      title: 'Hồ sơ',
      key: 'ho_so',
      width: 220,
      render: (_: unknown, record: PheDuyetItem) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 12, color: '#9B1B30' }}>{record.ho_so_code}</div>
          <div style={{ fontSize: 12, color: '#555' }}>{record.ho_so_name}</div>
        </div>
      ),
    },
    {
      title: 'Tên hộ',
      dataIndex: 'ten_chu_ho',
      key: 'ten_chu_ho',
      ellipsis: true,
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'tong_tien',
      key: 'tong_tien',
      width: 160,
      align: 'right',
      render: (v: number) => formatVND(v),
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (v: string) => formatDate(v),
    },
  ]

  return (
    <div>
      {isLoading ? (
        <div style={{ padding: 48, textAlign: 'center' }}>
          <Spin />
        </div>
      ) : (data?.items?.length ?? 0) === 0 ? (
        <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #F0E8E8', padding: 48 }}>
          <Empty description="Không có chi trả nào chờ phê duyệt" />
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #F0E8E8' }}>
          <Table<PheDuyetItem>
            columns={columns}
            dataSource={data?.items ?? []}
            rowKey="id"
            loading={isLoading}
            pagination={{
              current: page,
              pageSize: 20,
              total: data?.total ?? 0,
              onChange: setPage,
              showTotal: (total) => `Tổng ${total} chi trả`,
              showSizeChanger: false,
            }}
            size="small"
            scroll={{ x: 800 }}
            onRow={(record) => ({
              onClick: () => setSelectedRecord(record),
              style: { cursor: 'pointer' },
            })}
          />
        </div>
      )}

      <ChiTraDetailModal
        record={selectedRecord}
        isChoPheDuyet
        onClose={() => setSelectedRecord(null)}
      />
    </div>
  )
}

// ─── Tab 2: Lịch sử ──────────────────────────────────────────────────────────

function LichSuTab() {
  const [page, setPage] = useState(1)
  const [selectedRecord, setSelectedRecord] = useState<PheDuyetItem | null>(null)

  const { data, isLoading } = useQuery<PheDuyetResponse>({
    queryKey: ['phe-duyet', 'lich_su', page],
    queryFn: async () => {
      const res = await api.get(`/phe-duyet?tab=lich_su&page=${page}&page_size=20`)
      return res.data
    },
  })

  const columns: ColumnsType<PheDuyetItem> = [
    {
      title: 'STT',
      key: 'stt',
      width: 60,
      align: 'center',
      render: (_: unknown, __: PheDuyetItem, index: number) => (page - 1) * 20 + index + 1,
    },
    {
      title: 'Hồ sơ',
      key: 'ho_so',
      width: 220,
      render: (_: unknown, record: PheDuyetItem) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 12, color: '#9B1B30' }}>{record.ho_so_code}</div>
          <div style={{ fontSize: 12, color: '#555' }}>{record.ho_so_name}</div>
        </div>
      ),
    },
    {
      title: 'Tên hộ',
      dataIndex: 'ten_chu_ho',
      key: 'ten_chu_ho',
      ellipsis: true,
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'tong_tien',
      key: 'tong_tien',
      width: 160,
      align: 'right',
      render: (v: number) => formatVND(v),
    },
    {
      title: 'Trạng thái',
      key: 'trang_thai',
      width: 140,
      render: (_: unknown, record: PheDuyetItem) => (
        <Tag color={TRANG_THAI_TAG_COLORS[record.trang_thai] ?? 'default'}>
          {record.trang_thai_label}
        </Tag>
      ),
    },
    {
      title: 'Ngày cập nhật',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 120,
      render: (v: string) => formatDate(v),
    },
  ]

  return (
    <div>
      <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #F0E8E8' }}>
        <Table<PheDuyetItem>
          columns={columns}
          dataSource={data?.items ?? []}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: page,
            pageSize: 20,
            total: data?.total ?? 0,
            onChange: setPage,
            showTotal: (total) => `Tổng ${total} chi trả`,
            showSizeChanger: false,
          }}
          size="small"
          scroll={{ x: 900 }}
          onRow={(record) => ({
            onClick: () => setSelectedRecord(record),
            style: { cursor: 'pointer' },
          })}
          locale={{ emptyText: 'Chưa có lịch sử phê duyệt' }}
        />
      </div>

      <ChiTraDetailModal
        record={selectedRecord}
        isChoPheDuyet={false}
        onClose={() => setSelectedRecord(null)}
      />
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PheDuyetPage() {
  const router = useRouter()
  const [user, setUser] = useState<ReturnType<typeof getCurrentUser>>(null)

  useEffect(() => {
    const u = getCurrentUser()
    if (!u || !['gddh', 'admin'].includes(u.role)) {
      router.replace('/dashboard')
    } else {
      setUser(u)
    }
  }, [router])

  if (!user || !['gddh', 'admin'].includes(user.role)) return null

  const tabItems = [
    {
      key: 'cho_phe_duyet',
      label: 'Chờ duyệt',
      children: <ChoPheDuyetTab />,
    },
    {
      key: 'lich_su',
      label: 'Lịch sử',
      children: <LichSuTab />,
    },
  ]

  return (
    <div>
      <Tabs defaultActiveKey="cho_phe_duyet" items={tabItems} />
    </div>
  )
}

'use client'
import {
  Card, Statistic, Table, Tag, Typography, Spin, Progress, Row, Col, Button, Skeleton,
} from 'antd'
import {
  FileTextOutlined, TeamOutlined, DollarOutlined, ClockCircleOutlined,
} from '@ant-design/icons'
import { useQuery, useQueries } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import type { ColumnsType } from 'antd/es/table'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import dayjs from 'dayjs'
import api from '@/lib/api'
import { HO_SO_STATUS_LABELS, HO_SO_STATUS_COLORS } from '@/utils/constants'
import { formatDate } from '@/utils/format'

const { Title } = Typography

interface DashboardStats {
  ho_so: {
    total: number
    by_status: Record<string, number>
  }
  ho: {
    total: number
    by_status: Record<string, number>
  }
  chi_tra: {
    total_records: number
    tong_da_phe_duyet: number
    tong_cho_duyet: number
    by_status: Record<string, number>
  }
  recent_ho_so: Array<{
    id: string
    code: string
    name: string
    status: string
    created_at: string
  }>
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} tỷ đ`
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} triệu đ`
  }
  return `${value.toLocaleString('vi-VN')} đ`
}

// Short suffix formatter for Y axis (triệu / tỷ)
function formatAxisShort(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} tỷ`
  if (value >= 1_000_000) return `${Math.round(value / 1_000_000)} tr`
  if (value >= 1_000) return `${Math.round(value / 1_000)} k`
  return `${value}`
}

const HO_STATUS_VI: Record<string, string> = {
  moi: 'Mới',
  dang_xu_ly: 'Đang xử lý',
  da_thong_nhat: 'Đã thống nhất',
  da_chi_tra: 'Đã chi trả',
  da_ban_giao: 'Đã bàn giao',
}

const HO_STATUS_COLORS_CHART: Record<string, string> = {
  moi: '#d9d9d9',
  dang_xu_ly: '#1677ff',
  da_thong_nhat: '#faad14',
  da_chi_tra: '#52c41a',
  da_ban_giao: '#389e0d',
}

// S4-FE-02: Pie chart palette — Agribank red + neutral grays / accent
const PIE_PALETTE = ['#9B1B30', '#6B6B6B', '#B5B5B5', '#C97A86', '#D9D9D9']

// Build the last 6 months as YYYY-MM (oldest -> newest)
function lastSixMonths(): Array<{ key: string; label: string; tu: string; den: string }> {
  const months: Array<{ key: string; label: string; tu: string; den: string }> = []
  const now = dayjs()
  for (let i = 5; i >= 0; i--) {
    const m = now.subtract(i, 'month')
    months.push({
      key: m.format('YYYY-MM'),
      label: m.format('MM/YYYY'),
      tu: m.startOf('month').format('YYYY-MM-DD'),
      den: m.endOf('month').format('YYYY-MM-DD'),
    })
  }
  return months
}

export default function DashboardPage() {
  const router = useRouter()

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await api.get('/dashboard/stats')
      return res.data
    },
    staleTime: 0,
  })

  // S4-FE-02: client-side fallback — fetch /reports/chi-tra 6 times (one per month)
  // to build "Chi trả đã duyệt theo tháng" Bar chart. Filter by status=da_phe_duyet
  // to count only approved-and-not-yet-handed-over records, plus da_ban_giao to include
  // approved-then-handed-over. Use tong_da_chi_tra aggregate which already sums both.
  const months = lastSixMonths()
  const monthlyQueries = useQueries({
    queries: months.map((m) => ({
      queryKey: ['monthly-chi-tra', m.key],
      queryFn: async () => {
        const params = new URLSearchParams({
          tu_ngay: m.tu,
          den_ngay: m.den,
          page: '1',
          page_size: '1',
        })
        const res = await api.get(`/reports/chi-tra?${params}`)
        return res.data as { tong_da_chi_tra: number }
      },
      staleTime: 60_000,
    })),
  })

  const monthlyLoading = monthlyQueries.some((q) => q.isLoading)
  const monthlyData = months.map((m, idx) => ({
    month: m.label,
    tong: monthlyQueries[idx].data?.tong_da_chi_tra ?? 0,
  }))
  const monthlyHasData = monthlyData.some((d) => d.tong > 0)

  const recentColumns: ColumnsType<DashboardStats['recent_ho_so'][number]> = [
    {
      title: 'Mã hồ sơ',
      dataIndex: 'code',
      key: 'code',
      width: 160,
    },
    {
      title: 'Tên công trình',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (s: string) => (
        <Tag color={HO_SO_STATUS_COLORS[s] || 'default'}>
          {HO_SO_STATUS_LABELS[s] || s}
        </Tag>
      ),
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 110,
      render: (d: string) => formatDate(d),
    },
    {
      title: '',
      key: 'action',
      width: 80,
      render: (_: unknown, record: DashboardStats['recent_ho_so'][number]) => (
        <Button
          type="link"
          size="small"
          onClick={() => router.push(`/ho-so-gpmb/${record.id}`)}
        >
          Chi tiết
        </Button>
      ),
    },
  ]

  if (isLoading) {
    return <Spin style={{ display: 'block', margin: '80px auto' }} />
  }

  const hoByStatus = stats?.ho.by_status || {}
  const totalHo = stats?.ho.total || 0
  const daBanGiao = hoByStatus['da_ban_giao'] || 0
  const choXuLy = (hoByStatus['moi'] || 0) + (hoByStatus['dang_xu_ly'] || 0)

  // S4-FE-02: Build Pie chart data from ho.by_status
  const pieData = Object.entries(hoByStatus)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({
      name: HO_STATUS_VI[status] || status,
      value: count,
      key: status,
    }))

  return (
    <div>
      <Title level={4} style={{ marginBottom: 20 }}>Tổng quan GPMB</Title>

      {/* Row 1: Statistic cards — equal height, clickable */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} lg={6} style={{ display: 'flex' }}>
          <Card style={{ width: '100%' }} hoverable onClick={() => router.push('/ho-so-gpmb')}>
            <Statistic
              title="Tổng hồ sơ GPMB"
              value={stats?.ho_so.total ?? 0}
              prefix={<FileTextOutlined style={{ color: '#9B1B30' }} />}
              suffix="hồ sơ"
              valueStyle={{ color: '#9B1B30' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6} style={{ display: 'flex' }}>
          <Card style={{ width: '100%' }} hoverable onClick={() => router.push('/ho-dan')}>
            <Statistic
              title="Hộ đã bàn giao"
              value={daBanGiao}
              prefix={<TeamOutlined style={{ color: '#389e0d' }} />}
              suffix={`/ ${totalHo} hộ`}
              valueStyle={{ color: '#389e0d' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6} style={{ display: 'flex' }}>
          <Card style={{ width: '100%' }} hoverable onClick={() => router.push('/bao-cao')}>
            <Statistic
              title="Tổng chi trả đã duyệt"
              value={formatCurrency(stats?.chi_tra.tong_da_phe_duyet ?? 0)}
              prefix={<DollarOutlined style={{ color: '#1677ff' }} />}
              valueStyle={{ color: '#1677ff', fontSize: 18 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6} style={{ display: 'flex' }}>
          <Card style={{ width: '100%' }} hoverable onClick={() => router.push('/ho-dan?trang_thai=moi')}>
            <Statistic
              title="Hộ chờ xử lý"
              value={choXuLy}
              prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
              suffix="hộ"
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Row 2: Ho by status — equal height */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} lg={12} style={{ display: 'flex' }}>
          <Card title="Hộ theo trạng thái" size="small" style={{ width: '100%' }}>
            {totalHo === 0 ? (
              <div style={{ textAlign: 'center', color: '#999', padding: 24 }}>Chưa có dữ liệu</div>
            ) : (
              <div style={{ padding: '8px 0' }}>
                {Object.entries(hoByStatus).map(([status, count]) => {
                  const percent = totalHo > 0 ? Math.round((count / totalHo) * 100) : 0
                  return (
                    <div key={status} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 13 }}>{HO_STATUS_VI[status] || status}</span>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>
                          {count.toLocaleString('vi-VN')} hộ ({percent}%)
                        </span>
                      </div>
                      <Progress
                        percent={percent}
                        showInfo={false}
                        strokeColor={HO_STATUS_COLORS_CHART[status] || '#9B1B30'}
                        size="small"
                      />
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12} style={{ display: 'flex' }}>
          <Card title="Chi trả tổng hợp" size="small" style={{ width: '100%' }}>
            <div style={{ padding: '8px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <span style={{ color: '#52c41a', fontWeight: 500 }}>Đã phê duyệt:</span>
                <span style={{ fontWeight: 700, color: '#52c41a' }}>
                  {formatCurrency(stats?.chi_tra.tong_da_phe_duyet ?? 0)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <span style={{ color: '#faad14', fontWeight: 500 }}>Đang chờ duyệt:</span>
                <span style={{ fontWeight: 700, color: '#faad14' }}>
                  {formatCurrency(stats?.chi_tra.tong_cho_duyet ?? 0)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6B6B6B', fontWeight: 500 }}>Tổng hồ sơ chi trả:</span>
                <span style={{ fontWeight: 600 }}>
                  {(stats?.chi_tra.total_records ?? 0).toLocaleString('vi-VN')} hồ sơ
                </span>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Row 2.5 (S4-FE-02): Bar chart + Pie chart */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} md={12}>
          <Card title="Chi trả đã duyệt theo tháng (6 tháng gần nhất)" size="small">
            {monthlyLoading ? (
              <Skeleton active paragraph={{ rows: 6 }} />
            ) : !monthlyHasData ? (
              <div style={{ textAlign: 'center', color: '#999', padding: 48 }}>Chưa có dữ liệu</div>
            ) : (
              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={formatAxisShort} tick={{ fontSize: 12 }} width={60} />
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value), 'Đã duyệt']}
                      cursor={{ fill: 'rgba(155, 27, 48, 0.06)' }}
                    />
                    <Bar dataKey="tong" fill="#9B1B30" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Phân bố hộ theo trạng thái" size="small">
            {totalHo === 0 || pieData.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#999', padding: 48 }}>Chưa có dữ liệu</div>
            ) : (
              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={({ percent }) => `${Math.round((percent ?? 0) * 100)}%`}
                      labelLine={false}
                    >
                      {pieData.map((entry, idx) => (
                        <Cell
                          key={entry.key}
                          fill={HO_STATUS_COLORS_CHART[entry.key] || PIE_PALETTE[idx % PIE_PALETTE.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [`${value.toLocaleString('vi-VN')} hộ`, 'Số hộ']} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* Row 3: Recent ho so */}
      <Card title="5 Hồ sơ GPMB gần nhất" size="small">
        <Table
          columns={recentColumns}
          dataSource={stats?.recent_ho_so || []}
          rowKey="id"
          pagination={false}
          size="small"
          locale={{ emptyText: 'Chưa có hồ sơ' }}
        />
      </Card>
    </div>
  )
}

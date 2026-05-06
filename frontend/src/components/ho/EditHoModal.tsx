'use client'
import { Modal, Form, Input, InputNumber, Button, notification, Select, Space } from 'antd'
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import api from '@/lib/api'
import { Ho } from '@/types'

interface Props {
  hoSoId: string
  ho: Ho | null
  open: boolean
  onClose: () => void
}

// Vietnamese land type catalog (Luật Đất đai 2013/2024)
const LOAI_DAT_OPTIONS = [
  { value: 'LUC', label: 'LUC — Đất trồng lúa nước' },
  { value: 'LNC', label: 'LNC — Đất trồng lúa nương' },
  { value: 'BHK', label: 'BHK — Đất bằng trồng cây hàng năm khác' },
  { value: 'NHK', label: 'NHK — Đất nương rẫy trồng cây hàng năm khác' },
  { value: 'CLN', label: 'CLN — Đất trồng cây lâu năm' },
  { value: 'RSX', label: 'RSX — Đất rừng sản xuất' },
  { value: 'RPH', label: 'RPH — Đất rừng phòng hộ' },
  { value: 'RDD', label: 'RDD — Đất rừng đặc dụng' },
  { value: 'NTS', label: 'NTS — Đất nuôi trồng thủy sản' },
  { value: 'LMU', label: 'LMU — Đất làm muối' },
  { value: 'NKH', label: 'NKH — Đất nông nghiệp khác' },
  { value: 'ONT', label: 'ONT — Đất ở tại nông thôn' },
  { value: 'ODT', label: 'ODT — Đất ở tại đô thị' },
  { value: 'TSC', label: 'TSC — Đất xây dựng trụ sở cơ quan' },
  { value: 'DTS', label: 'DTS — Đất xây dựng trụ sở tổ chức sự nghiệp' },
  { value: 'SKC', label: 'SKC — Đất cơ sở sản xuất phi nông nghiệp' },
  { value: 'SKS', label: 'SKS — Đất sử dụng cho hoạt động khoáng sản' },
  { value: 'CSD', label: 'CSD — Đất sử dụng vào mục đích công cộng' },
  { value: 'TIN', label: 'TIN — Đất tín ngưỡng' },
  { value: 'TON', label: 'TON — Đất tôn giáo' },
  { value: 'NTD', label: 'NTD — Đất nghĩa trang, nghĩa địa' },
  { value: 'MNC', label: 'MNC — Đất có mặt nước chuyên dùng' },
  { value: 'PNK', label: 'PNK — Đất phi nông nghiệp khác' },
  { value: 'DCS', label: 'DCS — Đất chưa sử dụng' },
]

const LOAI_DOI_TUONG_OPTIONS = [
  { value: 'ca_nhan', label: 'Cá nhân' },
  { value: 'to_chuc', label: 'Tổ chức' },
]

export default function EditHoModal({ hoSoId, ho, open, onClose }: Props) {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const loaiDoiTuong = Form.useWatch('loai_doi_tuong', form)

  useEffect(() => {
    if (open && ho) {
      form.setFieldsValue({
        ma_ho: ho.ma_ho,
        ten_chu_ho: ho.ten_chu_ho,
        loai_doi_tuong: ho.loai_doi_tuong,
        dia_chi: ho.dia_chi,
        so_dien_thoai: ho.so_dien_thoai,
        thua: ho.thua,
        so_to_ban_do: ho.so_to_ban_do,
        dien_tich: ho.dien_tich,
        ty_le_thu_hoi: ho.ty_le_thu_hoi,
        cccd: ho.cccd,
        dkkd_mst: ho.dkkd_mst,
        ghi_chu: ho.ghi_chu,
        dat_info: ho.dat_info?.length
          ? ho.dat_info.map(d => ({ loai_dat: d.loai_dat, so_tien: d.so_tien, ghi_chu: d.ghi_chu }))
          : [],
      })
    }
  }, [open, ho, form])

  const updateMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const res = await api.patch(`/ho-so/${hoSoId}/ho/${ho!.id}`, values)
      return res.data
    },
    onSuccess: () => {
      notification.success({ message: 'Cập nhật hộ thành công' })
      queryClient.invalidateQueries({ queryKey: ['ho', hoSoId] })
      onClose()
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { detail?: string } } }
      notification.error({ message: e.response?.data?.detail || 'Cập nhật thất bại' })
    },
  })

  const handleClose = () => {
    form.resetFields()
    onClose()
  }

  return (
    <Modal
      title="Sửa thông tin hộ"
      open={open}
      onCancel={handleClose}
      footer={null}
      width={700}
      styles={{ body: { maxHeight: '75vh', overflowY: 'auto', paddingRight: 8 } }}
    >
      <Form form={form} layout="vertical" onFinish={(values) => updateMutation.mutate(values)}>

        {/* Row 1: Mã hộ + Loại đối tượng */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Form.Item name="ma_ho" label="Mã hộ / tổ chức" rules={[{ required: true, message: 'Nhập mã hộ' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="loai_doi_tuong" label="Loại đối tượng">
            <Select options={LOAI_DOI_TUONG_OPTIONS} placeholder="Chọn loại" allowClear />
          </Form.Item>
        </div>

        {/* Tên */}
        <Form.Item name="ten_chu_ho" label="Tên chủ hộ / tổ chức" rules={[{ required: true, message: 'Nhập tên' }]}>
          <Input />
        </Form.Item>

        {/* Địa chỉ */}
        <Form.Item name="dia_chi" label="Địa chỉ">
          <Input />
        </Form.Item>

        {/* Row: SĐT + CCCD */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Form.Item name="so_dien_thoai" label="Số điện thoại">
            <Input />
          </Form.Item>
          <Form.Item name="cccd" label="CCCD / VNeID">
            <Input />
          </Form.Item>
        </div>

        {/* ĐKKD/MST — chỉ hiện nếu loại đối tượng là tổ chức */}
        {loaiDoiTuong === 'to_chuc' && (
          <Form.Item name="dkkd_mst" label="Số ĐKKD / MST">
            <Input />
          </Form.Item>
        )}

        {/* Row: Số thửa + Số tờ bản đồ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Form.Item name="thua" label="Số thửa">
            <Input />
          </Form.Item>
          <Form.Item name="so_to_ban_do" label="Số tờ bản đồ">
            <Input />
          </Form.Item>
        </div>

        {/* Row: Diện tích + Tỷ lệ thu hồi */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Form.Item name="dien_tich" label="Diện tích thu hồi (m²)">
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item name="ty_le_thu_hoi" label="Tỷ lệ thu hồi (%)">
            <InputNumber style={{ width: '100%' }} min={0} max={100} step={0.1} />
          </Form.Item>
        </div>

        {/* Ghi chú */}
        <Form.Item name="ghi_chu" label="Ghi chú">
          <Input.TextArea rows={2} />
        </Form.Item>

        {/* Thông tin loại đất */}
        <div style={{ marginBottom: 8, fontWeight: 500 }}>Thông tin loại đất</div>
        <Form.List name="dat_info">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }) => (
                <div key={key} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr auto', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
                  <Form.Item
                    {...restField}
                    name={[name, 'loai_dat']}
                    rules={[{ required: true, message: 'Chọn loại đất' }]}
                    style={{ marginBottom: 0 }}
                  >
                    <Select
                      options={LOAI_DAT_OPTIONS}
                      placeholder="Loại đất"
                      showSearch
                      optionFilterProp="label"
                    />
                  </Form.Item>
                  <Form.Item
                    {...restField}
                    name={[name, 'so_tien']}
                    style={{ marginBottom: 0 }}
                  >
                    <InputNumber style={{ width: '100%' }} placeholder="Số tiền (VNĐ)" min={0} step={1000000} />
                  </Form.Item>
                  <Form.Item
                    {...restField}
                    name={[name, 'ghi_chu']}
                    style={{ marginBottom: 0 }}
                  >
                    <Input placeholder="Ghi chú" />
                  </Form.Item>
                  <Button
                    type="text"
                    danger
                    icon={<MinusCircleOutlined />}
                    onClick={() => remove(name)}
                    style={{ marginTop: 4 }}
                  />
                </div>
              ))}
              <Button
                type="dashed"
                onClick={() => add()}
                icon={<PlusOutlined />}
                style={{ width: '100%', marginBottom: 16 }}
              >
                Thêm loại đất
              </Button>
            </>
          )}
        </Form.List>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <Button onClick={handleClose}>Hủy</Button>
          <Button type="primary" htmlType="submit" loading={updateMutation.isPending}>Lưu thay đổi</Button>
        </div>
      </Form>
    </Modal>
  )
}

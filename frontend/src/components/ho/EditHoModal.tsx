'use client'
import { Modal, Form, Input, InputNumber, Button, notification, Select, Divider } from 'antd'
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

export const LOAI_DAT_OPTIONS = [
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

export const LOAI_DOI_TUONG_OPTIONS = [
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
        cccd: ho.cccd,
        dkkd_mst: ho.dkkd_mst,
        ghi_chu: ho.ghi_chu,
        dat_info: ho.dat_info?.length
          ? ho.dat_info.map(d => ({
              loai_dat: d.loai_dat,
              so_thua: d.so_thua,
              so_to_ban_do: d.so_to_ban_do,
              dien_tich: d.dien_tich,
              ty_le_thu_hoi: d.ty_le_thu_hoi,
              so_tien: d.so_tien,
              ghi_chu: d.ghi_chu,
            }))
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
      width={720}
      styles={{ body: { maxHeight: '78vh', overflowY: 'auto', paddingRight: 8 } }}
    >
      <Form form={form} layout="vertical" onFinish={(values) => updateMutation.mutate(values)}>

        {/* ── Thông tin hộ ────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Form.Item name="ma_ho" label="Mã hộ / tổ chức" rules={[{ required: true, message: 'Nhập mã hộ' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="loai_doi_tuong" label="Loại đối tượng">
            <Select options={LOAI_DOI_TUONG_OPTIONS} placeholder="Chọn loại" allowClear />
          </Form.Item>
        </div>

        <Form.Item name="ten_chu_ho" label="Tên chủ hộ / tổ chức" rules={[{ required: true, message: 'Nhập tên' }]}>
          <Input />
        </Form.Item>

        <Form.Item name="dia_chi" label="Địa chỉ">
          <Input />
        </Form.Item>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Form.Item name="so_dien_thoai" label="Số điện thoại">
            <Input />
          </Form.Item>
          <Form.Item name="cccd" label="CCCD / VNeID">
            <Input />
          </Form.Item>
        </div>

        {loaiDoiTuong === 'to_chuc' && (
          <Form.Item name="dkkd_mst" label="Số ĐKKD / MST">
            <Input />
          </Form.Item>
        )}

        <Form.Item name="ghi_chu" label="Ghi chú">
          <Input.TextArea rows={2} />
        </Form.Item>

        {/* ── Thông tin thửa đất ──────────────────────────────── */}
        <Divider orientation="left" style={{ marginTop: 4 }}>Thông tin thửa đất</Divider>

        <Form.List name="dat_info">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }) => (
                <div
                  key={key}
                  style={{
                    border: '1px solid #f0f0f0',
                    borderRadius: 8,
                    padding: '12px 12px 4px',
                    marginBottom: 12,
                    background: '#fafafa',
                    position: 'relative',
                  }}
                >
                  {/* Row 1: Loại đất + Số thửa + Số tờ BĐ */}
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10 }}>
                    <Form.Item
                      {...restField}
                      name={[name, 'loai_dat']}
                      label="Loại đất"
                      rules={[{ required: true, message: 'Chọn loại đất' }]}
                      style={{ marginBottom: 10 }}
                    >
                      <Select
                        options={LOAI_DAT_OPTIONS}
                        placeholder="Chọn loại đất"
                        showSearch
                        optionFilterProp="label"
                      />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'so_thua']} label="Số thửa" style={{ marginBottom: 10 }}>
                      <Input placeholder="VD: 123" />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'so_to_ban_do']} label="Số tờ bản đồ" style={{ marginBottom: 10 }}>
                      <Input placeholder="VD: 05" />
                    </Form.Item>
                  </div>

                  {/* Row 2: Diện tích + Tỷ lệ + Số tiền */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                    <Form.Item {...restField} name={[name, 'dien_tich']} label="Diện tích thu hồi (m²)" style={{ marginBottom: 10 }}>
                      <InputNumber style={{ width: '100%' }} min={0} placeholder="m²" />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'ty_le_thu_hoi']} label="Tỷ lệ thu hồi (%)" style={{ marginBottom: 10 }}>
                      <InputNumber style={{ width: '100%' }} min={0} max={100} step={0.1} placeholder="%" />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'so_tien']} label="Số tiền bồi thường (VNĐ)" style={{ marginBottom: 10 }}>
                      <InputNumber style={{ width: '100%' }} min={0} step={1000000} placeholder="VNĐ" />
                    </Form.Item>
                  </div>

                  {/* Row 3: Ghi chú + nút xóa */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'flex-start' }}>
                    <Form.Item {...restField} name={[name, 'ghi_chu']} label="Ghi chú" style={{ marginBottom: 10 }}>
                      <Input placeholder="Ghi chú cho thửa đất này" />
                    </Form.Item>
                    <Button
                      type="text"
                      danger
                      icon={<MinusCircleOutlined />}
                      onClick={() => remove(name)}
                      style={{ marginTop: 30 }}
                    >
                      Xóa
                    </Button>
                  </div>
                </div>
              ))}

              <Button
                type="dashed"
                onClick={() => add()}
                icon={<PlusOutlined />}
                style={{ width: '100%', marginBottom: 16 }}
              >
                Thêm thửa đất
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

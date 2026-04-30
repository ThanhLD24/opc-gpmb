export const HO_SO_STATUS_LABELS: Record<string, string> = {
  chuan_bi: 'Chuẩn bị',
  thuc_hien: 'Thực hiện',
  hoan_thanh: 'Hoàn thành',
}

export const HO_SO_STATUS_COLORS: Record<string, string> = {
  chuan_bi: 'default',
  thuc_hien: 'processing',
  hoan_thanh: 'success',
}

export const HO_STATUS_LABELS: Record<string, string> = {
  moi: 'Mới',
  dang_xu_ly: 'Đang xử lý',
  da_thong_nhat: 'Đã thống nhất phương án',
  da_chi_tra: 'Đã chi trả',
  da_ban_giao: 'Đã bàn giao mặt bằng',
}

export const HO_STATUS_COLORS: Record<string, string> = {
  moi: 'default',
  dang_xu_ly: 'processing',
  da_thong_nhat: 'warning',
  da_chi_tra: 'success',
  da_ban_giao: 'green',
}

export const TASK_STATUS_LABELS: Record<string, string> = {
  dang_thuc_hien: 'Đang thực hiện',
  hoan_thanh: 'Hoàn thành',
}

export const CHI_TRA_STATUS_LABELS: Record<string, string> = {
  da_tao: 'Đã tạo',
  cho_phe_duyet: 'Chờ phê duyệt',
  da_phe_duyet: 'Đã phê duyệt',
  bi_tu_choi: 'Bị từ chối',
  da_ban_giao: 'Đã bàn giao',
}

export const CHI_TRA_STATUS_COLORS: Record<string, string> = {
  da_tao: 'default',
  cho_phe_duyet: 'processing',
  da_phe_duyet: 'success',
  bi_tu_choi: 'error',
  da_ban_giao: 'green',
}

export const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  cbcq: 'Cán bộ chuyên quản',
  ke_toan: 'Kế toán',
  gddh: 'Giám đốc điều hành',
}

export const LOAI_VB_OPTIONS = [
  { value: 'thong_bao', label: 'Thông báo' },
  { value: 'quyet_dinh', label: 'Quyết định' },
  { value: 'bien_ban', label: 'Biên bản' },
  { value: 'to_trinh', label: 'Tờ trình' },
  { value: 'khac', label: 'Khác' },
]

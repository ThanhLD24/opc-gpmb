export type Role = 'admin' | 'cbcq' | 'ke_toan' | 'gddh'
export type HoSoStatus = 'chuan_bi' | 'thuc_hien' | 'hoan_thanh'
export type HoStatus = 'moi' | 'dang_xu_ly' | 'da_thong_nhat' | 'da_chi_tra' | 'da_ban_giao'
export type TaskStatus = 'dang_thuc_hien' | 'hoan_thanh'
export type ChiTraStatus = 'da_tao' | 'cho_phe_duyet' | 'da_phe_duyet' | 'bi_tu_choi' | 'da_ban_giao'

export interface User {
  id: string
  username: string
  full_name: string
  role: Role
}

export interface WorkflowNodeDocument {
  id: string
  ten_tai_lieu: string
  url: string
  uploaded_at: string
}

export interface TaskAttachment {
  id: string
  ten_tai_lieu: string
  url: string
  uploaded_at: string
}

export interface WorkflowNode {
  id: string
  parent_id: string | null
  code: string | null
  name: string
  level: number
  order: number
  per_household: boolean
  field_so_vb: boolean
  field_ngay_vb: boolean
  field_loai_vb: boolean
  field_gia_tri_trinh: boolean
  field_gia_tri_duyet: boolean
  field_ghi_chu: boolean
  require_scan: boolean
  planned_days: number | null
  is_milestone: boolean
  legal_basis: string | null
  org_in_charge: string | null
  documents?: WorkflowNodeDocument[]
  children?: WorkflowNode[]
}

export interface HoSo {
  id: string
  code: string
  name: string
  dia_chi: string | null
  cbcq?: User
  status: HoSoStatus
  so_ho: number
  ngay_bat_dau: string | null
  ngay_ket_thuc: string | null
  created_at: string
}

export interface Ho {
  id: string
  ho_so_id: string
  ma_ho: string
  loai_dat: string | null
  ten_chu_ho: string
  dia_chi: string | null
  thua: string | null
  dien_tich: number | null
  status: HoStatus
  ly_do_kk: string | null
}

export interface TaskInstance {
  id: string
  node_id: string
  ho_id: string | null
  ho?: Ho
  status: TaskStatus
  code: string | null
  name: string
  level: number
  per_household: boolean
  is_leaf: boolean
  completed_count: number
  total_count: number
  so_vb?: string | null
  ngay_vb?: string | null
  loai_vb?: string | null
  gia_tri_trinh?: number | null
  gia_tri_duyet?: number | null
  ghi_chu?: string | null
  file_scan_url?: string | null
  completed_at?: string | null
  field_so_vb: boolean
  field_ngay_vb: boolean
  field_loai_vb: boolean
  field_gia_tri_trinh: boolean
  field_gia_tri_duyet: boolean
  field_ghi_chu: boolean
  require_scan: boolean
  node_documents?: WorkflowNodeDocument[]
  attachments?: TaskAttachment[]
  children?: TaskInstance[]
}

export interface ChiTra {
  id: string
  ho_so_id: string
  ho_id: string
  ho: Ho | null
  so_tien_bt: number | null
  so_tien_ht: number | null
  so_tien_tdc: number | null
  tong_so_tien: number
  ghi_chu: string | null
  status: ChiTraStatus
  ly_do_tu_choi: string | null
  ke_toan_id: string | null
  gddh_id: string | null
  ngay_gui_duyet: string | null
  ngay_duyet: string | null
  ngay_ban_giao_mat_bang: string | null
  created_at: string
  updated_at: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

export interface PivotRow {
  ho: Ho
  tasks: Record<string, TaskStatus>
}

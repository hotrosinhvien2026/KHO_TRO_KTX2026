// Kiểu dữ liệu phản ánh schema.sql. Dùng cho supabase-js generic.

export type UserRole = 'admin' | 'ctv'
export type KhuVuc = 'Linh Chiểu' | 'Linh Trung' | 'Linh Đông' | 'Trường Thọ'
export type LoaiPhong = 'Đơn' | 'Đôi' | 'Studio' | 'Ghép' | 'Duplex' | 'Khác'
export type TrangThaiPhong = 'con_phong' | 'giu_cho' | 'sold_out'
export type TrangThaiKtx = 'con_cho' | 'giu_cho' | 'het_cho'
export type TrangThaiLead = 'moi' | 'dang_tu_van' | 'da_chot' | 'tu_choi'
export type DoiTuongKtx = 'Nam' | 'Nữ' | 'Nam + Nữ'

export interface Profile {
  id: string
  full_name: string | null
  role: UserRole
  phone: string | null
  created_at: string
}

export interface ChuNha {
  id: string
  ten_chu: string
  sdt: string | null
  zalo: string | null
  ghi_chu_hop_tac: string | null
  created_at: string
}

export interface KhuTro {
  id: string
  ten_khu_tro: string
  dia_chi: string | null
  khu_vuc: KhuVuc | null
  chu_nha_id: string | null
  gia_dien: number | null
  gia_nuoc: number | null
  cac_phi_khac: string | null
  link_anh: string | null
  ghi_chu_chung: string | null
  created_at: string
}

export interface Phong {
  id: string
  khu_tro_id: string
  so_phong: string
  loai_phong: LoaiPhong | null
  dien_tich: number | null
  gia: number | null
  coc_thang: number | null
  co_wc_rieng: boolean
  co_gac_lung: boolean
  co_may_lanh: boolean
  phu_phi_may_lanh: number | null
  co_may_nong_lanh: boolean
  co_tu_lanh: boolean
  co_wifi: boolean
  co_giu_xe: boolean
  co_bep: boolean
  trang_thai: TrangThaiPhong
  ctv_phu_trach: string | null
  ghi_chu: string | null
  link_anh: string | null
  ngay_cap_nhat: string
}

export interface Ktx {
  id: string
  ma_ktx: string | null
  ten_ktx: string
  dia_chi: string | null
  khu_vuc: KhuVuc | null
  chu_nha_id: string | null
  gia_tu: number | null
  gia_den: number | null
  so_slot_trong: number | null
  ghi_chu_slot: string | null
  doi_tuong: DoiTuongKtx | null
  tien_ich: string | null
  coc_thang: number | null
  trang_thai: TrangThaiKtx
  link_anh: string | null
  ctv_phu_trach: string | null
  ngay_cap_nhat: string
}

export interface Lead {
  id: string
  ten_khach: string
  sdt_khach: string | null
  ngan_sach: number | null
  khu_vuc_mong_muon: string | null
  yeu_cau: string | null
  trang_thai: TrangThaiLead
  ctv_phu_trach: string | null
  ket_qua: string | null
  ngay_tao: string
}

export interface LichSu {
  id: string
  doi_tuong: string
  doi_tuong_id: string
  ten_hien_thi: string | null
  truong: string | null
  gia_tri_cu: string | null
  gia_tri_moi: string | null
  nguoi_cap_nhat: string | null
  thoi_diem: string
}

import type {
  TrangThaiPhong,
  TrangThaiKtx,
  TrangThaiLead,
  KhuVuc,
  LoaiPhong,
  DoiTuongKtx,
} from './types'

export const KHU_VUC_LIST: KhuVuc[] = ['Linh Chiểu', 'Linh Trung', 'Linh Đông', 'Trường Thọ']
export const LOAI_PHONG_LIST: LoaiPhong[] = ['Đơn', 'Đôi', 'Studio', 'Ghép', 'Duplex', 'Khác']
export const DOI_TUONG_LIST: DoiTuongKtx[] = ['Nam', 'Nữ', 'Nam + Nữ']

// Nhãn + class màu (xanh=còn, vàng/cam=giữ chỗ, đỏ=hết).
type Badge = { label: string; cls: string }

export const TRANG_THAI_PHONG: Record<TrangThaiPhong, Badge> = {
  con_phong: { label: 'Còn phòng', cls: 'bg-green-100 text-green-700 ring-green-600/20' },
  giu_cho: { label: 'Giữ chỗ', cls: 'bg-amber-100 text-amber-700 ring-amber-600/20' },
  sold_out: { label: 'Sold out', cls: 'bg-red-100 text-red-700 ring-red-600/20' },
}

export const TRANG_THAI_KTX: Record<TrangThaiKtx, Badge> = {
  con_cho: { label: 'Còn chỗ', cls: 'bg-green-100 text-green-700 ring-green-600/20' },
  giu_cho: { label: 'Giữ chỗ', cls: 'bg-amber-100 text-amber-700 ring-amber-600/20' },
  het_cho: { label: 'Hết chỗ', cls: 'bg-red-100 text-red-700 ring-red-600/20' },
}

export const TRANG_THAI_LEAD: Record<TrangThaiLead, Badge> = {
  moi: { label: 'Mới', cls: 'bg-sky-100 text-sky-700 ring-sky-600/20' },
  dang_tu_van: { label: 'Đang tư vấn', cls: 'bg-amber-100 text-amber-700 ring-amber-600/20' },
  da_chot: { label: 'Đã chốt', cls: 'bg-green-100 text-green-700 ring-green-600/20' },
  tu_choi: { label: 'Từ chối', cls: 'bg-gray-100 text-gray-600 ring-gray-500/20' },
}

// Danh sách tiện ích phòng (key trùng cột boolean trong bảng phong).
export const TIEN_ICH_PHONG: { key: keyof import('./types').Phong; label: string }[] = [
  { key: 'co_may_lanh', label: 'Máy lạnh' },
  { key: 'co_wc_rieng', label: 'WC riêng' },
  { key: 'co_gac_lung', label: 'Gác lửng' },
  { key: 'co_may_nong_lanh', label: 'Máy nước nóng' },
  { key: 'co_tu_lanh', label: 'Tủ lạnh' },
  { key: 'co_wifi', label: 'Wifi' },
  { key: 'co_giu_xe', label: 'Giữ xe' },
  { key: 'co_bep', label: 'Bếp' },
]

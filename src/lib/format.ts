// Tiện ích định dạng tiếng Việt.

/** 1800000 -> "1.800.000 đ" */
export function formatVND(n: number | null | undefined): string {
  if (n == null) return '—'
  return new Intl.NumberFormat('vi-VN').format(n) + ' đ'
}

/** Dải giá KTX: 1.200.000 đ – 1.500.000 đ (gộp nếu bằng nhau). */
export function formatDaiGia(tu: number | null, den: number | null): string {
  if (tu == null && den == null) return '—'
  if (tu != null && den != null && tu !== den) {
    return `${formatVND(tu)} – ${formatVND(den)}`
  }
  return formatVND(tu ?? den)
}

/** ISO -> "19/06/2026 14:30" */
export function formatNgayGio(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatNgay(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('vi-VN')
}

/**
 * Chuyển link xem Google Drive thành link ảnh nhúng được.
 * https://drive.google.com/file/d/<ID>/view  ->  https://drive.google.com/thumbnail?id=<ID>&sz=w1000
 */
export function driveImageUrl(link: string | null | undefined): string | null {
  if (!link) return null
  const m = link.match(/\/d\/([^/]+)/) || link.match(/[?&]id=([^&]+)/)
  if (m) return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w1000`
  return link // có thể đã là link ảnh trực tiếp
}

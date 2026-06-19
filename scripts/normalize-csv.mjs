#!/usr/bin/env node
/**
 * normalize-csv.mjs — Chuẩn hóa & làm sạch dữ liệu từ Google Sheet (CSV)
 * và sinh file SQL INSERT để dán vào Supabase.
 *
 * CÁCH DÙNG:
 *   1. Export từng sheet ra CSV, đặt vào thư mục scripts/input/:
 *        - chu_nha.csv   (ten_chu, sdt, zalo, ghi_chu_hop_tac)
 *        - khu_tro.csv   (ten_khu_tro, dia_chi, khu_vuc, ten_chu, gia_dien,
 *                         gia_nuoc, cac_phi_khac, link_anh, ghi_chu_chung)
 *        - phong.csv     (ten_khu_tro, so_phong, loai_phong, dien_tich, gia,
 *                         coc_thang, may_lanh, wc_rieng, gac_lung, may_nong_lanh,
 *                         tu_lanh, wifi, giu_xe, bep, trang_thai, ghi_chu, link_anh)
 *        - ktx.csv       (ma_ktx, ten_ktx, dia_chi, khu_vuc, ten_chu, gia,
 *                         slot, doi_tuong, tien_ich, coc_thang, trang_thai, link_anh)
 *   2. node scripts/normalize-csv.mjs
 *   3. Lấy file scripts/output/seed.generated.sql dán vào Supabase SQL Editor.
 *
 * Quy tắc chuẩn hóa: xem phần dưới (parseTien, parseSlot, normTrangThai...).
 * Script này KHÔNG cần thư viện ngoài (parser CSV tối giản, hỗ trợ dấu ngoặc kép).
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const INPUT = join(__dirname, 'input')
const OUTPUT = join(__dirname, 'output')

// ----------------------- CSV parser tối giản -----------------------
function parseCSV(text) {
  const rows = []
  let row = [], field = '', inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i], next = text[i + 1]
    if (inQuotes) {
      if (c === '"' && next === '"') { field += '"'; i++ }
      else if (c === '"') inQuotes = false
      else field += c
    } else {
      if (c === '"') inQuotes = true
      else if (c === ',') { row.push(field); field = '' }
      else if (c === '\r') { /* bỏ qua */ }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
      else field += c
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row) }
  return rows.filter((r) => r.some((c) => c.trim() !== ''))
}

function readTable(name) {
  const path = join(INPUT, name)
  if (!existsSync(path)) return null
  const rows = parseCSV(readFileSync(path, 'utf8'))
  if (rows.length === 0) return []
  const headers = rows[0].map((h) => h.trim())
  return rows.slice(1).map((r) => {
    const obj = {}
    headers.forEach((h, idx) => (obj[h] = (r[idx] ?? '').trim()))
    return obj
  })
}

// ----------------------- Quy tắc chuẩn hóa -----------------------

/** "1TR8" -> 1800000 ; "1tr1" -> 1100000 ; "2TR" -> 2000000 ;
 *  "3.200.000 đ" -> 3200000 ; "3.2tr" -> 3200000 ; "850k" -> 850000 */
export function parseTien(raw) {
  if (raw == null) return null
  let s = String(raw).toLowerCase().trim()
  if (!s || /^(không|n\/a|na|-)$/.test(s)) return null

  // dạng "x tr y"  (1tr8, 3tr3, 1 tr 8)
  const trMatch = s.match(/(\d+(?:[.,]\d+)?)\s*tr\s*(\d?)/)
  if (trMatch) {
    const nguyen = parseFloat(trMatch[1].replace(',', '.'))
    const le = trMatch[2] ? parseInt(trMatch[2], 10) : 0
    // "1tr8" -> 1.8 triệu ; "3.2tr" -> 3.2 triệu
    const base = Number.isInteger(nguyen) ? nguyen + le / 10 : nguyen
    return Math.round(base * 1_000_000)
  }
  // dạng "850k"
  const kMatch = s.match(/(\d+(?:[.,]\d+)?)\s*k\b/)
  if (kMatch) return Math.round(parseFloat(kMatch[1].replace(',', '.')) * 1000)

  // dạng có dấu chấm ngăn cách nghìn / "đ"
  s = s.replace(/đ|vnd|đồng/g, '').replace(/[.\s]/g, '').replace(',', '')
  const n = parseInt(s, 10)
  return Number.isNaN(n) ? null : n
}

/** Dải giá "3tr3 - 3tr5" -> { tu, den }. Nếu 1 giá -> tu = den. */
export function parseDaiGia(raw) {
  if (!raw) return { tu: null, den: null }
  const parts = String(raw).split(/[-–—đến~]/).map((p) => p.trim()).filter(Boolean)
  if (parts.length >= 2) {
    return { tu: parseTien(parts[0]), den: parseTien(parts[parts.length - 1]) }
  }
  const v = parseTien(raw)
  return { tu: v, den: v }
}

/** "<20 slot" -> { so: 20, ghi_chu: "<20 slot" } ; "Còn" -> { so: null, ghi_chu: "Còn" } */
export function parseSlot(raw) {
  if (!raw) return { so: null, ghi_chu: null }
  const ghi_chu = String(raw).trim()
  const m = ghi_chu.match(/\d+/)
  return { so: m ? parseInt(m[0], 10) : null, ghi_chu }
}

/** Chuẩn hóa khu vực về đúng 4 enum. */
export function normKhuVuc(raw) {
  if (!raw) return null
  const s = String(raw).toLowerCase().replace(/\s+/g, ' ').trim()
  if (s.includes('chiểu') || s.includes('chieu')) return 'Linh Chiểu'
  if (s.includes('trung')) return 'Linh Trung'
  if (s.includes('đông') || s.includes('dong')) return 'Linh Đông'
  if (s.includes('thọ') || s.includes('tho')) return 'Trường Thọ'
  return null
}

/** Trạng thái phòng. */
export function normTrangThaiPhong(raw) {
  const s = String(raw || '').toLowerCase().trim()
  if (/sold|hết|het/.test(s)) return 'sold_out'
  if (/giữ|giu/.test(s)) return 'giu_cho'
  if (/còn|con/.test(s) || s === '') return 'con_phong'
  return 'con_phong'
}

/** Trạng thái KTX. */
export function normTrangThaiKtx(raw) {
  const s = String(raw || '').toLowerCase().trim()
  if (/sold|hết|het/.test(s)) return 'het_cho'
  if (/giữ|giu/.test(s)) return 'giu_cho'
  return 'con_cho'
}

export function normLoaiPhong(raw) {
  const s = String(raw || '').toLowerCase().trim()
  if (s.includes('đôi') || s.includes('doi')) return 'Đôi'
  if (s.includes('studio')) return 'Studio'
  if (s.includes('ghép') || s.includes('ghep')) return 'Ghép'
  if (s.includes('duplex')) return 'Duplex'
  if (s.includes('đơn') || s.includes('don')) return 'Đơn'
  return 'Khác'
}

export function normDoiTuong(raw) {
  const s = String(raw || '').toLowerCase().trim()
  const nam = s.includes('nam'), nu = s.includes('nữ') || s.includes('nu')
  if (nam && nu) return 'Nam + Nữ'
  if (nu) return 'Nữ'
  if (nam) return 'Nam'
  return null
}

/** Tiện ích Có/Không -> boolean. Riêng "Có ( Khi thêm 300k)" -> { bool: true, phu_phi: 300000 } */
export function parseTienIch(raw) {
  const s = String(raw || '').toLowerCase().trim()
  if (!s || s === 'không' || s === 'khong' || s === 'no' || s === 'x' || s === '0') {
    return { bool: false, phu_phi: null }
  }
  // có kèm phụ phí
  const phu = s.match(/(\d+)\s*k/) // "300k"
  const phuFull = phu ? parseInt(phu[1], 10) * 1000 : parseTien(s.match(/[\d.]+/)?.[0])
  if (/có|co|true|yes|1/.test(s)) {
    return { bool: true, phu_phi: /thêm|them|\+/.test(s) ? phuFull : null }
  }
  return { bool: false, phu_phi: null }
}

// ----------------------- SQL helpers -----------------------
const Q = (v) => (v == null || v === '' ? 'null' : `'${String(v).replace(/'/g, "''")}'`)
const N = (v) => (v == null || v === '' || Number.isNaN(v) ? 'null' : String(v))
const B = (v) => (v ? 'true' : 'false')

// ----------------------- Sinh SQL -----------------------
function main() {
  if (!existsSync(INPUT)) {
    mkdirSync(INPUT, { recursive: true })
    console.log(`Đã tạo thư mục ${INPUT}. Hãy đặt các file CSV vào đây rồi chạy lại.`)
    console.log('File CSV cần có:', readdirSync(INPUT))
    return
  }
  mkdirSync(OUTPUT, { recursive: true })

  const warnings = []
  const out = ['-- File sinh tự động bởi normalize-csv.mjs', 'begin;', '']

  // map slug ten -> để liên kết FK (dùng CTE theo tên)
  const chuNha = readTable('chu_nha.csv') || []
  const khuTro = readTable('khu_tro.csv') || []
  const phong = readTable('phong.csv') || []
  const ktx = readTable('ktx.csv') || []

  // ---- chu_nha ----
  if (chuNha.length) {
    out.push('-- chu_nha')
    for (const r of chuNha) {
      out.push(
        `insert into chu_nha (ten_chu, sdt, zalo, ghi_chu_hop_tac) values (` +
          `${Q(r.ten_chu)}, ${Q(r.sdt)}, ${Q(r.zalo)}, ${Q(r.ghi_chu_hop_tac)});`
      )
    }
    out.push('')
  }

  // ---- khu_tro (FK chu_nha theo ten_chu) ----
  if (khuTro.length) {
    out.push('-- khu_tro')
    for (const r of khuTro) {
      const kv = normKhuVuc(r.khu_vuc)
      if (r.khu_vuc && !kv) warnings.push(`khu_tro "${r.ten_khu_tro}": khu_vuc "${r.khu_vuc}" không map được.`)
      const chuSub = r.ten_chu
        ? `(select id from chu_nha where ten_chu = ${Q(r.ten_chu)} limit 1)`
        : 'null'
      out.push(
        `insert into khu_tro (ten_khu_tro, dia_chi, khu_vuc, chu_nha_id, gia_dien, gia_nuoc, cac_phi_khac, link_anh, ghi_chu_chung) values (` +
          `${Q(r.ten_khu_tro)}, ${Q(r.dia_chi)}, ${kv ? Q(kv) : 'null'}, ${chuSub}, ` +
          `${N(parseTien(r.gia_dien))}, ${N(parseTien(r.gia_nuoc))}, ${Q(r.cac_phi_khac)}, ${Q(r.link_anh)}, ${Q(r.ghi_chu_chung)});`
      )
    }
    out.push('')
  }

  // ---- phong (FK khu_tro theo ten_khu_tro) ----
  if (phong.length) {
    out.push('-- phong')
    const autoNum = {} // đếm phòng tự sinh theo khu
    for (const r of phong) {
      let soPhong = r.so_phong
      if (!soPhong) {
        autoNum[r.ten_khu_tro] = (autoNum[r.ten_khu_tro] || 0) + 1
        soPhong = `P${autoNum[r.ten_khu_tro]}`
        warnings.push(`phong khu "${r.ten_khu_tro}": thiếu số phòng -> tạm đặt "${soPhong}", cần điền lại.`)
      }
      const ml = parseTienIch(r.may_lanh)
      const gia = parseDaiGia(r.gia).tu // phòng: lấy mốc thấp nhất
      const khuSub = `(select id from khu_tro where ten_khu_tro = ${Q(r.ten_khu_tro)} limit 1)`
      out.push(
        `insert into phong (khu_tro_id, so_phong, loai_phong, dien_tich, gia, coc_thang, ` +
          `co_wc_rieng, co_gac_lung, co_may_lanh, phu_phi_may_lanh, co_may_nong_lanh, co_tu_lanh, co_wifi, co_giu_xe, co_bep, ` +
          `trang_thai, ghi_chu, link_anh) values (` +
          `${khuSub}, ${Q(soPhong)}, ${Q(normLoaiPhong(r.loai_phong))}, ${N(parseFloat(r.dien_tich) || null)}, ${N(gia)}, ${N(parseTien(r.coc_thang))}, ` +
          `${B(parseTienIch(r.wc_rieng).bool)}, ${B(parseTienIch(r.gac_lung).bool)}, ${B(ml.bool)}, ${N(ml.phu_phi)}, ` +
          `${B(parseTienIch(r.may_nong_lanh).bool)}, ${B(parseTienIch(r.tu_lanh).bool)}, ${B(parseTienIch(r.wifi).bool)}, ` +
          `${B(parseTienIch(r.giu_xe).bool)}, ${B(parseTienIch(r.bep).bool)}, ` +
          `${Q(normTrangThaiPhong(r.trang_thai))}, ${Q(r.ghi_chu)}, ${Q(r.link_anh)});`
      )
    }
    out.push('')
  }

  // ---- ktx ----
  if (ktx.length) {
    out.push('-- ktx')
    for (const r of ktx) {
      const { tu, den } = parseDaiGia(r.gia)
      const slot = parseSlot(r.slot)
      const kv = normKhuVuc(r.khu_vuc)
      const chuSub = r.ten_chu
        ? `(select id from chu_nha where ten_chu = ${Q(r.ten_chu)} limit 1)`
        : 'null'
      out.push(
        `insert into ktx (ma_ktx, ten_ktx, dia_chi, khu_vuc, chu_nha_id, gia_tu, gia_den, so_slot_trong, ghi_chu_slot, doi_tuong, tien_ich, coc_thang, trang_thai, link_anh) values (` +
          `${Q(r.ma_ktx)}, ${Q(r.ten_ktx)}, ${Q(r.dia_chi)}, ${kv ? Q(kv) : 'null'}, ${chuSub}, ` +
          `${N(tu)}, ${N(den)}, ${N(slot.so)}, ${Q(slot.ghi_chu)}, ${normDoiTuong(r.doi_tuong) ? Q(normDoiTuong(r.doi_tuong)) : 'null'}, ` +
          `${Q(r.tien_ich)}, ${N(parseTien(r.coc_thang))}, ${Q(normTrangThaiKtx(r.trang_thai))}, ${Q(r.link_anh)});`
      )
    }
    out.push('')
  }

  out.push('commit;')
  const target = join(OUTPUT, 'seed.generated.sql')
  writeFileSync(target, out.join('\n'), 'utf8')
  console.log(`✅ Đã sinh: ${target}`)
  if (warnings.length) {
    console.log(`\n⚠️  ${warnings.length} cảnh báo cần kiểm tra:`)
    warnings.forEach((w) => console.log('   - ' + w))
    writeFileSync(join(OUTPUT, 'warnings.txt'), warnings.join('\n'), 'utf8')
  }
}

main()

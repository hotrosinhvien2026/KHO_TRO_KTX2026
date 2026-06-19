-- =====================================================================
--  seed.sql — Dữ liệu MẪU đã làm sạch (theo quy tắc ở README mục "Chuẩn hóa")
--  Chạy SAU schema.sql. Đây là dữ liệu minh họa dựa trên ví dụ trong yêu cầu
--  (chủ "c Hương" 0906349596, giá 1TR8, phòng 302/C-8/D-19, 8 KTX...).
--  Khi có CSV thật: dùng scripts/normalize-csv.mjs để sinh seed.generated.sql.
-- =====================================================================
begin;

-- Tránh chèn trùng khi chạy lại nhiều lần (môi trường demo).
truncate table lich_su_cap_nhat, leads, phong, ktx, khu_tro, chu_nha restart identity cascade;

-- ---------------------------- CHỦ NHÀ ----------------------------
insert into chu_nha (ten_chu, sdt, zalo, ghi_chu_hop_tac) values
  ('c Hương',   '0906349596', '0906349596', 'Hoa hồng 50% tháng đầu, có nhiều khu ở Linh Chiểu & Linh Trung'),
  ('a Tuấn',    '0903112233', '0903112233', 'Phản hồi nhanh, ưu tiên SV nữ'),
  ('c Lan',     '0987654321', '0987654321', 'KTX cao cấp, có hợp đồng rõ ràng'),
  ('chú Bình',  '0911222333', null,          'Chỉ liên hệ giờ hành chính');

-- ---------------------------- KHU TRỌ ----------------------------
insert into khu_tro (ten_khu_tro, dia_chi, khu_vuc, chu_nha_id, gia_dien, gia_nuoc, cac_phi_khac, link_anh, ghi_chu_chung) values
  ('Khu trọ Hương 1', '12 Đường số 6, Linh Chiểu', 'Linh Chiểu',
     (select id from chu_nha where ten_chu='c Hương'), 3500, 20000,
     'Net 100k/phòng, rác 50k, giữ xe 80k/xe', 'https://drive.google.com/file/d/EXAMPLE1/view', 'Giờ giấc tự do, có thang máy'),
  ('Khu trọ Hương 2', '45 Kha Vạn Cân, Linh Đông', 'Linh Đông',
     (select id from chu_nha where ten_chu='c Hương'), 3800, 25000,
     'Net + rác 120k, quản lý 200k', null, 'Mới xây 2023'),
  ('Nhà trọ Tuấn',    '78 Hoàng Diệu 2, Linh Trung', 'Linh Trung',
     (select id from chu_nha where ten_chu='a Tuấn'), 3000, 15000,
     'Giữ xe 60k', null, 'Gần Làng Đại học, đông SV'),
  ('Trọ chú Bình',    '5 Đặng Văn Bi, Trường Thọ', 'Trường Thọ',
     (select id from chu_nha where ten_chu='chú Bình'), 4000, 100000,
     'Nước tính theo người 100k/người', null, 'Khu yên tĩnh');

-- ---------------------------- PHÒNG ----------------------------
-- "1TR8" -> 1800000 ; "Có ( Khi thêm 300k)" -> co_may_lanh=true, phu_phi=300000
insert into phong (khu_tro_id, so_phong, loai_phong, dien_tich, gia, coc_thang,
  co_wc_rieng, co_gac_lung, co_may_lanh, phu_phi_may_lanh, co_may_nong_lanh, co_tu_lanh, co_wifi, co_giu_xe, co_bep,
  trang_thai, ghi_chu, link_anh) values
  ((select id from khu_tro where ten_khu_tro='Khu trọ Hương 1'), '302', 'Đơn', 20, 1800000, 1800000,
     true, false, true, 300000, false, false, true, true, true, 'con_phong', 'Máy lạnh +300k/tháng', 'https://drive.google.com/file/d/EXAMPLE_P1/view'),
  ((select id from khu_tro where ten_khu_tro='Khu trọ Hương 1'), 'C-8', 'Studio', 28, 3200000, 3200000,
     true, true, true, null, true, true, true, true, true, 'giu_cho', 'Có gác lửng, full nội thất', null),
  ((select id from khu_tro where ten_khu_tro='Khu trọ Hương 1'), 'D-19', 'Đôi', 25, 2500000, 1250000,
     true, false, false, null, false, false, true, true, false, 'sold_out', 'Cho 2 người', null),
  ((select id from khu_tro where ten_khu_tro='Khu trọ Hương 2'), '101', 'Đơn', 18, 2000000, 2000000,
     true, false, true, null, false, false, true, true, false, 'con_phong', null, null),
  ((select id from khu_tro where ten_khu_tro='Khu trọ Hương 2'), '205', 'Duplex', 35, 4000000, 4000000,
     true, true, true, null, true, true, true, true, true, 'con_phong', 'View đẹp tầng cao', null),
  ((select id from khu_tro where ten_khu_tro='Nhà trọ Tuấn'),    'A1', 'Ghép', 30, 1100000, 1100000,
     false, false, false, null, false, false, true, true, true, 'con_phong', 'Ở ghép 4 người, giá/người', null),
  ((select id from khu_tro where ten_khu_tro='Nhà trọ Tuấn'),    'A2', 'Đơn', 16, 1500000, 1500000,
     true, false, false, null, false, false, true, true, false, 'con_phong', null, null),
  ((select id from khu_tro where ten_khu_tro='Trọ chú Bình'),    'P1', 'Đơn', 22, 2200000, 2200000,
     true, true, true, null, true, false, true, true, true, 'con_phong', 'Phòng góc thoáng', null);

-- ---------------------------- KTX (8 cơ sở) ----------------------------
-- "3tr3 - 3tr5" -> gia_tu=3300000, gia_den=3500000 ; "<20 slot" -> so_slot_trong=20, ghi_chu_slot giữ nguyên
insert into ktx (ma_ktx, ten_ktx, dia_chi, khu_vuc, chu_nha_id, gia_tu, gia_den, so_slot_trong, ghi_chu_slot, doi_tuong, tien_ich, coc_thang, trang_thai, link_anh) values
  ('KTX01', 'KTX Ngân Hàng A', '1 Hoàng Diệu 2, Linh Trung', 'Linh Trung',
     (select id from chu_nha where ten_chu='c Lan'), 1200000, 1500000, 18, '<20 slot', 'Nam',
     'Máy lạnh, wifi, giặt sấy, bảo vệ 24/7, thang máy', 1200000, 'con_cho', null),
  ('KTX02', 'KTX Ngân Hàng B', '3 Hoàng Diệu 2, Linh Trung', 'Linh Trung',
     (select id from chu_nha where ten_chu='c Lan'), 1300000, 1600000, 20, 'khoảng 20 giường', 'Nữ',
     'Máy lạnh, wifi, bếp chung, ban công', 1300000, 'con_cho', null),
  ('KTX03', 'KTX Sao Mai', '22 Võ Văn Ngân, Linh Chiểu', 'Linh Chiểu',
     (select id from chu_nha where ten_chu='c Hương'), 1000000, 1400000, null, 'Còn', 'Nam + Nữ',
     'Wifi, máy giặt, khu vực chung rộng', 1000000, 'con_cho', null),
  ('KTX04', 'KTX Hoa Sen', '88 Kha Vạn Cân, Linh Đông', 'Linh Đông',
     (select id from chu_nha where ten_chu='a Tuấn'), 1500000, 1800000, 5, 'còn 5 slot', 'Nữ',
     'Máy lạnh, tủ lạnh chung, an ninh tốt', 1500000, 'giu_cho', null),
  ('KTX05', 'KTX Bách Khoa', '10 Đặng Văn Bi, Trường Thọ', 'Trường Thọ',
     (select id from chu_nha where ten_chu='chú Bình'), 900000, 1200000, 30, 'còn nhiều (~30)', 'Nam',
     'Wifi, giữ xe miễn phí', 900000, 'con_cho', null),
  ('KTX06', 'KTX Đông Á', '50 Lê Văn Chí, Linh Trung', 'Linh Trung',
     (select id from chu_nha where ten_chu='c Lan'), 1400000, 1700000, 0, 'Hết chỗ', 'Nam + Nữ',
     'Máy lạnh, wifi, hồ bơi, gym', 1400000, 'het_cho', null),
  ('KTX07', 'KTX Phương Nam', '15 Đường số 8, Linh Chiểu', 'Linh Chiểu',
     (select id from chu_nha where ten_chu='c Hương'), 1100000, 1300000, 12, '<15 slot', 'Nữ',
     'Wifi, máy giặt, bếp riêng từng tầng', 1100000, 'con_cho', null),
  ('KTX08', 'KTX Thủ Đức Center', '120 Tô Ngọc Vân, Linh Đông', 'Linh Đông',
     (select id from chu_nha where ten_chu='a Tuấn'), 1600000, 2000000, 8, 'còn 8 giường', 'Nam',
     'Full nội thất, máy lạnh, thang máy, an ninh 24/7', 1600000, 'con_cho', null);

-- ---------------------------- LEADS (khách mẫu) ----------------------------
insert into leads (ten_khach, sdt_khach, ngan_sach, khu_vuc_mong_muon, yeu_cau, trang_thai, ket_qua) values
  ('Nguyễn Văn An',  '0912000111', 2000000, 'Linh Trung',  'Phòng đơn, có máy lạnh, gần trường', 'moi', null),
  ('Trần Thị Bình',  '0922000222', 1500000, 'Linh Chiểu',  'Ở ghép cũng được, ưu tiên giá rẻ',  'dang_tu_van', 'Đang xem KTX Sao Mai'),
  ('Lê Hoàng Cường', '0933000333', 3500000, 'Linh Đông',   'Studio full nội thất',               'da_chot', 'Đã cọc phòng C-8 khu Hương 1');

commit;

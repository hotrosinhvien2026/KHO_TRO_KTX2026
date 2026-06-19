# Quản lý Phòng Trọ & KTX — Team CTV ĐH Ngân Hàng (Thủ Đức)

Web app quản lý dữ liệu phòng trọ và ký túc xá, dữ liệu lưu tập trung trên
**Supabase** (PostgreSQL + Auth + RLS), frontend **React + Vite + TypeScript +
Tailwind** deploy tĩnh lên **GitHub Pages**.

Hai vai trò: **Admin** (toàn quyền, quản lý CTV/chủ nhà, thống kê) và
**CTV** (xem/lọc, cập nhật trạng thái phòng/KTX, quản lý Lead của mình). Phân
quyền thực thi ở tầng database bằng Row Level Security.

---

## Tính năng chính

- **Dashboard**: thống kê tính bằng truy vấn thật (tổng KTX, KTX còn chỗ, tổng
  phòng, phòng còn trống, tổng Lead, Lead đã chốt) + "Cập nhật lần cuối".
- **Phòng Trọ**: xem theo *khu trọ → các phòng*; lọc khu vực/loại/giá/trạng
  thái/tiện ích + tìm kiếm; đổi trạng thái nhanh; chi tiết + ảnh + lịch sử +
  nút **Sao chép nội dung tư vấn** (gửi Zalo).
- **KTX**: bảng (desktop) / card (mobile), lọc + tìm kiếm, đổi trạng thái, chi
  tiết + copy tư vấn.
- **Lead**: tạo/cập nhật/lọc khách; CTV chỉ sửa-xóa lead của mình.
- **Quản lý (Admin)**: tạo tài khoản, gán vai trò; CRUD chủ nhà.

---

## 1) Tạo project Supabase

1. Vào <https://supabase.com> → **New project**. Đặt tên, chọn region gần (Singapore).
2. Đợi project khởi tạo xong.
3. Vào **Project Settings → API**, ghi lại:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY`

## 2) Chạy `schema.sql`

1. Mở **SQL Editor** trên Supabase → **New query**.
2. Dán toàn bộ nội dung [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
   - File này tạo ENUM, 7 bảng, trigger (auto `ngay_cap_nhat`, log lịch sử,
     auto tạo `profiles` khi đăng ký) và toàn bộ RLS policy.

## 3) Import / seed dữ liệu

**Cách A — dữ liệu mẫu để chạy thử:** dán [`supabase/seed.sql`](supabase/seed.sql)
vào SQL Editor → Run.

**Cách B — import dữ liệu thật từ Google Sheet:**

1. Export từng sheet ra CSV, đặt vào `scripts/input/` với tên:
   `chu_nha.csv`, `khu_tro.csv`, `phong.csv`, `ktx.csv` (cột — xem đầu file
   [`scripts/normalize-csv.mjs`](scripts/normalize-csv.mjs)).
2. Chạy chuẩn hóa:
   ```bash
   npm run normalize
   ```
3. Mở `scripts/output/seed.generated.sql`, kiểm tra `warnings.txt` (phòng thiếu
   số phòng được tạm đặt `P1, P2…`, cần điền lại), rồi dán SQL vào Supabase.

### Quy tắc chuẩn hóa đã áp dụng
- Giá: `1TR8`→`1800000`, `1tr1`→`1100000`, `3.200.000 đ`→`3200000`, `850k`→`850000`;
  dải `3tr3 - 3tr5` → `gia_tu`/`gia_den` (KTX) hoặc mốc thấp nhất (phòng).
- Slot: tách số ra `so_slot_trong`, giữ chuỗi gốc ở `ghi_chu_slot`; "Còn" → `NULL`.
- Trạng thái: "Còn/Còn phòng"→`con_phong`/`con_cho`, "Sold out/Hết"→`sold_out`/`het_cho`, "Giữ chỗ"→`giu_cho`.
- Tiện ích Có/Không → boolean; `Có ( Khi thêm 300k)` → `co_may_lanh=true` + `phu_phi_may_lanh=300000`.
- Khu vực: chuẩn hóa về 4 enum (`linh trung`→`Linh Trung`…).
- Phí lẻ (net/rác/quản lý/giữ xe) → gom vào `cac_phi_khac` của khu trọ.

## 4) Cấu hình biến môi trường

```bash
cp .env.example .env
```
Điền `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY`.

## 5) Chạy local

```bash
npm install
npm run dev
```
Mở <http://localhost:5173>.

### Tạo tài khoản admin đầu tiên
1. Trên Supabase → **Authentication → Users → Add user** (tạo email + mật khẩu,
   tick *Auto Confirm User*). Trigger sẽ tự tạo dòng trong `profiles` (mặc định
   role = `ctv`).
2. Nâng quyền admin bằng SQL Editor:
   ```sql
   update profiles set role = 'admin'
   where id = (select id from auth.users where email = 'admin@email.com');
   ```
3. Đăng nhập bằng tài khoản đó → vào **Quản lý** để tạo các tài khoản CTV khác.
   > Mẹo: để CTV đăng nhập được ngay, tắt xác nhận email tại
   > **Authentication → Providers → Email → Confirm email**.

## 6) Deploy GitHub Pages

1. Push code lên nhánh `main` của repo GitHub.
2. **Settings → Pages → Build and deployment → Source = GitHub Actions.**
3. **Settings → Secrets and variables → Actions → New repository secret**, thêm:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. `base` trong [`vite.config.ts`](vite.config.ts) phải khớp **chính xác** tên repo
   (kể cả hoa/thường) — hiện đặt `/KHO_TRO_KTX2026/`. Nếu đổi tên repo thì sửa lại
   cho khớp; nếu dùng domain riêng hoặc `<user>.github.io` thì đổi thành `/`.
5. Mỗi lần push lên `main`, Actions tự build & deploy. App chạy tại
   `https://hotrosinhvien2026.github.io/KHO_TRO_KTX2026/`.

> Workflow đã tạo sẵn `404.html` = `index.html` để client-side routing (React
> Router) hoạt động khi refresh trang con trên GitHub Pages.

---

## Cấu trúc thư mục

```
.github/workflows/deploy.yml   # CI build + deploy GitHub Pages
supabase/
  schema.sql                   # CREATE bảng + ENUM + trigger + RLS
  seed.sql                     # dữ liệu mẫu đã làm sạch
scripts/normalize-csv.mjs      # chuẩn hóa CSV → seed.generated.sql
src/
  lib/        supabase.ts · types.ts · format.ts · constants.ts
  contexts/   AuthContext.tsx
  components/ Layout.tsx · ui/{Toast,Spinner,Badge,Modal}.tsx
  pages/      Login · Dashboard · PhongTro · Ktx · Leads · QuanLy
```

## Mô hình dữ liệu (2 cấp)

`chu_nha` (1) → (n) `khu_tro` (1) → (n) `phong`   ·   `chu_nha` (1) → (n) `ktx`
(bán theo slot). `profiles` giữ vai trò; `leads` là khách; `lich_su_cap_nhat`
log đổi trạng thái. Chi tiết cột: xem `supabase/schema.sql`.

## Phân quyền (RLS tóm tắt)

- Mọi user đăng nhập: **SELECT** toàn bộ `chu_nha/khu_tro/phong/ktx/leads`.
- **Admin**: toàn quyền mọi bảng.
- **CTV**: **UPDATE** `phong`/`ktx` (frontend chỉ mở trạng thái/ghi chú/ảnh/CTV
  phụ trách); **INSERT/UPDATE/DELETE** `leads` chỉ với lead `ctv_phu_trach =
  auth.uid()`; **không** xóa phòng/khu/KTX, không sửa profile người khác.
```

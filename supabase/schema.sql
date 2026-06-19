-- =====================================================================
--  QUẢN LÝ PHÒNG TRỌ & KTX  —  schema.sql
--  Dán toàn bộ file này vào Supabase SQL Editor và chạy 1 lần.
--  Bao gồm: ENUM, BẢNG, TRIGGER (auto ngày cập nhật + log), RLS policies.
-- =====================================================================

-- ---------- 0. EXTENSIONS ----------
create extension if not exists "pgcrypto";   -- gen_random_uuid()

-- ---------- 1. ENUM TYPES ----------
do $$ begin
  create type user_role        as enum ('admin', 'ctv');
exception when duplicate_object then null; end $$;

do $$ begin
  create type khu_vuc          as enum ('Linh Chiểu', 'Linh Trung', 'Linh Đông', 'Trường Thọ');
exception when duplicate_object then null; end $$;

do $$ begin
  create type loai_phong       as enum ('Đơn', 'Đôi', 'Studio', 'Ghép', 'Duplex', 'Khác');
exception when duplicate_object then null; end $$;

do $$ begin
  create type trang_thai_phong as enum ('con_phong', 'giu_cho', 'sold_out');
exception when duplicate_object then null; end $$;

do $$ begin
  create type trang_thai_ktx   as enum ('con_cho', 'giu_cho', 'het_cho');
exception when duplicate_object then null; end $$;

do $$ begin
  create type trang_thai_lead  as enum ('moi', 'dang_tu_van', 'da_chot', 'tu_choi');
exception when duplicate_object then null; end $$;

do $$ begin
  create type doi_tuong_ktx    as enum ('Nam', 'Nữ', 'Nam + Nữ');
exception when duplicate_object then null; end $$;

-- ---------- 2. HÀM TIỆN ÍCH ----------

-- Tự cập nhật cột ngay_cap_nhat mỗi khi UPDATE.
create or replace function set_ngay_cap_nhat()
returns trigger language plpgsql as $$
begin
  new.ngay_cap_nhat := now();
  return new;
end $$;

-- Kiểm tra user hiện tại có phải admin không.
-- SECURITY DEFINER + đọc trực tiếp bảng profiles -> tránh đệ quy RLS.
create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------- 3. BẢNG ----------

-- 3.1 profiles (1-1 với auth.users)
create table if not exists profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  role       user_role not null default 'ctv',
  phone      text,
  created_at timestamptz not null default now()
);

-- 3.2 chu_nha (chủ nhà / quản lý KTX)
create table if not exists chu_nha (
  id              uuid primary key default gen_random_uuid(),
  ten_chu         text not null,
  sdt             text,
  zalo            text,
  ghi_chu_hop_tac text,
  created_at      timestamptz not null default now()
);

-- 3.3 khu_tro (mỗi khu/dãy trọ — KHÔNG phải từng phòng)
create table if not exists khu_tro (
  id            uuid primary key default gen_random_uuid(),
  ten_khu_tro   text not null,
  dia_chi       text,
  khu_vuc       khu_vuc,
  chu_nha_id    uuid references chu_nha(id) on delete set null,
  gia_dien      int,          -- đồng/kWh
  gia_nuoc      int,          -- đồng/m³
  cac_phi_khac  text,         -- net, rác, quản lý, giữ xe...
  link_anh      text,
  ghi_chu_chung text,
  created_at    timestamptz not null default now()
);

-- 3.4 phong (TỪNG phòng cụ thể thuộc một khu_tro)
create table if not exists phong (
  id                uuid primary key default gen_random_uuid(),
  khu_tro_id        uuid not null references khu_tro(id) on delete cascade,
  so_phong          text not null,
  loai_phong        loai_phong default 'Khác',
  dien_tich         numeric,                 -- m², nullable
  gia               int,                     -- đồng/tháng
  coc_thang         numeric,
  co_wc_rieng       boolean default false,
  co_gac_lung       boolean default false,
  co_may_lanh       boolean default false,
  phu_phi_may_lanh  int,                     -- vd 300000 nếu "máy lạnh +300k"
  co_may_nong_lanh  boolean default false,
  co_tu_lanh        boolean default false,
  co_wifi           boolean default false,
  co_giu_xe         boolean default false,
  co_bep            boolean default false,
  trang_thai        trang_thai_phong not null default 'con_phong',
  ctv_phu_trach     uuid references profiles(id) on delete set null,
  ghi_chu           text,
  link_anh          text,
  ngay_cap_nhat     timestamptz not null default now()
);
create index if not exists idx_phong_khu_tro on phong(khu_tro_id);
create index if not exists idx_phong_trang_thai on phong(trang_thai);

-- 3.5 ktx (mỗi cơ sở KTX — bán theo slot/giường)
create table if not exists ktx (
  id            uuid primary key default gen_random_uuid(),
  ma_ktx        text,
  ten_ktx       text not null,
  dia_chi       text,
  khu_vuc       khu_vuc,
  chu_nha_id    uuid references chu_nha(id) on delete set null,
  gia_tu        int,
  gia_den       int,
  so_slot_trong int,                 -- nullable nếu chỉ ghi "Còn"
  ghi_chu_slot  text,                -- giữ nguyên bản gốc: "<20 slot", "khoảng 20 giường"
  doi_tuong     doi_tuong_ktx,
  tien_ich      text,
  coc_thang     numeric,
  trang_thai    trang_thai_ktx not null default 'con_cho',
  link_anh      text,
  ctv_phu_trach uuid references profiles(id) on delete set null,
  ngay_cap_nhat timestamptz not null default now()
);
create index if not exists idx_ktx_trang_thai on ktx(trang_thai);

-- 3.6 leads (khách đang tìm phòng)
create table if not exists leads (
  id                 uuid primary key default gen_random_uuid(),
  ten_khach          text not null,
  sdt_khach          text,
  ngan_sach          int,
  khu_vuc_mong_muon  text,
  yeu_cau            text,
  trang_thai         trang_thai_lead not null default 'moi',
  ctv_phu_trach      uuid references profiles(id) on delete set null,
  ket_qua            text,
  ngay_tao           timestamptz not null default now()
);
create index if not exists idx_leads_ctv on leads(ctv_phu_trach);

-- 3.7 lich_su_cap_nhat (log đổi trạng thái phòng/KTX)
create table if not exists lich_su_cap_nhat (
  id            uuid primary key default gen_random_uuid(),
  doi_tuong     text not null,        -- 'phong' | 'ktx'
  doi_tuong_id  uuid not null,
  ten_hien_thi  text,                 -- mô tả để hiển thị nhanh
  truong        text,                 -- vd 'trang_thai'
  gia_tri_cu    text,
  gia_tri_moi   text,
  nguoi_cap_nhat uuid references profiles(id) on delete set null,
  thoi_diem     timestamptz not null default now()
);
create index if not exists idx_lichsu_doituong on lich_su_cap_nhat(doi_tuong, doi_tuong_id);

-- ---------- 4. TRIGGERS ----------

-- 4.1 auto ngay_cap_nhat
drop trigger if exists trg_phong_capnhat on phong;
create trigger trg_phong_capnhat before update on phong
  for each row execute function set_ngay_cap_nhat();

drop trigger if exists trg_ktx_capnhat on ktx;
create trigger trg_ktx_capnhat before update on ktx
  for each row execute function set_ngay_cap_nhat();

-- 4.2 log đổi trạng thái phòng
create or replace function log_phong_trang_thai()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.trang_thai is distinct from old.trang_thai then
    insert into lich_su_cap_nhat(doi_tuong, doi_tuong_id, ten_hien_thi, truong, gia_tri_cu, gia_tri_moi, nguoi_cap_nhat)
    values ('phong', new.id, new.so_phong, 'trang_thai', old.trang_thai::text, new.trang_thai::text, auth.uid());
  end if;
  return new;
end $$;

drop trigger if exists trg_phong_log on phong;
create trigger trg_phong_log after update on phong
  for each row execute function log_phong_trang_thai();

-- 4.3 log đổi trạng thái KTX
create or replace function log_ktx_trang_thai()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.trang_thai is distinct from old.trang_thai then
    insert into lich_su_cap_nhat(doi_tuong, doi_tuong_id, ten_hien_thi, truong, gia_tri_cu, gia_tri_moi, nguoi_cap_nhat)
    values ('ktx', new.id, new.ten_ktx, 'trang_thai', old.trang_thai::text, new.trang_thai::text, auth.uid());
  end if;
  return new;
end $$;

drop trigger if exists trg_ktx_log on ktx;
create trigger trg_ktx_log after update on ktx
  for each row execute function log_ktx_trang_thai();

-- 4.4 tự tạo profile khi có user mới đăng ký
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'ctv'),
    new.raw_user_meta_data->>'phone'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- =====================================================================
--  5. ROW LEVEL SECURITY
-- =====================================================================
alter table profiles          enable row level security;
alter table chu_nha           enable row level security;
alter table khu_tro           enable row level security;
alter table phong             enable row level security;
alter table ktx               enable row level security;
alter table leads             enable row level security;
alter table lich_su_cap_nhat  enable row level security;

-- ---------- profiles ----------
-- Ai cũng xem được danh sách (để gán CTV phụ trách, hiển thị tên).
drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles
  for select using (auth.role() = 'authenticated');

-- Mỗi người sửa profile của chính mình; admin sửa mọi profile.
drop policy if exists profiles_update_self on profiles;
create policy profiles_update_self on profiles
  for update using (id = auth.uid() or is_admin())
  with check (id = auth.uid() or is_admin());

-- Chỉ admin được tạo/xóa profile (ngoài trigger handle_new_user).
drop policy if exists profiles_insert_admin on profiles;
create policy profiles_insert_admin on profiles
  for insert with check (is_admin());

drop policy if exists profiles_delete_admin on profiles;
create policy profiles_delete_admin on profiles
  for delete using (is_admin());

-- ---------- chu_nha / khu_tro: mọi user xem; chỉ admin ghi ----------
drop policy if exists chu_nha_select on chu_nha;
create policy chu_nha_select on chu_nha
  for select using (auth.role() = 'authenticated');
drop policy if exists chu_nha_admin_all on chu_nha;
create policy chu_nha_admin_all on chu_nha
  for all using (is_admin()) with check (is_admin());

drop policy if exists khu_tro_select on khu_tro;
create policy khu_tro_select on khu_tro
  for select using (auth.role() = 'authenticated');
drop policy if exists khu_tro_admin_all on khu_tro;
create policy khu_tro_admin_all on khu_tro
  for all using (is_admin()) with check (is_admin());

-- ---------- phong ----------
-- Mọi user xem.
drop policy if exists phong_select on phong;
create policy phong_select on phong
  for select using (auth.role() = 'authenticated');

-- Admin: toàn quyền.
drop policy if exists phong_admin_all on phong;
create policy phong_admin_all on phong
  for all using (is_admin()) with check (is_admin());

-- CTV: được UPDATE (không INSERT/DELETE). Frontend chỉ cho sửa
-- trang_thai/ghi_chu/link_anh/ctv_phu_trach; RLS chặn tạo/xóa.
drop policy if exists phong_ctv_update on phong;
create policy phong_ctv_update on phong
  for update using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ---------- ktx (tương tự phong) ----------
drop policy if exists ktx_select on ktx;
create policy ktx_select on ktx
  for select using (auth.role() = 'authenticated');

drop policy if exists ktx_admin_all on ktx;
create policy ktx_admin_all on ktx
  for all using (is_admin()) with check (is_admin());

drop policy if exists ktx_ctv_update on ktx;
create policy ktx_ctv_update on ktx
  for update using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ---------- leads ----------
-- Mọi user xem tất cả lead.
drop policy if exists leads_select on leads;
create policy leads_select on leads
  for select using (auth.role() = 'authenticated');

-- Admin toàn quyền.
drop policy if exists leads_admin_all on leads;
create policy leads_admin_all on leads
  for all using (is_admin()) with check (is_admin());

-- CTV tạo lead (tự gán mình phụ trách).
drop policy if exists leads_ctv_insert on leads;
create policy leads_ctv_insert on leads
  for insert with check (ctv_phu_trach = auth.uid());

-- CTV chỉ sửa lead mình phụ trách.
drop policy if exists leads_ctv_update on leads;
create policy leads_ctv_update on leads
  for update using (ctv_phu_trach = auth.uid())
  with check (ctv_phu_trach = auth.uid());

-- CTV chỉ xóa lead mình phụ trách.
drop policy if exists leads_ctv_delete on leads;
create policy leads_ctv_delete on leads
  for delete using (ctv_phu_trach = auth.uid());

-- ---------- lich_su_cap_nhat ----------
-- Mọi user xem; ghi qua trigger (security definer) nên không cần policy insert riêng,
-- nhưng cho phép insert từ client phòng trường hợp ghi log thủ công.
drop policy if exists lichsu_select on lich_su_cap_nhat;
create policy lichsu_select on lich_su_cap_nhat
  for select using (auth.role() = 'authenticated');

drop policy if exists lichsu_insert on lich_su_cap_nhat;
create policy lichsu_insert on lich_su_cap_nhat
  for insert with check (auth.role() = 'authenticated');

-- =====================================================================
--  HOÀN TẤT. Bước tiếp theo:
--  1) Tạo user admin đầu tiên ở Authentication -> Users (hoặc đăng ký).
--  2) Cập nhật role: update profiles set role='admin' where id='<uuid>';
--  3) Chạy seed.sql để nạp dữ liệu mẫu.
-- =====================================================================

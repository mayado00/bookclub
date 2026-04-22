-- 독서동아리 Supabase 스키마
-- Supabase SQL Editor에서 실행하세요

-- 1. 책 테이블
create table books (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  author text not null,
  cover_url text,
  description text,
  year_month text not null, -- '2026-04' 형식
  start_date date,
  end_date date,
  status text default 'reading' check (status in ('upcoming', 'reading', 'completed')),
  created_at timestamptz default now()
);

-- 2. 독서 계획 (챕터/주차별)
create table reading_plans (
  id uuid default gen_random_uuid() primary key,
  book_id uuid references books(id) on delete cascade,
  title text not null, -- '1주차: 1~3장' 등
  description text,
  due_date date,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- 3. 생각 카드
create table thoughts (
  id uuid default gen_random_uuid() primary key,
  book_id uuid references books(id) on delete cascade,
  author_name text not null,
  content text not null,
  color text default '#FFF8E7',
  pos_x float default 100,
  pos_y float default 100,
  created_at timestamptz default now()
);

-- 4. 카드 간 연결선
create table connections (
  id uuid default gen_random_uuid() primary key,
  book_id uuid references books(id) on delete cascade,
  from_thought_id uuid references thoughts(id) on delete cascade,
  to_thought_id uuid references thoughts(id) on delete cascade,
  created_at timestamptz default now()
);

-- 5. 댓글
create table comments (
  id uuid default gen_random_uuid() primary key,
  thought_id uuid references thoughts(id) on delete cascade,
  author_name text not null,
  content text not null,
  created_at timestamptz default now()
);

-- 6. 모임 기록
create table meetings (
  id uuid default gen_random_uuid() primary key,
  book_id uuid references books(id) on delete cascade,
  title text not null,
  meeting_date date not null,
  summary text,
  created_at timestamptz default now()
);

-- 7. 모임 사진
create table meeting_photos (
  id uuid default gen_random_uuid() primary key,
  meeting_id uuid references meetings(id) on delete cascade,
  photo_url text not null,
  caption text,
  created_at timestamptz default now()
);

-- RLS (Row Level Security) 비활성화 - 비밀번호 잠금 방식이므로
alter table books enable row level security;
alter table reading_plans enable row level security;
alter table thoughts enable row level security;
alter table connections enable row level security;
alter table comments enable row level security;
alter table meetings enable row level security;
alter table meeting_photos enable row level security;

-- 모든 테이블에 anon 접근 허용 정책
create policy "Allow all" on books for all using (true) with check (true);
create policy "Allow all" on reading_plans for all using (true) with check (true);
create policy "Allow all" on thoughts for all using (true) with check (true);
create policy "Allow all" on connections for all using (true) with check (true);
create policy "Allow all" on comments for all using (true) with check (true);
create policy "Allow all" on meetings for all using (true) with check (true);
create policy "Allow all" on meeting_photos for all using (true) with check (true);

-- Storage 버킷 (모임 사진용)
insert into storage.buckets (id, name, public) values ('meeting-photos', 'meeting-photos', true);
create policy "Allow public upload" on storage.objects for insert with check (bucket_id = 'meeting-photos');
create policy "Allow public read" on storage.objects for select using (bucket_id = 'meeting-photos');

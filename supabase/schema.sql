-- 루팡 길드 (Loopang Guild) — Supabase 스키마
-- 적용: Supabase Dashboard → SQL Editor 에 전체 붙여넣기 후 Run.
-- 재현 가능하도록 idempotent 하게 작성 (여러 번 실행해도 안전).

-- ── 테이블 ────────────────────────────────────────────────
create table if not exists rooms (
  code       text primary key,
  title      text,                                   -- 방 제목 (생성 시 입력, 상세 헤더에 표시)
  created_at timestamptz not null default now()
);

-- 기존 배포 DB 마이그레이션: title 컬럼 추가 (여러 번 실행해도 안전).
alter table rooms add column if not exists title text;

create table if not exists players (
  id           uuid primary key default gen_random_uuid(),
  room_code    text         not null references rooms(code) on delete cascade,
  nickname     text         not null,
  loopang_sec  int          not null default 0,
  productivity numeric(5,1) not null default 100,  -- 생산성 지수(%) — 소수 1자리, 100 에서 하락
  wins         int          not null default 0,    -- 대결 승수 (versus 미니게임)
  losses       int          not null default 0,    -- 대결 패수
  last_seen    timestamptz  not null default now()
);
create index if not exists players_room_code_idx on players(room_code);

-- 기존 배포 DB 마이그레이션: create-if-not-exists 는 컬럼을 바꾸지 않으므로 명시적 ALTER.
-- productivity 를 int → numeric(5,1) 로, 기본값 8 → 100 으로 정정한다 (여러 번 실행해도 안전).
-- (하트비트가 소수 생산성 7.3 등을 보내는데 int 컬럼이 22P02 로 거부하던 문제 수정)
alter table players alter column productivity type numeric(5,1) using productivity::numeric;
alter table players alter column productivity set default 100;

-- 대결 전적 컬럼 (versus 미니게임). 기존 배포 DB 에도 추가.
alter table players add column if not exists wins   int not null default 0;
alter table players add column if not exists losses int not null default 0;

create table if not exists room_state (
  room_code  text primary key references rooms(code) on delete cascade,
  panic      boolean not null default false,  -- 부장님 경보 상태 (S2)
  panic_by   text,
  updated_at timestamptz not null default now()
);

-- ── Realtime publication (Postgres Changes 구독) ──────────
-- players / room_state 변경을 방 전원에게 자동 push.
alter table players     replica identity full;
alter table room_state  replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'players'
  ) then
    alter publication supabase_realtime add table players;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'room_state'
  ) then
    alter publication supabase_realtime add table room_state;
  end if;
end $$;

-- ── RLS (MVP 실용 정책) ───────────────────────────────────
-- 익명 서비스: anon 이 읽고, 참여자 현황/경보 토글을 쓸 수 있게 허용.
-- rooms INSERT 는 서버(service role, RLS 우회) 전용 → 코드 발급 제어.
alter table rooms      enable row level security;
alter table players    enable row level security;
alter table room_state enable row level security;

-- rooms: 누구나 조회 (입장 코드 검증용). INSERT 정책 없음 → anon 생성 불가.
drop policy if exists rooms_select on rooms;
create policy rooms_select on rooms for select to anon using (true);

-- players: 조회/입장(INSERT)/본인현황 갱신(UPDATE) 허용.
drop policy if exists players_select on players;
create policy players_select on players for select to anon using (true);
drop policy if exists players_insert on players;
create policy players_insert on players for insert to anon with check (true);
drop policy if exists players_update on players;
create policy players_update on players for update to anon using (true) with check (true);

-- room_state: 조회 + 경보 토글(UPDATE) 허용. (S2)
drop policy if exists room_state_select on room_state;
create policy room_state_select on room_state for select to anon using (true);
drop policy if exists room_state_update on room_state;
create policy room_state_update on room_state for update to anon using (true) with check (true);

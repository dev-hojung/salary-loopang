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
  room_code       text primary key references rooms(code) on delete cascade,
  panic           boolean not null default false,  -- 부장님 경보 상태 (S2)
  panic_by        text,
  last_reset_date text,                            -- 마지막 일일 리셋 날짜(YYYY-MM-DD, 로컬) (S3)
  last_king_nick  text,                            -- 전날 루팡왕 닉네임(박제) (S3)
  updated_at      timestamptz not null default now()
);

-- 기존 배포 DB 마이그레이션: 일일 리셋/루팡왕 박제 컬럼 추가 (여러 번 실행해도 안전).
alter table room_state add column if not exists last_reset_date text;
alter table room_state add column if not exists last_king_nick  text;

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

-- ── RLS (P0 트랙 A: 서버 권위 write) ──────────────────────
-- anon 은 '읽기'만 가능(실시간 구독 위해 SELECT 유지). 모든 write(입장·하트비트·경보·대결·리셋·일별기록)는
-- 서버 라우트(service role, RLS 우회)만 수행 → 남의 방 데이터 변조/그리핑/랭킹 위조 차단.
-- (읽기 노출(B3)은 P1에서 고빈도 상태를 Broadcast 로 옮기며 마감 예정.)
alter table rooms      enable row level security;
alter table players    enable row level security;
alter table room_state enable row level security;

-- rooms: 누구나 조회 (입장 코드 검증용). INSERT 정책 없음 → anon 생성 불가.
drop policy if exists rooms_select on rooms;
create policy rooms_select on rooms for select to anon using (true);

-- players: 조회(anon)만. 입장(INSERT)·현황 갱신(UPDATE)은 서버 라우트(service role) 전용 (A3).
drop policy if exists players_select on players;
create policy players_select on players for select to anon using (true);
-- A3: anon 직접 write 정책 제거 (입장/하트비트/대결/리셋은 모두 서버 라우트 경유).
drop policy if exists players_insert on players;
drop policy if exists players_update on players;

-- room_state: 조회(anon)만. 경보 토글·일일 리셋은 서버 라우트(service role) 전용 (A3).
drop policy if exists room_state_select on room_state;
create policy room_state_select on room_state for select to anon using (true);
-- A3: anon 직접 UPDATE 정책 제거.
drop policy if exists room_state_update on room_state;

-- ── 일별 루팡왕 기록 (S4 · B-5b) ──────────────────────────
-- 일일 리셋 시점에 '방금 끝난 날'의 루팡왕을 한 줄 남긴다. (room_code, date) 당 1행.
create table if not exists daily_records (
  room_code         text        not null references rooms(code) on delete cascade,
  date              text        not null,          -- 종료된 날 (YYYY-MM-DD)
  king_nick         text,                          -- 그날의 루팡왕 닉네임
  king_productivity numeric(5,1),                  -- 그날 최저 생산성(=왕의 값)
  recorded_at       timestamptz not null default now(),
  primary key (room_code, date)
);

alter table daily_records enable row level security;
-- 조회(anon)만. 기록(INSERT/UPSERT)은 서버 리셋 라우트(service role) 전용 (A3).
drop policy if exists daily_records_select on daily_records;
create policy daily_records_select on daily_records for select to anon using (true);
-- A3: anon 직접 write 정책 제거.
drop policy if exists daily_records_insert on daily_records;
drop policy if exists daily_records_update on daily_records;

-- ── 최소 신원 (player_auth) — P0 트랙 A ────────────────────
-- join 시 서버가 발급한 secret 의 해시만 저장한다. 원문 secret 은 httpOnly 쿠키로만 존재.
-- 정책을 만들지 않음 → anon 은 select/insert/update 전부 불가. service role(RLS 우회)만 접근한다.
-- (players 테이블에 넣지 않으므로 anon 의 `select * from players` 로도 secret 이 노출되지 않는다.)
create table if not exists player_auth (
  player_id   uuid        primary key references players(id) on delete cascade,
  secret_hash text        not null,
  created_at  timestamptz not null default now()
);
alter table player_auth enable row level security;

-- ── 대결 전적 원자적 증가 (P0 트랙 A · B7) ────────────────
-- read-modify-write 경합으로 승수가 유실되지 않도록 단일 문장 증가.
-- service role(서버 라우트)만 호출한다. anon 에는 execute 권한을 주지 않는다.
create or replace function increment_duel(winner uuid, loser uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update players set wins   = wins   + 1 where id = winner;
  update players set losses = losses + 1 where id = loser;
$$;
revoke all on function increment_duel(uuid, uuid) from public, anon;
grant execute on function increment_duel(uuid, uuid) to service_role;

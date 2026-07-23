'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useParams } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabaseClient';
import { loadPlayerSession, savePlayerSession, type PlayerSession } from '@/lib/session';
import type { JoinRoomResponse, Player, RoomApiError } from '@/lib/types';
import SalaryEngine from '@/components/SalaryEngine';
import GameHub from '@/components/GameHub';
import PlayerCard from '@/components/PlayerCard';
import { ProductivityProvider } from '@/lib/productivity';
import { DuelProvider } from '@/components/duel/DuelProvider';
import DuelOverlay from '@/components/duel/DuelOverlay';
import BossAlert from '@/components/BossAlert';
import DailyReset from '@/components/DailyReset';
import InviteButton from '@/components/InviteButton';
import PushOptIn from '@/components/PushOptIn';
import Reactions from '@/components/Reactions';
import HallOfFame from '@/components/HallOfFame';
import DailyKings from '@/components/DailyKings';

const HEARTBEAT_MS = 5000;
const ONLINE_WINDOW_MS = 15000; // 하트비트 3회(15초) 이상 조용하면 '자리비움'
const STALE_DROP_MS = 10 * 60 * 1000; // 10분 넘게 조용하면 목록에서 제외(사실상 퇴장)

// 랭크 정렬: 생산성 오름차순(낮을수록 = 더 많이 논 사람 = 상위). 동률이면 누적 루팡 시간이 많은 쪽이 위.
function sortByRank(list: Player[]): Player[] {
  return [...list].sort(
    (a, b) => a.productivity - b.productivity || b.loopang_sec - a.loopang_sec,
  );
}

function lastSeenMs(p: Player): number {
  const t = Date.parse(p.last_seen);
  return Number.isNaN(t) ? 0 : t;
}

export default function RoomPage() {
  const code = String(useParams().code).toUpperCase();

  // 세션 (localStorage) 확인
  const [session, setSession] = useState<PlayerSession | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  // 방 제목 (생성 시 입력값). 헤더에 표시.
  const [roomTitle, setRoomTitle] = useState<string | null>(null);

  // 어제의 루팡왕 (DailyReset 에서 올려줌 — 업적 판정용).
  const [yesterdayKing, setYesterdayKing] = useState<string | null>(null);

  // 입장 폼
  const [nickname, setNickname] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // 방 현황
  const [players, setPlayers] = useState<Player[]>([]);

  // last_seen 신선도 재평가용 시계 (5초마다 tick). 0 = 첫 페인트(전원 온라인 간주 → 하이드레이션 안전).
  const [now, setNow] = useState(0);

  // 생산성은 SalaryEngine 이 갱신한 값을 하트비트가 서버로 전달한다. (loopang_sec 는 서버가 산출)
  const productivityRef = useRef(100);
  // SalaryEngine 의 실제 생산성이 유일한 소스 — 콜백으로 ref 를 갱신하면 하트비트가 그대로 DB 에 반영한다.
  const handleProdChange = useCallback((prod: number) => {
    productivityRef.current = prod;
  }, []);
  // SalaryEngine 의 시작 생산성 (DB 저장값으로 이어서 시작). 초기 로드 완료 전엔 null.
  const [myProd0, setMyProd0] = useState<number | null>(null);

  // 1) 마운트 시 로컬 세션 확인 (공유 링크로 직접 들어온 경우 null일 수 있음)
  // localStorage는 브라우저 전용 API라 렌더 중에는 읽을 수 없어 effect에서 읽는다 (SSR-safe).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSession(loadPlayerSession(code));
    setSessionChecked(true);
  }, [code]);

  // 1-b) 방 제목 조회 (anon select 허용). 입장 여부와 무관하게 헤더에 표시.
  useEffect(() => {
    let active = true;
    getSupabaseBrowser()
      .from('rooms')
      .select('title')
      .eq('code', code)
      .maybeSingle()
      .then(({ data }) => {
        if (active && data?.title) setRoomTitle(data.title as string);
      });
    return () => {
      active = false;
    };
  }, [code]);

  // 1-c) last_seen 신선도 재평가 시계. 데이터 변경 없이도 5초마다 온라인/자리비움을 다시 계산.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 마운트 후 시계 기동(now=0 sentinel→실제 시각, SSR-safe 의도)
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);

  // 2) 세션이 있으면: 초기 로드 + 실시간 구독 + 내 하트비트
  useEffect(() => {
    if (!session) return;
    const playerId = session.id;

    let active = true;
    const supabase = getSupabaseBrowser();
    const channel = supabase.channel(`room-live:${code}`);
    let heartbeatId: ReturnType<typeof setInterval> | null = null;

    async function init() {
      const { data, error } = await supabase.from('players').select('*').eq('room_code', code);
      if (!active) return;

      if (error) {
        console.error('players 조회 실패', error);
        setMyProd0(100);
        return;
      }

      const list = sortByRank((data ?? []) as Player[]);
      setPlayers(list);

      const me = list.find((p) => p.id === playerId);
      const startProd = me?.productivity ?? 100;
      productivityRef.current = startProd;
      setMyProd0(startProd);

      channel
        .on('broadcast', { event: 'player' }, ({ payload }) => {
          // 서버가 mutation(하트비트/입장/대결) 후 push 한 authoritative player row 를 반영.
          const row = payload as Player;
          setPlayers((prev) => {
            const exists = prev.some((p) => p.id === row.id);
            const next = exists
              ? prev.map((p) => (p.id === row.id ? row : p))
              : [...prev, row];
            return sortByRank(next);
          });
          // 퇴장은 last_seen 기반 stale 필터가 처리(별도 delete 이벤트 불필요).
        })
        .subscribe();

      heartbeatId = setInterval(() => {
        // 서버 권위 하트비트: loopang_sec 는 서버가 시간 델타로 산출하고, 생산성만 전달한다.
        // 신원은 httpOnly 쿠키(join 시 발급)로 서버가 검증 → 본인 행만 갱신.
        fetch('/api/room/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            productivity: Math.round(productivityRef.current * 10) / 10,
          }),
        }).catch((e) => console.error('하트비트 실패', e));
      }, HEARTBEAT_MS);
    }

    init();

    return () => {
      active = false;
      if (heartbeatId) clearInterval(heartbeatId);
      supabase.removeChannel(channel);
    };
  }, [session, code]);

  async function handleJoin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = nickname.trim();
    if (!trimmed) {
      setJoinError('닉네임을 입력해주세요');
      return;
    }

    setJoining(true);
    setJoinError(null);
    try {
      const res = await fetch('/api/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join', code, nickname: trimmed }),
      });
      const body = (await res.json()) as JoinRoomResponse | RoomApiError;

      if (!res.ok || 'error' in body) {
        setJoinError('error' in body ? body.error : '입장에 실패했습니다');
        return;
      }

      const newSession: PlayerSession = {
        id: body.player.id,
        nickname: body.player.nickname,
        room_code: code,
      };
      savePlayerSession(newSession);
      setSession(newSession);
    } catch {
      setJoinError('네트워크 오류가 발생했습니다');
    } finally {
      setJoining(false);
    }
  }

  // last_seen 기준 온라인/자리비움 분리. now===0(첫 페인트)엔 전원 온라인 간주.
  const isFresh = (p: Player) => now === 0 || now - lastSeenMs(p) < STALE_DROP_MS;
  const isOnline = (p: Player) => now === 0 || now - lastSeenMs(p) < ONLINE_WINDOW_MS;
  const visiblePlayers = players.filter(isFresh);
  const onlinePlayers = visiblePlayers.filter(isOnline);
  const offlinePlayers = visiblePlayers.filter((p) => !isOnline(p));

  return (
    <>
      <header>
        <div className="brand">
          <div className="logo">S</div>
          <div>
            <h1>{roomTitle ?? 'SMART WORK INSIGHT™'}</h1>
            <p>
              {roomTitle ? 'SMART WORK INSIGHT™ · 코드 ' : '메이트 공동 관제 콘솔 · 코드 '}
              <span className="mono" style={{ color: '#fff', fontWeight: 700 }}>
                {code}
              </span>
            </p>
          </div>
        </div>
        <div className="live">
          <span className="dot" /> 실시간 연동 중 · 자동 갱신
        </div>
      </header>

      <div className="wrap">
        {!sessionChecked && <p className="label">불러오는 중...</p>}

        {sessionChecked && !session && (
          <div className="card" style={{ maxWidth: 380, margin: '48px auto', textAlign: 'center' }}>
            <div className="card-h" style={{ justifyContent: 'center' }}>
              <span className="t">메이트 입장 · 코드 {code}</span>
            </div>
            <form
              onSubmit={handleJoin}
              style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
            >
              <input
                className="mono"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="닉네임 입력"
                maxLength={20}
                style={{
                  border: '1px solid var(--line)',
                  borderRadius: 8,
                  padding: '10px 12px',
                  fontSize: 14,
                  textAlign: 'center',
                }}
              />
              <button className="btn" type="submit" disabled={joining}>
                {joining ? '입장 중...' : '입장'}
              </button>
            </form>
            {joinError && (
              <div className="label" style={{ marginTop: 10, color: 'var(--red)' }}>
                {joinError}
              </div>
            )}
          </div>
        )}

        {sessionChecked && session && myProd0 === null && (
          <p className="label">불러오는 중...</p>
        )}

        {sessionChecked && session && myProd0 !== null && (
          <ProductivityProvider initial={myProd0} onChange={handleProdChange}>
            <DuelProvider code={code} meId={session.id} meNickname={session.nickname}>
              <section style={{ marginBottom: 16 }}>
                <div className="card-h">
                  <span className="t">메이트 현황</span>
                  <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className="badge">{onlinePlayers.length}명 접속 중</span>
                    <InviteButton code={code} />
                    <PushOptIn code={code} />
                  </span>
                </div>
                <DailyReset code={code} onKing={setYesterdayKing} />
                <div className="grid">
                  {onlinePlayers.map((p, i) => (
                    <PlayerCard
                      key={p.id}
                      player={p}
                      rank={i + 1}
                      isMe={p.id === session.id}
                      online
                      isKing={i === 0 && onlinePlayers.length >= 2}
                      yesterdayKing={yesterdayKing}
                    />
                  ))}
                  {offlinePlayers.map((p) => (
                    <PlayerCard
                      key={p.id}
                      player={p}
                      isMe={p.id === session.id}
                      online={false}
                      yesterdayKing={yesterdayKing}
                    />
                  ))}
                </div>
                {onlinePlayers.length <= 1 && offlinePlayers.length === 0 && (
                  <div
                    className="card"
                    style={{
                      marginTop: 10,
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ fontSize: 15, fontWeight: 700 }}>아직 혼자예요 🥲</div>
                    <div className="label" style={{ lineHeight: 1.6 }}>
                      부장님 경보·1:1 대결·랭킹은 <b>여럿일수록</b> 재밌어요.
                      <br />
                      코드 <b className="mono">{code}</b> 를 동료에게 공유하면 바로 합류!
                    </div>
                    <InviteButton code={code} />
                  </div>
                )}
              </section>

              <BossAlert code={code} meNickname={session.nickname} />
              <SalaryEngine />
              <GameHub />
              <HallOfFame players={players} />
              <DailyKings code={code} />
              <DuelOverlay />
              <Reactions code={code} />

              <footer>
                SMART WORK INSIGHT™ v2.4.1 Enterprise Edition · 모든 지표는 실시간이며 아무 의미가 없습니다
                <br />
                <b>본 시스템은 어떠한 업무 생산성도 향상시키지 않음을 보증합니다.</b>
              </footer>
            </DuelProvider>
          </ProductivityProvider>
        )}
      </div>
    </>
  );
}

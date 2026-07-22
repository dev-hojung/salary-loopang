'use client';

// 대결(versus) 매치의 전송·상태머신·보상을 담당하는 컨텍스트.
// - 채널 duel:{code} 브로드캐스트로 도전/수락/거절/입력/취소를 주고받는다(일시적, DB 매치 테이블 없음).
// - 결과 확정 시 각자 본인 행만 갱신(승자 wins++, 패자 losses++) → postgres_changes 로 전원 반영.
// - 승/패 보상은 생산성 slack()(내려가기만) + 별도 승점.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { getSupabaseBrowser } from '@/lib/supabaseClient';
import { useProductivity } from '@/lib/productivity';
import {
  CHALLENGE_TIMEOUT_MS,
  DUEL_EVENTS,
  LOSE_SLACK,
  WIN_SLACK,
  type DuelGame,
  type DuelPeer,
} from '@/lib/duel';

type MatchPhase = 'challenging' | 'challenged' | 'playing' | 'result';

type Match = {
  matchId: string;
  game: DuelGame;
  role: 'challenger' | 'opponent';
  opponent: DuelPeer;
  phase: MatchPhase;
  result?: { iWon: boolean; detail: string };
};

type InputListener = (payload: unknown, fromId: string) => void;

type DuelContextValue = {
  meId: string;
  match: Match | null;
  busy: boolean;
  notice: string | null;
  clearNotice: () => void;
  challenge: (opponent: DuelPeer, game?: DuelGame) => void;
  accept: () => void;
  decline: () => void;
  cancel: () => void;
  close: () => void;
  sendInput: (payload: unknown) => void;
  onInput: (cb: InputListener) => () => void;
  finish: (winnerId: string, detail: string) => void;
};

const DuelContext = createContext<DuelContextValue | null>(null);

export function DuelProvider({
  code,
  meId,
  meNickname,
  children,
}: {
  code: string;
  meId: string;
  meNickname: string;
  children: ReactNode;
}) {
  const { slack } = useProductivity();

  const [match, setMatchState] = useState<Match | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const matchRef = useRef<Match | null>(null);
  const channelRef = useRef<ReturnType<ReturnType<typeof getSupabaseBrowser>['channel']> | null>(null);
  const inputListeners = useRef<Set<InputListener>>(new Set());
  const appliedMatches = useRef<Set<string>>(new Set());
  const challengeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 상태와 ref 를 함께 갱신 (채널 핸들러는 최신 값을 ref 로 읽는다).
  const setMatch = useCallback((next: Match | null) => {
    matchRef.current = next;
    setMatchState(next);
  }, []);

  const send = useCallback((event: string, payload: Record<string, unknown>) => {
    channelRef.current?.send({ type: 'broadcast', event, payload });
  }, []);

  const clearChallengeTimeout = useCallback(() => {
    if (challengeTimeout.current) {
      clearTimeout(challengeTimeout.current);
      challengeTimeout.current = null;
    }
  }, []);

  // 대결 결과를 서버에 보고 — 양 피어 대조 후 서버가 원자적으로 기록(클라 직접 write 금지, 위조 방지).
  const reportResult = useCallback(
    async (winnerId: string) => {
      const m = matchRef.current;
      if (!m) return;
      const loserId = winnerId === meId ? m.opponent.id : meId;
      try {
        await fetch('/api/duel/result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, matchId: m.matchId, winnerId, loserId }),
        });
      } catch (e) {
        console.warn('대결 결과 전송 실패', e);
      }
    },
    [code, meId],
  );

  const finish = useCallback(
    (winnerId: string, detail: string) => {
      const m = matchRef.current;
      if (!m || appliedMatches.current.has(m.matchId)) return;
      appliedMatches.current.add(m.matchId);
      clearChallengeTimeout();

      const won = winnerId === meId;
      slack(
        won ? WIN_SLACK : LOSE_SLACK,
        won ? `대결 승리 (생산성 -${WIN_SLACK})` : `대결 패배 (생산성 -${LOSE_SLACK})`,
      );
      setMatch({ ...m, phase: 'result', result: { iWon: won, detail } });
      void reportResult(winnerId);
    },
    [meId, slack, clearChallengeTimeout, setMatch, reportResult],
  );

  // ── 채널 구독 (마운트 1회) ──────────────────────────────
  useEffect(() => {
    const supabase = getSupabaseBrowser();
    const channel = supabase.channel(`duel:${code}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: DUEL_EVENTS.challenge }, ({ payload }) => {
        const p = payload as { matchId: string; from: DuelPeer; toId: string; game: DuelGame };
        if (p.toId !== meId) return;
        if (matchRef.current) {
          // 이미 대결 중 → 자동 거절
          channelRef.current?.send({
            type: 'broadcast',
            event: DUEL_EVENTS.decline,
            payload: { matchId: p.matchId },
          });
          return;
        }
        setMatch({
          matchId: p.matchId,
          game: p.game,
          role: 'opponent',
          opponent: p.from,
          phase: 'challenged',
        });
      })
      .on('broadcast', { event: DUEL_EVENTS.accept }, ({ payload }) => {
        const p = payload as { matchId: string };
        const m = matchRef.current;
        if (!m || m.matchId !== p.matchId || m.role !== 'challenger') return;
        clearChallengeTimeout();
        setMatch({ ...m, phase: 'playing' });
      })
      .on('broadcast', { event: DUEL_EVENTS.decline }, ({ payload }) => {
        const p = payload as { matchId: string };
        const m = matchRef.current;
        if (!m || m.matchId !== p.matchId) return;
        clearChallengeTimeout();
        setMatch(null);
        setNotice('상대가 도전을 거절했어요');
      })
      .on('broadcast', { event: DUEL_EVENTS.input }, ({ payload }) => {
        const p = payload as { matchId: string; fromId: string; payload: unknown };
        const m = matchRef.current;
        if (!m || m.matchId !== p.matchId || p.fromId === meId) return;
        inputListeners.current.forEach((cb) => cb(p.payload, p.fromId));
      })
      .on('broadcast', { event: DUEL_EVENTS.cancel }, ({ payload }) => {
        const p = payload as { matchId: string };
        const m = matchRef.current;
        if (!m || m.matchId !== p.matchId) return;
        clearChallengeTimeout();
        setMatch(null);
        setNotice('대결이 취소되었어요');
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      clearChallengeTimeout();
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [code, meId, setMatch, clearChallengeTimeout]);

  // ── 공개 메서드 ─────────────────────────────────────────
  const challenge = useCallback(
    (opponent: DuelPeer, game: DuelGame = 'rps') => {
      if (matchRef.current || opponent.id === meId) return;
      const matchId = crypto.randomUUID();
      setMatch({ matchId, game, role: 'challenger', opponent, phase: 'challenging' });
      send(DUEL_EVENTS.challenge, {
        matchId,
        from: { id: meId, nickname: meNickname },
        toId: opponent.id,
        game,
      });
      challengeTimeout.current = setTimeout(() => {
        const m = matchRef.current;
        if (m?.matchId === matchId && m.phase === 'challenging') {
          send(DUEL_EVENTS.cancel, { matchId });
          setMatch(null);
          setNotice('상대가 응답하지 않았어요');
        }
      }, CHALLENGE_TIMEOUT_MS);
    },
    [meId, meNickname, send, setMatch],
  );

  const accept = useCallback(() => {
    const m = matchRef.current;
    if (!m || m.role !== 'opponent' || m.phase !== 'challenged') return;
    send(DUEL_EVENTS.accept, { matchId: m.matchId });
    setMatch({ ...m, phase: 'playing' });
  }, [send, setMatch]);

  const decline = useCallback(() => {
    const m = matchRef.current;
    if (!m || m.role !== 'opponent') return;
    send(DUEL_EVENTS.decline, { matchId: m.matchId });
    setMatch(null);
  }, [send, setMatch]);

  const cancel = useCallback(() => {
    const m = matchRef.current;
    if (!m) return;
    send(DUEL_EVENTS.cancel, { matchId: m.matchId });
    clearChallengeTimeout();
    setMatch(null);
  }, [send, setMatch, clearChallengeTimeout]);

  const close = useCallback(() => {
    setMatch(null);
  }, [setMatch]);

  const sendInput = useCallback(
    (payload: unknown) => {
      const m = matchRef.current;
      if (!m) return;
      send(DUEL_EVENTS.input, { matchId: m.matchId, fromId: meId, payload });
    },
    [meId, send],
  );

  const onInput = useCallback((cb: InputListener) => {
    inputListeners.current.add(cb);
    return () => {
      inputListeners.current.delete(cb);
    };
  }, []);

  const clearNotice = useCallback(() => setNotice(null), []);

  const value = useMemo<DuelContextValue>(
    () => ({
      meId,
      match,
      busy: match !== null,
      notice,
      clearNotice,
      challenge,
      accept,
      decline,
      cancel,
      close,
      sendInput,
      onInput,
      finish,
    }),
    [
      meId,
      match,
      notice,
      clearNotice,
      challenge,
      accept,
      decline,
      cancel,
      close,
      sendInput,
      onInput,
      finish,
    ],
  );

  return <DuelContext.Provider value={value}>{children}</DuelContext.Provider>;
}

export function useDuel(): DuelContextValue {
  const value = useContext(DuelContext);
  if (!value) {
    throw new Error('useDuel 는 <DuelProvider> 안에서만 사용할 수 있습니다');
  }
  return value;
}

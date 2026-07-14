'use client';

// S2/S3 · 부장님 경보 (보스키) — 방 전체가 공유하는 패닉 상태.
// - 누구나 "부장님 떴다" 트리거 → room_state.panic=true 로 DB 갱신 → 전원 위장 화면.
// - S3 고도화: 자동 해제 카운트다운 · 재발령 쿨다운 · 알림음/진동 · 위장화면 취향 선택(로컬).
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { getSupabaseBrowser } from '@/lib/supabaseClient';
import type { RoomState } from '@/lib/types';

const PANIC_DURATION_MS = 20000; // 20초 뒤 자동 해제
const COOLDOWN_MS = 6000; // 해제 후 재발령 쿨다운

type Disguise = 'spreadsheet' | 'email' | 'code';
const DISGUISES: { key: Disguise; label: string }[] = [
  { key: 'spreadsheet', label: '📊 시트' },
  { key: 'email', label: '📧 메일' },
  { key: 'code', label: '💻 코드' },
];
const DISGUISE_STORAGE_KEY = 'loopang:disguise';

// 파일 없이 짧은 경보음 2회 + 모바일 진동. 오디오 정책/미지원 시 조용히 무시.
function playAlarm() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Ctx) {
      const ctx = new Ctx();
      const beep = (at: number, freq: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime + at);
        gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + at + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + 0.18);
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + at);
        osc.stop(ctx.currentTime + at + 0.2);
      };
      beep(0, 880);
      beep(0.22, 880);
      setTimeout(() => void ctx.close().catch(() => {}), 800);
    }
  } catch {
    /* 무시 */
  }
  try {
    navigator.vibrate?.([200, 100, 200]);
  } catch {
    /* 무시 */
  }
}

// ── 위장 화면 3종 (각자 툴바 + 본문을 렌더; 하단 바는 오버레이가 추가) ──
function SpreadsheetDisguise() {
  return (
    <>
      <div style={toolbarStyle('#1f6e43')}>
        <span>📊</span>
        <span>2026년 3분기 실적 예상 취합_최종_진짜최종_v4.xlsx</span>
        <span style={{ marginLeft: 'auto', fontWeight: 400, opacity: 0.85 }}>자동 저장됨 · 편집 중</span>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 13,
            color: '#222',
            fontFamily: "'IBM Plex Mono', monospace",
          }}
        >
          <thead>
            <tr style={{ background: '#f1f3f5' }}>
              {['항목', '1월', '2월', '3월', '누계', '달성률', '비고'].map((h) => (
                <th key={h} style={{ border: '1px solid #dee2e6', padding: '6px 10px', textAlign: 'left' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 24 }).map((_, r) => (
              <tr key={r}>
                {Array.from({ length: 7 }).map((__, c) => (
                  <td
                    key={c}
                    style={{ border: '1px solid #e9ecef', padding: '6px 10px', color: c === 0 ? '#333' : '#868e96' }}
                  >
                    {c === 0
                      ? `실적 항목 ${r + 1}`
                      : c === 5
                        ? `${60 + ((r * 7) % 40)}%`
                        : `${((r + 1) * (c + 3) * 137) % 9000}`}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function EmailDisguise() {
  const mails: [string, string, string][] = [
    ['[공유] 3분기 KPI 취합 요청의 건', '김부장', '오전 9:14'],
    ['RE: RE: RE: 주간보고 양식 변경 안내', '이과장', '오전 9:02'],
    ['[전사] 하계 휴가 신청 마감 D-1', '인사팀', '오전 8:51'],
    ['회의실 예약 확인 (3F 대회의실 10:30)', '총무팀', '어제'],
    ['[중요] 정보보안 교육 미이수자 안내', '보안팀', '어제'],
    ['비용 정산 반려 안내 (증빙 누락)', '재무팀', '어제'],
    ['[공지] 사내 메신저 점검 안내', 'IT지원', '2일 전'],
    ['프로젝트 킥오프 일정 조율 부탁드립니다', '박선임', '2일 전'],
    ['[알림] 근태 마감 처리 요청', '인사팀', '3일 전'],
    ['점심 같이 하실 분 (선착순)', '동호회', '3일 전'],
  ];
  return (
    <>
      <div style={toolbarStyle('#0b5cab')}>
        <span>📧</span>
        <span>받은 편지함</span>
        <span style={{ marginLeft: 'auto', fontWeight: 400, opacity: 0.85 }}>읽지 않음 47</span>
      </div>
      <div style={{ flex: 1, overflow: 'auto', fontSize: 13, color: '#222' }}>
        {mails.map(([subj, from, when], i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              gap: 12,
              padding: '11px 16px',
              borderBottom: '1px solid #eef1f4',
              background: i % 2 ? '#fff' : '#fafbfc',
            }}
          >
            <span style={{ width: 90, color: '#495057', fontWeight: 600, flexShrink: 0 }}>{from}</span>
            <span style={{ flex: 1, fontWeight: i < 3 ? 700 : 400 }}>{subj}</span>
            <span style={{ color: '#adb5bd', flexShrink: 0 }}>{when}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function CodeDisguise() {
  const lines = [
    "import { reconcile } from './lib/report';",
    '',
    'export async function generateQuarterlyReport(quarter: number) {',
    '  const rows = await fetchKpiRows(quarter);',
    '  const totals = rows.reduce((acc, r) => acc + r.value, 0);',
    '  // TODO: 부장님 요청대로 소수점 2자리 반올림 처리',
    '  const summary = reconcile(rows, { round: 2 });',
    '',
    '  if (summary.achievement < TARGET) {',
    '    logger.warn("목표 미달 — 사유서 첨부 필요");',
    '  }',
    '',
    '  return { quarter, totals, summary, generatedAt: Date.now() };',
    '}',
    '',
    '// 옆 팀 코드였던 것으로 확인됨. 일단 그대로 둠.',
  ];
  return (
    <>
      <div style={toolbarStyle('#252526', '#ccc')}>
        <span>💻</span>
        <span>quarterly_report_generator.ts — main*</span>
        <span style={{ marginLeft: 'auto', fontWeight: 400, opacity: 0.7 }}>TypeScript · UTF-8</span>
      </div>
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          background: '#1e1e1e',
          color: '#d4d4d4',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 13,
          lineHeight: 1.7,
          padding: '10px 0',
        }}
      >
        {lines.map((l, i) => (
          <div key={i} style={{ display: 'flex' }}>
            <span style={{ width: 44, textAlign: 'right', paddingRight: 14, color: '#6a737d', userSelect: 'none' }}>
              {i + 1}
            </span>
            <span style={{ whiteSpace: 'pre' }}>{l}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function toolbarStyle(bg: string, color = '#fff'): CSSProperties {
  return {
    background: bg,
    color,
    padding: '8px 14px',
    fontSize: 13,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  };
}

export default function BossAlert({ code, meNickname }: { code: string; meNickname: string }) {
  const [panic, setPanic] = useState(false);
  const [panicBy, setPanicBy] = useState<string | null>(null);
  const [panicAt, setPanicAt] = useState(0); // 발령 시각(ms) — updated_at 기준, 전원 동기
  const [busy, setBusy] = useState(false);
  const [cooling, setCooling] = useState(false);
  const [now, setNow] = useState(0);
  const [disguise, setDisguise] = useState<Disguise>('spreadsheet');

  const prevPanic = useRef(false);
  const autoClearedFor = useRef(-1); // 이 panicAt 에 대해 자동 해제를 이미 시도했는지

  // 위장화면 취향 로드 (로컬)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DISGUISE_STORAGE_KEY) as Disguise | null;
      if (saved && DISGUISES.some((d) => d.key === saved)) setDisguise(saved);
    } catch {
      /* 무시 */
    }
  }, []);

  const chooseDisguise = useCallback((d: Disguise) => {
    setDisguise(d);
    try {
      localStorage.setItem(DISGUISE_STORAGE_KEY, d);
    } catch {
      /* 무시 */
    }
  }, []);

  // 초기 상태 로드 + 실시간 구독
  useEffect(() => {
    let active = true;
    const supabase = getSupabaseBrowser();
    const channel = supabase.channel(`room_state:${code}`);

    function apply(row: Pick<RoomState, 'panic' | 'panic_by' | 'updated_at'>) {
      setPanic(!!row.panic);
      setPanicBy(row.panic_by ?? null);
      setPanicAt(row.updated_at ? Date.parse(row.updated_at) : 0);
    }

    async function init() {
      const { data } = await supabase
        .from('room_state')
        .select('panic, panic_by, updated_at')
        .eq('room_code', code)
        .maybeSingle();
      if (!active) return;
      if (data) apply(data as Pick<RoomState, 'panic' | 'panic_by' | 'updated_at'>);

      channel
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'room_state', filter: `room_code=eq.${code}` },
          (payload: RealtimePostgresChangesPayload<RoomState>) => {
            if (payload.eventType === 'DELETE') return;
            apply(payload.new);
          },
        )
        .subscribe();
    }

    init();
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [code]);

  const setPanicState = useCallback(
    async (next: boolean) => {
      setBusy(true);
      const nowIso = new Date().toISOString();
      // 낙관적 반영 (브로드캐스트 에코가 곧 덮어씀).
      setPanic(next);
      setPanicBy(next ? meNickname : null);
      if (next) setPanicAt(Date.parse(nowIso));
      else {
        setCooling(true);
        setTimeout(() => setCooling(false), COOLDOWN_MS);
      }
      const { error } = await getSupabaseBrowser()
        .from('room_state')
        .update({ panic: next, panic_by: next ? meNickname : null, updated_at: nowIso })
        .eq('room_code', code);
      if (error) console.error('경보 갱신 실패', error);
      setBusy(false);
    },
    [code, meNickname],
  );

  // 경보 진입(false→true) 시 알림음/진동
  useEffect(() => {
    if (panic && !prevPanic.current) playAlarm();
    prevPanic.current = panic;
  }, [panic]);

  // 카운트다운용 시계 (경보 중에만 250ms tick)
  useEffect(() => {
    if (!panic) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [panic, panicAt]);

  const remainingMs = panic && panicAt ? Math.max(0, PANIC_DURATION_MS - (now - panicAt)) : 0;

  // 시간 만료 시 자동 해제 (episode 당 1회만 시도)
  useEffect(() => {
    if (!panic || !panicAt || now === 0) return;
    if (now - panicAt >= PANIC_DURATION_MS && autoClearedFor.current !== panicAt) {
      autoClearedFor.current = panicAt;
      void setPanicState(false);
    }
  }, [panic, panicAt, now, setPanicState]);

  return (
    <>
      {/* 평상시 트리거 + 위장화면 취향 선택 */}
      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          className="btn"
          onClick={() => setPanicState(true)}
          disabled={busy || panic || cooling}
          style={{ background: 'var(--red)' }}
        >
          {cooling ? '🚨 재발령 대기 중...' : '🚨 부장님 떴다! (전체 경보)'}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span className="label">내 위장화면:</span>
          {DISGUISES.map((d) => (
            <button
              key={d.key}
              className="btn ghost"
              onClick={() => chooseDisguise(d.key)}
              style={{
                width: 'auto',
                padding: '4px 10px',
                fontSize: 12,
                ...(disguise === d.key ? { borderColor: 'var(--teal)', color: 'var(--teal)' } : {}),
              }}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* 경보 발령 시: 방 전원 화면을 덮는 위장 업무 화면 */}
      {panic && (
        <div
          role="dialog"
          aria-label="부장님 경보 위장 화면"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: '#fff',
            display: 'flex',
            flexDirection: 'column',
            fontFamily: "'IBM Plex Sans KR', system-ui, sans-serif",
          }}
        >
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {disguise === 'email' ? (
              <EmailDisguise />
            ) : disguise === 'code' ? (
              <CodeDisguise />
            ) : (
              <SpreadsheetDisguise />
            )}
          </div>

          {/* 하단: 경보 정보 + 카운트다운 + 해제 버튼 */}
          <div
            style={{
              background: '#fff3f2',
              borderTop: '2px solid var(--red)',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 13, color: 'var(--red)', fontWeight: 700 }}>
              🚨 {panicBy ?? '누군가'}님 발령 · 일하는 척! (자동 해제 {Math.ceil(remainingMs / 1000)}초)
            </span>
            <button
              className="btn"
              onClick={() => setPanicState(false)}
              disabled={busy}
              style={{ marginLeft: 'auto', width: 'auto', padding: '8px 16px' }}
            >
              ✅ 상황 종료 (해제)
            </button>
          </div>
        </div>
      )}
    </>
  );
}

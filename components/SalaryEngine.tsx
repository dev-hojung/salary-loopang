'use client';

import { useEffect, useState } from 'react';
import { earnedNow, perSecond, secondsUntilOffwork, workPhase } from '@/lib/salary';

// ===== 프로토타입 그대로 옮긴 데이터 =====
const PROD_LINES = [
  '전일 대비 ▼ 측정 불가 수준',
  '측정 오류 의심',
  '사실상 휴식 중',
  '담당자 부재중으로 추정',
  '곧 0% 도달 예정',
];

const WORK_ENDINGS = [
  "❌ 결재 라인에서 반려되었습니다. 사유: '왜 이렇게 했어요?'",
  "❌ 처리 완료... 했으나 부장님이 '원래대로 돌려놔'라고 하셨습니다.",
  '⚠️ 업무가 처리되었으나 새로운 업무 3건이 추가되었습니다.',
  '❌ 열심히 했지만 옆 팀 일이었던 것으로 확인됩니다.',
  '✅ 처리 완료! ...라고 적었으나 저장 버튼을 안 누르셨습니다.',
];

const EXCUSES = [
  '"방금 메일 확인했는데, 첨부파일이 안 열려서 IT팀에 문의 넣어뒀습니다."',
  '"그 건은 타 부서 회신을 기다리는 중이라 제 선에서 진행이 어려웠습니다."',
  '"어제 늦게까지 그 작업하다가 오늘 오전에 마무리하려고 아껴뒀습니다."',
  '"서버 이슈가 있어서 데이터가 아직 안 들어왔습니다. (서버는 멀쩡합니다)"',
  '"우선순위 재조정 차원에서 잠시 홀딩해뒀습니다. 전략적 판단이었습니다."',
  '"캘린더에 안 잡혀 있어서 저는 다음 주인 줄 알았습니다."',
  '"그거 제가 하는 거였어요…? (진심으로 처음 듣는 표정)"',
];

type Mood = { f: string; t: string; s: string };

const MOODS: Mood[] = [
  { f: '🌤️', t: '대체로 흐림', s: '오후 한숨 확률 80%' },
  { f: '⛈️', t: '천둥번개 동반', s: '회의 소집 임박. 대피 요망' },
  { f: '🌫️', t: '속을 알 수 없음', s: '표정 판독 불가. 일단 조용히' },
  { f: '☀️', t: '의외로 맑음', s: '점심 뭐 먹지 물어볼 타이밍' },
  { f: '🌪️', t: '강풍 주의보', s: "'잠깐 나 좀 볼까?' 발생 확률 상승" },
];

const EARNED_SUB_BEFORE = '아직 출근 전입니다. 9시부터 적립이 시작돼요.';
const EARNED_SUB_WORKING = '오늘 출근하신 순간부터 단 1초도 쉬지 않고 적립되고 있습니다.';
const EARNED_SUB_AFTER = '오늘치 적립 완료! 칼퇴 시간입니다. 가방 챙기세요.';

export default function SalaryEngine() {
  // 1) 실시간 월급 적립
  const [salary, setSalary] = useState<number>(3000000);
  const [earned, setEarned] = useState<number>(0);
  const [perSec, setPerSec] = useState<string>('0.00');
  const [earnedSub, setEarnedSub] = useState<string>(EARNED_SUB_WORKING);

  // 2) 퇴근 카운트다운
  const [clock, setClock] = useState<string>('--:--:--');
  const [clockWarn, setClockWarn] = useState<boolean>(false);
  const [clockLabel, setClockLabel] = useState<string>('정시 퇴근 기준 (18:00)');

  // 3) 생산성 지수
  const [prod, setProd] = useState<number>(8);
  const [prodLabel, setProdLabel] = useState<string>(PROD_LINES[0]);

  // 4) 열일 버튼
  const [workBtnDisabled, setWorkBtnDisabled] = useState<boolean>(false);
  const [workResultEmpty, setWorkResultEmpty] = useState<boolean>(true);
  const [workResultText, setWorkResultText] = useState<string>(
    '버튼을 누르면 즉시 업무가 처리됩니다. (책임은 안 짐)',
  );

  // 5) AI 핑계 생성기
  const [excuseBtnDisabled, setExcuseBtnDisabled] = useState<boolean>(false);
  const [excuseResultEmpty, setExcuseResultEmpty] = useState<boolean>(true);
  const [excuseResultText, setExcuseResultText] = useState<string>(
    '버튼을 누르면 정교하게 다듬어진 핑계를 추천해 드립니다.',
  );
  const [excuseConfidence, setExcuseConfidence] = useState<string | null>(null);

  // 6) 부장님 기분 예보
  const [mood, setMood] = useState<Mood>(MOODS[0]);

  // ===== 타이머 가동 =====

  // 월급은 0.1초마다 갱신 (실시간 느낌). salary가 바뀌면 즉시 재계산.
  useEffect(() => {
    function tickSalary() {
      const now = new Date();
      setEarned(earnedNow(now, salary));
      setPerSec(perSecond(salary).toFixed(2));

      const phase = workPhase(now);
      if (phase === 'before') setEarnedSub(EARNED_SUB_BEFORE);
      else if (phase === 'after') setEarnedSub(EARNED_SUB_AFTER);
      else setEarnedSub(EARNED_SUB_WORKING);
    }
    tickSalary();
    const id = setInterval(tickSalary, 100);
    return () => clearInterval(id);
  }, [salary]);

  // 퇴근 카운트다운은 1초마다.
  useEffect(() => {
    function tickClock() {
      const now = new Date();
      const diff = secondsUntilOffwork(now);
      if (diff <= 0) {
        setClock('00:00:00');
        setClockWarn(true);
        setClockLabel('🎉 퇴근! 더 이상 여기 있을 이유가 없습니다.');
        return;
      }
      const h = String(Math.floor(diff / 3600)).padStart(2, '0');
      const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
      const s = String(diff % 60).padStart(2, '0');
      setClock(`${h}:${m}:${s}`);
      if (diff < 1800) {
        setClockWarn(true);
        setClockLabel('곧 퇴근! 손에 힘 빼세요.');
      } else {
        setClockWarn(false);
        setClockLabel('정시 퇴근 기준 (18:00)');
      }
    }
    tickClock();
    const id = setInterval(tickClock, 1000);
    return () => clearInterval(id);
  }, []);

  // 3초마다 생산성 하락 (가만히 있으면 야금야금 떨어짐)
  useEffect(() => {
    const id = setInterval(() => {
      setProd((prev) => Math.max(0, +(prev - Math.random() * 1.2).toFixed(1)));
      setProdLabel(PROD_LINES[Math.floor(Math.random() * PROD_LINES.length)]);
    }, 3000);
    return () => clearInterval(id);
  }, []);

  // 8초마다 부장님 기분 변동
  useEffect(() => {
    const id = setInterval(() => {
      setMood(MOODS[Math.floor(Math.random() * MOODS.length)]);
    }, 8000);
    return () => clearInterval(id);
  }, []);

  function handleSalaryChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSalary(Number(e.target.value) || 0);
  }

  // 열일 버튼 (열심히 일하려 했지만 결국 반려됨)
  function handleWorkClick() {
    setWorkBtnDisabled(true);
    setWorkResultEmpty(false);
    setWorkResultText('⏳ 진지하게 처리하는 중...');
    setTimeout(() => {
      setWorkResultText(WORK_ENDINGS[Math.floor(Math.random() * WORK_ENDINGS.length)]);
      setProd((prev) => Math.max(0, prev - 2)); // 열일 버튼 누르면 오히려 생산성 하락 ㅋㅋ
      setWorkBtnDisabled(false);
    }, 1400);
  }

  // AI 핑계 생성기
  function handleExcuseClick() {
    setExcuseBtnDisabled(true);
    setExcuseResultEmpty(false);
    setExcuseConfidence(null);
    setExcuseResultText('🤖 최적의 핑계를 추론하는 중...');
    setTimeout(() => {
      const pick = EXCUSES[Math.floor(Math.random() * EXCUSES.length)];
      const conf = (Math.random() * 9 + 90).toFixed(1);
      setExcuseResultText(pick);
      setExcuseConfidence(conf);
      setExcuseBtnDisabled(false);
    }, 1200);
  }

  return (
    <>
      {/* 히어로: 실시간 월급 */}
      <div className="hero" style={{ animationDelay: '.05s' }}>
        <div className="tag">
          <span className="dot" /> 금일 누적 노동 대가 (실시간)
        </div>
        <div>
          <span className="big mono">{earned.toLocaleString('ko-KR')}</span>
          <span className="unit">원</span>
        </div>
        <div className="sub">{earnedSub}</div>
        <div className="rate mono">⏱ 초당 {perSec}원씩 입금 중</div>
      </div>

      <div className="grid">
        {/* 퇴근 카운트다운 */}
        <div className="card col4" style={{ animationDelay: '.12s' }}>
          <div className="card-h">
            <span className="t">퇴근까지 남은 시간</span>
            <span className="badge">D-DAY</span>
          </div>
          <div className={`count mono${clockWarn ? ' warn' : ''}`}>{clock}</div>
          <div className="label">{clockLabel}</div>
        </div>

        {/* 생산성 지수 */}
        <div className="card col4" style={{ animationDelay: '.18s' }}>
          <div className="card-h">
            <span className="t">실시간 생산성 지수</span>
            <span className="badge red">하락세</span>
          </div>
          <div>
            <span className="gauge-num mono">{prod}</span>
            <span style={{ fontSize: 18, color: 'var(--ink-soft)' }}>%</span>
          </div>
          <div className="gbar">
            <i style={{ width: `${Math.max(prod, 2)}%` }} />
          </div>
          <div className="label">{prodLabel}</div>
        </div>

        {/* 월급 설정 */}
        <div className="card col4" style={{ animationDelay: '.24s' }}>
          <div className="card-h">
            <span className="t">기준 월급 설정</span>
            <span className="badge warn">기밀</span>
          </div>
          <div className="setrow">
            월{' '}
            <input
              className="mono"
              type="number"
              value={salary}
              onChange={handleSalaryChange}
            />{' '}
            원
          </div>
          <div className="label" style={{ marginTop: 12 }}>
            월 209시간(법정근로) 기준으로 환산합니다. 아무도 안 봐요.
          </div>
        </div>

        {/* 열일 모드 버튼 */}
        <div className="card col6" style={{ animationDelay: '.30s' }}>
          <div className="card-h">
            <span className="t">원클릭 열일 처리 시스템</span>
            <span className="badge">엔터프라이즈</span>
          </div>
          <button className="btn" disabled={workBtnDisabled} onClick={handleWorkClick}>
            🔥 지금 당장 열심히 일하기
          </button>
          <div className={`result${workResultEmpty ? ' empty' : ''}`}>{workResultText}</div>
        </div>

        {/* AI 핑계 생성기 */}
        <div className="card col6" style={{ animationDelay: '.36s' }}>
          <div className="card-h">
            <span className="t">AI 핑계 자동 생성 엔진 v2.4</span>
            <span className="badge">Bedrock 미탑재</span>
          </div>
          <button className="btn ghost" disabled={excuseBtnDisabled} onClick={handleExcuseClick}>
            🤖 상황에 맞는 핑계 생성
          </button>
          <div className={`result${excuseResultEmpty ? ' empty' : ''}`}>
            {excuseResultText}
            {excuseConfidence !== null && (
              <div className="conf">
                신뢰도 <b>{excuseConfidence}%</b> · 설득력 ★★★★☆ · 들킬 확률 적당함
              </div>
            )}
          </div>
        </div>

        {/* KPI 차트 */}
        <div className="card col8" style={{ animationDelay: '.42s' }}>
          <div className="card-h">
            <span className="t">분기별 핵심성과지표(KPI) 추이</span>
            <span className="badge red">검토 요망</span>
          </div>
          <div className="chart-wrap">
            <svg viewBox="0 0 600 160" preserveAspectRatio="none">
              <line x1="0" y1="40" x2="600" y2="40" stroke="#eef1f4" strokeWidth={1} />
              <line x1="0" y1="80" x2="600" y2="80" stroke="#eef1f4" strokeWidth={1} />
              <line x1="0" y1="120" x2="600" y2="120" stroke="#eef1f4" strokeWidth={1} />
              <polyline
                fill="none"
                stroke="#d6483b"
                strokeWidth={3}
                strokeLinejoin="round"
                points="20,30 120,55 220,50 320,90 420,110 520,135 580,150"
              />
              <circle cx={580} cy={150} r={5} fill="#d6483b" />
            </svg>
          </div>
          <div className="legend">
            목표 대비 달성률: <b>역대 최저</b> · 담당자 의견: &quot;데이터에 오류가 있는 것 같습니다.&quot;
          </div>
        </div>

        {/* 부장님 기분 예보 */}
        <div className="card col4" style={{ animationDelay: '.48s' }}>
          <div className="card-h">
            <span className="t">부장님 기분 예보</span>
            <span className="badge warn">주의보</span>
          </div>
          <div className="mood">
            <div className="face">{mood.f}</div>
            <div className="txt">
              <h3>{mood.t}</h3>
              <p>{mood.s}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

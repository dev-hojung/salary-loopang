// 최소 구조화 로거 — 서버 라우트에서 일관된 JSON 로그를 남긴다.
// (P1) Sentry 등 에러 추적기/애널리틱스는 아래 emit 지점에 연결한다(의존성·DSN·벤더 결정 필요).
type Level = 'info' | 'warn' | 'error';

function emit(level: Level, event: string, data?: Record<string, unknown>) {
  const line = JSON.stringify({ level, event, ...data, at: new Date().toISOString() });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
  // TODO(P1): Sentry.captureException(...) / analytics 이벤트 연동 지점.
}

export const log = {
  info: (event: string, data?: Record<string, unknown>) => emit('info', event, data),
  warn: (event: string, data?: Record<string, unknown>) => emit('warn', event, data),
  error: (event: string, data?: Record<string, unknown>) => emit('error', event, data),
};

// 서버 권위 실시간 브로드캐스트 — 각 mutation 후 방 채널로 authoritative 데이터를 push 한다.
// postgres_changes(테이블 변경 구독) 대신 이걸 쓰면 DB fan-out(방 크기 N 에 대해 ~N²) 없이
// Realtime 서버가 broadcast 를 효율적으로 전파한다(B9 완화). 서버(service_role)만 전송하므로
// 클라이언트가 남의 표시값을 위조할 수 없다(서버 권위 유지).
export const roomLiveTopic = (code: string) => `room-live:${code.toUpperCase()}`;

export async function broadcastToRoom(
  code: string,
  event: string,
  payload: unknown,
): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !svc) return;
  try {
    await fetch(`${url}/realtime/v1/api/broadcast`, {
      method: 'POST',
      headers: {
        apikey: svc,
        Authorization: `Bearer ${svc}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [{ topic: roomLiveTopic(code), event, payload }],
      }),
    });
  } catch {
    /* best-effort: 실시간 전파 실패가 DB write/응답을 막지 않는다 */
  }
}

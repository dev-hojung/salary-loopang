// 벤더 무관 이벤트 계측 스캐폴딩.
// 벤더(PostHog/Plausible/GA4/Umami) 결정 후 아래 emit 한 곳에서 실제 전송(posthog.capture/gtag/plausible)만 연결하면
// 심어둔 track() 호출들이 그대로 데이터로 흐른다. 현재는 no-op(+개발 로그).
export type TrackProps = Record<string, string | number | boolean | undefined>;

export function track(event: string, props?: TrackProps): void {
  try {
    // TODO(P1): 벤더 결정 후 연결 지점.
    //   PostHog:   window.posthog?.capture(event, props)
    //   GA4:       window.gtag?.('event', event, props)
    //   Plausible: window.plausible?.(event, { props })
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[track]', event, props ?? {});
    }
  } catch {
    /* 계측 실패가 UX 를 막지 않는다 */
  }
}

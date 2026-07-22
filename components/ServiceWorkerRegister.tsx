'use client';

// 서비스워커 등록 (설치형 PWA + 오프라인 셸). 페이지 load 이후 등록해 초기 로딩과 경합 방지.
import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* 등록 실패 무시 (지원 안 함/차단 등) */
      });
    };
    if (document.readyState === 'complete') register();
    else {
      window.addEventListener('load', register, { once: true });
      return () => window.removeEventListener('load', register);
    }
  }, []);

  return null;
}

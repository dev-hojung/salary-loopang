// 서버 라우트 공용 헬퍼.
import { NextResponse } from 'next/server';

export function apiError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function readJsonBody(req: Request): Promise<Record<string, unknown> | null> {
  try {
    return (await req.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

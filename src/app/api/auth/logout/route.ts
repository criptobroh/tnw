import { assertOrigin, authResponse, logout, privateJson } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    assertOrigin(request);
    await logout();
    return privateJson({ ok: true });
  } catch (error) { return authResponse(error); }
}

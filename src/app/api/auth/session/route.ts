import { authResponse, getUser, privateJson } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try { return privateJson({ user: await getUser() }); }
  catch (error) { return authResponse(error); }
}

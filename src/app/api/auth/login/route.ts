import { assertOrigin, authResponse, AuthError, login, normalizeEmail, privateJson, readJson, validEmail } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    assertOrigin(request);
    const input = await readJson(request);
    const email = normalizeEmail(input.email);
    if (!validEmail(email) || typeof input.password !== 'string' || input.password.length > 128 || !input.password) {
      throw new AuthError(400, 'Ingresá un correo y una contraseña válidos.');
    }
    return privateJson({ user: await login(email, input.password, request) });
  } catch (error) { return authResponse(error); }
}

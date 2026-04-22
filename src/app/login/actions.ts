'use server';

import { AuthError } from 'next-auth';
import { signIn } from '@/auth';

export type LoginState = { error: string | null };

export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  try {
    await signIn('credentials', {
      email: formData.get('email'),
      password: formData.get('password'),
      redirectTo: '/',
    });
    return { error: null };
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: 'invalid' };
    }
    // Let redirect / other errors bubble up so Next handles them.
    throw error;
  }
}

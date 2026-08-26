import type { Metadata } from 'next'
import { LoginView } from '@/components/auth/login-view'

export const metadata: Metadata = {
  title: 'Entrar',
  description: 'Autenticação no sistema Vellor Care.',
}

export default function LoginPage() {
  return <LoginView />
}

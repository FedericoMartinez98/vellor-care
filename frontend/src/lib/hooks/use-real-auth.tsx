'use client'

/**
 * Sessão real contra o backend Spring — via React Context (não um hook
 * independente por componente, como `useRealInventory()`): login/logout
 * precisam refletir em todo lugar que olha "estou logado?" ao mesmo tempo
 * (o guard de rota do layout, o menu do usuário), senão um logout num lugar
 * deixaria outra tela "logada" até um F5 — a mesma classe de bug que já
 * corrigimos no formulário de equipamento (`onSuccess` desatualizado).
 *
 * Só relevante quando `isRemoteBackend()`. No modo mock (sem
 * NEXT_PUBLIC_API_BASE_URL, ex: o deploy de demonstração na Vercel), este
 * provider fica ocioso (`ready: true`, `isAuthenticated: false`) e as telas
 * continuam usando `useVellor().currentUser` como sempre.
 */

import * as React from 'react'

import { apiFetch, ApiError, clearToken, endpoints, getToken, isRemoteBackend, setToken } from '@/lib/api'

export interface RealAuthUser {
  id: string
  name: string
  email: string
  role: 'ADMINISTRADOR' | 'TECNICO' | 'VISUALIZADOR'
  sectorId?: string
  avatarUrl?: string
}

/** Shape de `AuthResponse`/`AuthResponse.UserDTO` no backend (Java). */
interface ApiAuthResponse {
  token: string
  refreshToken: string
  tokenType: string
  expiresIn: number
  user: RealAuthUser
}

interface RealAuthContextValue {
  ready: boolean
  isAuthenticated: boolean
  user: RealAuthUser | null
  login: (email: string, password: string) => Promise<RealAuthUser>
  logout: () => Promise<void>
}

const RealAuthContext = React.createContext<RealAuthContextValue | null>(null)

export function RealAuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = React.useState(false)
  const [user, setUser] = React.useState<RealAuthUser | null>(null)

  React.useEffect(() => {
    if (!isRemoteBackend()) {
      setReady(true)
      return
    }

    const token = getToken()
    if (!token) {
      setReady(true)
      return
    }

    apiFetch<RealAuthUser>(endpoints.auth.me())
      .then((me) => setUser(me))
      .catch(() => clearToken())
      .finally(() => setReady(true))
  }, [])

  const login = React.useCallback(async (email: string, password: string) => {
    const response = await apiFetch<ApiAuthResponse>(endpoints.auth.login(), {
      method: 'POST',
      body: JSON.stringify({ email, password, remember: true }),
    })
    setToken(response.token)
    setUser(response.user)
    return response.user
  }, [])

  const logout = React.useCallback(async () => {
    try {
      await apiFetch<void>(endpoints.auth.logout(), { method: 'POST' })
    } catch {
      // Mesmo se a chamada falhar (rede, token já expirado), a sessão local
      // é encerrada de qualquer forma -- o usuário não pode ficar preso.
    } finally {
      clearToken()
      setUser(null)
    }
  }, [])

  const value = React.useMemo<RealAuthContextValue>(
    () => ({ ready, isAuthenticated: user !== null, user, login, logout }),
    [ready, user, login, logout],
  )

  return <RealAuthContext.Provider value={value}>{children}</RealAuthContext.Provider>
}

export function useRealAuth(): RealAuthContextValue {
  const ctx = React.useContext(RealAuthContext)
  if (!ctx) {
    throw new Error('useRealAuth() precisa ser usado dentro de <RealAuthProvider>.')
  }
  return ctx
}

/**
 * Erro de login amigável. O backend já devolve "Credenciais inválidas."
 * (400) ou "Usuário inativo..." (409) em pt-BR prontos pra mostrar — só
 * cobrimos aqui a falha de rede/servidor fora do ar (status 0/5xx).
 */
export function loginErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    return err.status === 0
      ? 'Não foi possível conectar ao servidor. Verifique sua conexão.'
      : err.message
  }
  return 'Não foi possível entrar. Tente novamente.'
}

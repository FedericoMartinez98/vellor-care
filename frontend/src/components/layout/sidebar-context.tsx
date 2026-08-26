'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

const STORAGE_KEY = 'vellor-care:sidebar'

interface SidebarContextValue {
  /** Sidebar recolhida (só ícones) — vale apenas para lg+. */
  collapsed: boolean
  toggleCollapsed: () => void
  /** Drawer da sidebar no mobile. */
  mobileOpen: boolean
  setMobileOpen: (open: boolean) => void
}

const SidebarContext = createContext<SidebarContextValue | null>(null)

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // A preferência só é lida depois da montagem para não divergir do HTML do servidor.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored === 'true' || stored === 'false') {
        setCollapsed(stored === 'true')
      }
    } catch {
      // Armazenamento bloqueado: segue com o padrão expandido.
    }
  }, [])

  const toggleCollapsed = useCallback(() => {
    setCollapsed((previous) => {
      const next = !previous
      try {
        window.localStorage.setItem(STORAGE_KEY, String(next))
      } catch {
        // Armazenamento bloqueado: a preferência vale só nesta sessão.
      }
      return next
    })
  }, [])

  const value = useMemo<SidebarContextValue>(
    () => ({ collapsed, toggleCollapsed, mobileOpen, setMobileOpen }),
    [collapsed, toggleCollapsed, mobileOpen],
  )

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
}

export function useSidebar(): SidebarContextValue {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error('useSidebar() precisa ser usado dentro de <SidebarProvider>.')
  }
  return context
}

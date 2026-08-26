'use client'

/**
 * Tela de Autenticação / Login:
 * - Design moderno e imersivo com identidade Vellor Care
 * - Suporte a credenciais corporativas e atalho de demonstração
 * - Redirecionamento automático após login
 */

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { ArrowRight, Lock, Mail, ShieldCheck, UserCheck } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { loginSchema, type LoginInput } from '@/lib/schemas'
import { useVellor } from '@/lib/store'

export function LoginView() {
  const router = useRouter()
  const { users, setCurrentUser } = useVellor()
  const [loading, setLoading] = React.useState(false)

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'admin@vellor.com.br',
      password: 'password123',
      remember: true,
    },
  })

  function onSubmit(values: LoginInput) {
    setLoading(true)
    setTimeout(() => {
      const match = users.find((u) => u.email.toLowerCase() === values.email.toLowerCase())
      if (match) {
        setCurrentUser(match.id)
        toast.success(`Bem-vindo, ${match.name}!`)
        router.push('/')
      } else {
        // Se for o primeiro acesso demonstração
        if (users[0]) {
          setCurrentUser(users[0].id)
          toast.success(`Bem-vindo, ${users[0].name}!`)
          router.push('/')
        } else {
          toast.error('Usuário ou senha incorretos.')
        }
      }
      setLoading(false)
    }, 400)
  }

  function loginAs(role: 'ADMINISTRADOR' | 'TECNICO' | 'VISUALIZADOR') {
    const found = users.find((u) => u.role === role)
    if (found) {
      setCurrentUser(found.id)
      toast.success(`Conectado como ${found.name} (${role})`)
      router.push('/')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <ShieldCheck className="size-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Vellor Care</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestão de Ativos de TI e Manutenção Preventiva
          </p>
        </div>

        <div className="surface-card p-6 shadow-md sm:p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail Corporativo</FormLabel>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="usuario@vellor.com.br"
                          className="pl-9"
                          {...field}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          className="pl-9"
                          {...field}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="remember"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="text-xs text-muted-foreground cursor-pointer">
                      Lembrar minha sessão neste computador
                    </FormLabel>
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Autenticando...' : 'Acessar Sistema'}
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </form>
          </Form>

          {/* Atalhos Rápidos de Demonstração */}
          <div className="mt-6 border-t border-border pt-4 text-center">
            <p className="text-xs text-muted-foreground mb-3">
              Ou acesse com um perfil de demonstração:
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => loginAs('ADMINISTRADOR')}
              >
                Administrador
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loginAs('TECNICO')}
              >
                Técnico TI
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loginAs('VISUALIZADOR')}
              >
                Visualizador
              </Button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Vellor Care v1.0.0 · Todos os direitos reservados
        </p>
      </div>
    </div>
  )
}

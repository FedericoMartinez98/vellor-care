'use client'

/**
 * Painel de Configurações do Vellor Care:
 * - Gestão de Usuários e Perfis de Acesso
 * - Backup e Restauração de Dados JSON (localStorage)
 * - Parâmetros Operacionais de Preventivas e Limiares de Hardware
 */

import * as React from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import {
  Database,
  Download,
  KeyRound,
  Plus,
  RefreshCw,
  RotateCcw,
  Sliders,
  Upload,
  UserCog,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/layout/page-header'
import { ConfirmDialog, SectionCard } from '@/components/shared'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { USER_ROLE_LABELS } from '@/lib/constants'
import { ApiError, isRemoteBackend } from '@/lib/api'
import { initials } from '@/lib/format'
import { useRealAuth } from '@/lib/hooks/use-real-auth'
import { useRealInventory } from '@/lib/hooks/use-real-inventory'
import { useRealUsers } from '@/lib/hooks/use-real-users'
import { userSchema, type UserInput } from '@/lib/schemas'
import { useVellor } from '@/lib/store'
import { USER_ROLE, type User } from '@/lib/types'

export function SettingsView() {
  const mock = useVellor()
  const realUsers = useRealUsers()
  const realInventory = useRealInventory()
  const realAuth = useRealAuth()
  const remote = isRemoteBackend()

  const {
    createUser,
    updateUser,
    deleteUser,
    setCurrentUser,
    resetDatabase,
    exportDatabase,
    importDatabase,
  } = mock

  const ready = remote ? realUsers.ready : mock.ready
  const users = remote ? realUsers.users : mock.users
  const currentUser = remote ? realAuth.user : mock.currentUser
  const sectors = remote ? realInventory.sectors : mock.sectors
  /** Só administrador cria/edita/exclui usuário (o backend também valida). */
  const canManageUsers = remote ? realAuth.user?.role === 'ADMINISTRADOR' : true

  const [userDialogOpen, setUserDialogOpen] = React.useState(false)
  const [resetConfirmOpen, setResetConfirmOpen] = React.useState(false)
  const [editingUser, setEditingUser] = React.useState<User | undefined>()
  const [isSavingUser, setIsSavingUser] = React.useState(false)

  const userForm = useForm<UserInput>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: '',
      email: '',
      role: 'TECNICO',
      sectorId: '',
      phone: '',
      active: true,
      password: '',
    },
  })

  React.useEffect(() => {
    if (editingUser) {
      userForm.reset({
        name: editingUser.name,
        email: editingUser.email,
        role: editingUser.role,
        sectorId: editingUser.sectorId ?? '',
        phone: editingUser.phone ?? '',
        active: editingUser.active,
        password: '',
      })
    } else {
      userForm.reset({
        name: '',
        email: '',
        role: 'TECNICO',
        sectorId: '',
        phone: '',
        active: true,
        password: '',
      })
    }
  }, [editingUser, userForm])

  async function onSaveUser(values: UserInput) {
    // Senha é obrigatória na criação: sem ela o backend cairia num padrão
    // silencioso, deixando o usuário novo com uma senha conhecida.
    if (!editingUser && (!values.password || values.password.length < 8)) {
      userForm.setError('password', {
        message: 'Defina uma senha de ao menos 8 caracteres para o novo usuário.',
      })
      return
    }

    setIsSavingUser(true)
    try {
      if (remote) {
        const body = {
          name: values.name,
          email: values.email,
          role: values.role,
          sectorId: values.sectorId ? values.sectorId : undefined,
          phone: values.phone ? values.phone : undefined,
          active: values.active,
          // Em branco na edição = mantém a senha atual.
          password: values.password ? values.password : undefined,
        }

        if (editingUser) {
          await realUsers.update(editingUser.id, body)
          toast.success(`Usuário ${values.name} atualizado.`)
        } else {
          await realUsers.create(body)
          toast.success(`Usuário ${values.name} criado.`)
        }
        setUserDialogOpen(false)
        return
      }

      if (editingUser) {
        updateUser(editingUser.id, values)
        toast.success(`Usuário ${values.name} atualizado.`)
      } else {
        createUser(values)
        toast.success(`Usuário ${values.name} criado.`)
      }
      setUserDialogOpen(false)
    } catch (err: unknown) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Erro ao salvar usuário.'
      toast.error(message)
    } finally {
      setIsSavingUser(false)
    }
  }

  async function onDeleteUser(user: User) {
    try {
      if (remote) {
        await realUsers.remove(user.id)
      } else {
        deleteUser(user.id)
      }
      toast.success(`Usuário ${user.name} excluído.`)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao excluir usuário.')
    }
  }

  function handleExportBackup() {
    try {
      const json = exportDatabase()
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `vellor-care-backup-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Backup exportado com sucesso.')
    } catch {
      toast.error('Erro ao exportar backup.')
    }
  }

  function handleImportFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const success = importDatabase(content)
        if (success) {
          toast.success('Base de dados restaurada com sucesso.')
        } else {
          toast.error('Arquivo de backup inválido ou incompatível.')
        }
      } catch {
        toast.error('Falha ao processar o arquivo de backup.')
      }
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  if (!ready) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Configurações do Sistema"
        description="Controle de acessos, perfil ativo, rotinas de backup e parâmetros de monitoramento."
      />

      <Tabs defaultValue="usuarios" className="w-full">
        <TabsList className="grid w-full grid-cols-3 sm:w-96">
          <TabsTrigger value="usuarios" className="gap-2">
            <Users className="size-4" />
            Usuários
          </TabsTrigger>
          <TabsTrigger value="dados" className="gap-2">
            <Database className="size-4" />
            Dados & Backup
          </TabsTrigger>
          <TabsTrigger value="parametros" className="gap-2">
            <Sliders className="size-4" />
            Parâmetros
          </TabsTrigger>
        </TabsList>

        {/* Aba 1: Usuários e Permissões */}
        <TabsContent value="usuarios" className="space-y-6 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">Equipe de TI & Acessos</h2>
              <p className="text-xs text-muted-foreground">
                Gerencie administradores, técnicos e operadores do sistema.
              </p>
            </div>

            <Button
              disabled={!canManageUsers}
              title={canManageUsers ? undefined : 'Apenas administradores podem criar usuários.'}
              onClick={() => {
                setEditingUser(undefined)
                setUserDialogOpen(true)
              }}
            >
              <Plus className="mr-2 size-4" />
              Novo Usuário
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {users.map((user) => {
              const isCurrent = user.id === currentUser?.id
              return (
                <div
                  key={user.id}
                  className={`surface-card flex flex-col justify-between p-5 transition-all ${
                    isCurrent ? 'ring-2 ring-primary' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="size-10">
                      <AvatarFallback>{initials(user.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-semibold text-foreground">{user.name}</p>
                        {isCurrent ? <Badge variant="default">Você</Badge> : null}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <Badge variant="outline">{USER_ROLE_LABELS[user.role]}</Badge>
                        {!user.active ? <Badge variant="danger">Inativo</Badge> : null}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3">
                    {isCurrent ? (
                      <span className="text-xs text-muted-foreground">Sessão ativa</span>
                    ) : remote ? (
                      // "Alternar para" era um atalho de demonstração que trocava
                      // o usuário ativo sem senha -- não faz sentido (nem seria
                      // seguro) com autenticação real.
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={!canManageUsers}
                        onClick={() => void onDeleteUser(user)}
                      >
                        Excluir
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setCurrentUser(user.id)
                          toast.success(`Sessão alterada para ${user.name}.`)
                        }}
                      >
                        Alternar para
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!canManageUsers}
                      title={canManageUsers ? undefined : 'Apenas administradores podem editar usuários.'}
                      onClick={() => {
                        setEditingUser(user)
                        setUserDialogOpen(true)
                      }}
                    >
                      Editar
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </TabsContent>

        {/* Aba 2: Dados e Backup */}
        <TabsContent value="dados" className="space-y-6 pt-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="size-5 text-primary" />
                  Exportar Backup Completo
                </CardTitle>
                <CardDescription>
                  Baixe um arquivo JSON contendo todos os computadores, histórico de manutenções, peças e setores.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleExportBackup} className="w-full sm:w-auto">
                  <Download className="mr-2 size-4" />
                  Baixar Arquivo .json
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="size-5 text-primary" />
                  Restaurar Backup
                </CardTitle>
                <CardDescription>
                  Envie um arquivo de backup previamente exportado para sobrescrever o banco local do navegador.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Label
                  htmlFor="backup-upload"
                  className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  <Upload className="mr-2 size-4" />
                  Selecionar Arquivo .json
                  <input
                    id="backup-upload"
                    type="file"
                    accept=".json"
                    className="sr-only"
                    onChange={handleImportFile}
                  />
                </Label>
              </CardContent>
            </Card>
          </div>

          <Card className="border-danger/30 bg-danger/5">
            <CardHeader>
              <CardTitle className="text-danger flex items-center gap-2">
                <RotateCcw className="size-5" />
                Restaurar Dados Originais de Demonstração
              </CardTitle>
              <CardDescription>
                Reinicia todo o banco de dados para o dataset original com 64 computadores, 210 manutenções e 26 peças.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                onClick={() => setResetConfirmOpen(true)}
              >
                Restaurar Demonstração Original
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba 3: Parâmetros */}
        <TabsContent value="parametros" className="space-y-6 pt-4">
          <SectionCard
            title="Parâmetros de Manutenção Preventiva"
            icon={Sliders}
            description="Definições que governam as regras de cálculo do semáforo operacional."
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label className="text-xs font-semibold">Intervalo Padrão</Label>
                <Input value="90 dias" disabled className="mt-1" />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Tempo máximo recomendado entre duas manutenções.
                </p>
              </div>

              <div>
                <Label className="text-xs font-semibold">Antecedência de Alerta</Label>
                <Input value="7 dias" disabled className="mt-1" />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Período em que o ativo entra no semáforo amarelo (próxima).
                </p>
              </div>

              <div>
                <Label className="text-xs font-semibold">Limite sem Atendimento</Label>
                <Input value="120 dias" disabled className="mt-1" />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Dispara alerta de máquina esquecida / sem manutenção.
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Limiares Críticos de Telemetria"
            icon={KeyRound}
            description="Critérios de hardware para disparo automático de alertas."
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label className="text-xs font-semibold">Saúde SMART do SSD Mínima</Label>
                <Input value="20 %" disabled className="mt-1" />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Abaixo disso o SSD é marcado com criticidade máxima.
                </p>
              </div>

              <div>
                <Label className="text-xs font-semibold">Temperatura Máxima CPU</Label>
                <Input value="85 °C" disabled className="mt-1" />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Superaquecimento que exige troca de pasta térmica.
                </p>
              </div>

              <div>
                <Label className="text-xs font-semibold">Espaço Livre em Disco Mínimo</Label>
                <Input value="15 %" disabled className="mt-1" />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Espaço livre mínimo antes de alertar o operador de TI.
                </p>
              </div>
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>

      {/* Dialog Usuário */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? `Editar Usuário · ${editingUser.name}` : 'Novo Usuário'}</DialogTitle>
            <DialogDescription>
              Preencha os dados do técnico ou administrador do sistema.
            </DialogDescription>
          </DialogHeader>

          <Form {...userForm}>
            <form onSubmit={userForm.handleSubmit(onSaveUser)} className="space-y-4">
              <FormField
                control={userForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo *</FormLabel>
                    <FormControl>
                      <Input placeholder="ex: Roberto Alves" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={userForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail Corporativo *</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="roberto.alves@vellor.com.br" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={userForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Perfil de Acesso *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Perfil" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {USER_ROLE.map((r) => (
                            <SelectItem key={r} value={r}>
                              {USER_ROLE_LABELS[r]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={userForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone / Ramal</FormLabel>
                      <FormControl>
                        <Input placeholder="(11) 98765-4321" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={userForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {editingUser ? 'Nova senha' : 'Senha de acesso *'}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        placeholder="Mínimo de 8 caracteres"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      {editingUser
                        ? 'Deixe em branco para manter a senha atual.'
                        : 'A pessoa usará este e-mail e senha para entrar no sistema.'}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={() => setUserDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSavingUser}>
                  {isSavingUser ? 'Salvando...' : 'Salvar Usuário'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Confirm de Reset */}
      <ConfirmDialog
        open={resetConfirmOpen}
        onOpenChange={setResetConfirmOpen}
        title="Restaurar dados originais de demonstração?"
        description="Esta ação irá resetar todas as alterações feitas no navegador e restaurar o seed original do Vellor Care. Dados criados manualmente serão perdidos."
        confirmLabel="Restaurar Tudo"
        destructive
        onConfirm={() => {
          resetDatabase()
          toast.success('Banco de dados restaurado com o seed original.')
        }}
      />
    </div>
  )
}

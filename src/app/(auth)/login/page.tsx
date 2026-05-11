export const dynamic = 'force-dynamic'

import { GoogleLoginButton } from '@/components/auth/GoogleLoginButton'

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm mx-4">
        <div className="bg-card rounded-xl border border-border shadow-sm p-8 space-y-6">
          <div className="text-center space-y-1.5">
            <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
              <span className="font-bold text-lg text-primary">A</span>
            </div>
            <h1 className="text-xl font-semibold text-foreground">AutoLançamento</h1>
            <p className="text-sm text-muted-foreground">Portal de lançamentos contábeis</p>
          </div>

          <GoogleLoginButton />

          <ErrorMessage searchParams={searchParams} />
        </div>
      </div>
    </div>
  )
}

async function ErrorMessage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams
  if (!params.error) return null

  const messages: Record<string, string> = {
    auth_failed: 'Erro na autenticação. Tente novamente.',
    no_code: 'Código de autorização não encontrado.',
    account_disabled: 'Sua conta está desativada. Entre em contato com o contador.',
  }

  return (
    <p className="text-sm text-center text-destructive">
      {messages[params.error] ?? 'Ocorreu um erro. Tente novamente.'}
    </p>
  )
}

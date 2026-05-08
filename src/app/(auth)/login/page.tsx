export const dynamic = 'force-dynamic'

import { GoogleLoginButton } from '@/components/auth/GoogleLoginButton'

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm space-y-8 p-8 bg-white rounded-2xl shadow-sm border">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">AutoLançamento</h1>
          <p className="text-sm text-muted-foreground">
            Portal de lançamentos contábeis
          </p>
        </div>
        <GoogleLoginButton />
        <ErrorMessage searchParams={searchParams} />
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

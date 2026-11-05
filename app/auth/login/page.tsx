"use client"

import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Scissors } from "lucide-react"
import { signIn } from "./actions"

export default function LoginPage() {
  const [state, action, isLoading] = useActionState(signIn, null)

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-linear-to-b from-background to-muted/20 p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary">
            <Scissors className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Barbearia Premium</h1>
          <p className="text-sm text-muted-foreground">Painel Administrativo</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Login</CardTitle>
            <CardDescription>Entre com suas credenciais para acessar o painel</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={action}>
              <div className="flex flex-col gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    placeholder="seu@email.com"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                  />
                </div>

                {state?.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Entrando..." : "Entrar"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

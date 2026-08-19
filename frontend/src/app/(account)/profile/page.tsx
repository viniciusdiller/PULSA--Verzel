"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { Calendar, LogOut, Mail, Ticket, Wallet } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { useProfileQuery, useUpdateProfileMutation } from "@/hooks/use-profile";
import { roleLabel } from "@/lib/auth";
import { formatCentsToBRL, formatEventDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoaderSignalBars } from "@/components/ui/loader-signal-bars";
import { PageLoader } from "@/components/ui/page-loader";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// Limites espelhando os do backend (UpdateProfileDto) — o objetivo aqui
// não é segurança (isso já é garantido no servidor), é dar feedback
// antes do submit em vez de deixar a pessoa descobrir o limite só
// quando a requisição volta com 400.
const NAME_MAX_LENGTH = 100;
const PASSWORD_MAX_LENGTH = 128;

const nameSchema = z.object({
  name: z.string().min(2, "Informe pelo menos 2 caracteres").max(NAME_MAX_LENGTH),
});
type NameFormValues = z.infer<typeof nameSchema>;

const passwordSchema = z
  .object({
    currentPassword: z.string().min(6, "Informe sua senha atual").max(PASSWORD_MAX_LENGTH),
    newPassword: z
      .string()
      .min(6, "A nova senha precisa ter pelo menos 6 caracteres")
      .max(PASSWORD_MAX_LENGTH),
    confirmPassword: z.string().min(6, "Confirme a nova senha").max(PASSWORD_MAX_LENGTH),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });
type PasswordFormValues = z.infer<typeof passwordSchema>;

// Só aparece perto do limite — contar caractere a cada tecla digitada
// desde o campo vazio é ruído, não ajuda ninguém a perceber um limite
// que só importa quando ele está prestes a ser alcançado.
function CharacterCounter({ length, max }: { length: number; max: number }) {
  if (length < max * 0.8) return null;
  return (
    <span
      className={cn(
        "text-xs tabular-nums",
        length >= max ? "text-destructive" : "text-muted-foreground",
      )}
    >
      {length}/{max}
    </span>
  );
}

// Linha perfurada — mesmo motivo de "canhoto de ingresso" usado no
// wordmark do header e nos cards de ticket (ticket-card.tsx). Reaproveitada
// aqui como divisória entre as seções da conta, no lugar de empilhar
// cards idênticos (ícone + título + descrição + botão) um embaixo do
// outro — um padrão que fica com cara de dashboard genérico gerado por
// IA. Uma única superfície "documento", cortada por essa perfuração,
// é uma assinatura visual da marca, não um componente de biblioteca.
function PerforatedDivider() {
  return (
    <div
      aria-hidden
      className="h-px w-full shrink-0"
      style={{
        backgroundImage:
          "repeating-linear-gradient(90deg, var(--color-border) 0 6px, transparent 6px 12px)",
      }}
    />
  );
}

// Campo com sublinhado em vez de caixa arredondada — o resto do app usa
// input em pill pra formulários de busca/filtro, mas repetir esse mesmo
// componente 6 vezes numa página de "conta" (nome + 3 campos de senha)
// é o que mais pesava pra cara de template. Sublinhado lê mais como
// preencher um documento do que preencher um formulário de SaaS.
const underlineInputClass =
  "h-9 rounded-none border-0 border-b border-input bg-transparent px-0 shadow-none focus-visible:border-b-2 focus-visible:border-primary focus-visible:ring-0 dark:bg-transparent";

export default function ProfilePage() {
  const { user, updateUser, logout } = useAuth();
  const { data: profile, isLoading, isError } = useProfileQuery();
  const updateProfileMutation = useUpdateProfileMutation();
  // Só CUSTOMER acumula/gasta saldo (estorno de evento cancelado) —
  // mesmo corte já aplicado no site-header, aqui replicado pra não
  // mostrar "R$ 0,00" sem sentido pra portaria nem organizador.
  const showBalance = profile?.role === "CUSTOMER";

  const nameForm = useForm<NameFormValues>({
    resolver: zodResolver(nameSchema),
    defaultValues: { name: "" },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  useEffect(() => {
    if (profile) {
      nameForm.reset({ name: profile.name });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  async function onSubmitName(values: NameFormValues) {
    try {
      const updated = await updateProfileMutation.mutateAsync({ name: values.name });
      if (user) {
        updateUser({ ...user, name: updated.name });
      }
      toast.success("Nome atualizado.");
    } catch (error) {
      const message = isAxiosError(error)
        ? (error.response?.data as { message?: string } | undefined)?.message
        : undefined;
      toast.error(message ?? "Não foi possível atualizar o nome.");
    }
  }

  async function onSubmitPassword(values: PasswordFormValues) {
    try {
      await updateProfileMutation.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      passwordForm.reset({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast.success("Senha atualizada.");
    } catch (error) {
      const message = isAxiosError(error)
        ? (error.response?.data as { message?: string } | undefined)?.message
        : undefined;
      toast.error(message ?? "Não foi possível atualizar a senha.");
    }
  }

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
        <PageLoader />
      </main>
    );
  }

  if (isError || !profile) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Não foi possível carregar seu perfil agora.</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  const initial = profile.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-8 px-6 py-12">
      <div>
        <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">Perfil</p>
        <h1 className="font-heading text-3xl">Minha conta</h1>
      </div>

      <Card className="overflow-hidden py-0 shadow-card">
        <div className="flex items-center gap-4 bg-gradient-to-br from-violet/15 via-transparent to-primary/10 p-6">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet to-primary font-heading text-2xl font-semibold text-white">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="font-heading text-xl">{profile.name}</CardTitle>
              <Badge variant="outline">{roleLabel(profile.role)}</Badge>
            </div>
            <CardDescription className="mt-1 flex items-center gap-1.5">
              <Mail className="size-3.5 shrink-0" />
              <span className="truncate">{profile.email}</span>
            </CardDescription>
          </div>
        </div>
        <div
          className={cn(
            "grid divide-x divide-border/60 border-t border-border/60 text-sm",
            showBalance ? "grid-cols-3" : "grid-cols-2"
          )}
        >
          <div className="flex flex-col items-start gap-1 p-4">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="size-3.5" />
              Membro desde
            </span>
            <span className="font-medium text-foreground">
              {formatEventDate(profile.createdAt)}
            </span>
          </div>
          <div className="flex flex-col items-start gap-1 p-4">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Ticket className="size-3.5" />
              {profile.statsLabel}
            </span>
            <span className="font-medium text-foreground">{profile.statsCount}</span>
          </div>
          {showBalance && (
            <div className="flex flex-col items-start gap-1 p-4">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Wallet className="size-3.5" />
                Saldo
              </span>
              <span className="font-medium text-foreground">
                {formatCentsToBRL(profile.balanceCents)}
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* Uma superfície só pras duas edições de conta, separadas pela
          perfuração — em vez de dois cards clonados. */}
      <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10 shadow-card">
        <Form {...nameForm}>
          <form onSubmit={nameForm.handleSubmit(onSubmitName)} className="p-6 sm:p-8">
            <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">Identidade</p>
            <h2 className="font-heading mt-1 text-xl">Nome de exibição</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Usado no cabeçalho e nos ingressos.
            </p>

            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end">
              <FormField
                control={nameForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <FormLabel>Nome</FormLabel>
                      <CharacterCounter length={field.value.length} max={NAME_MAX_LENGTH} />
                    </div>
                    <FormControl>
                      <Input
                        className={underlineInputClass}
                        maxLength={NAME_MAX_LENGTH}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={updateProfileMutation.isPending}>
                {updateProfileMutation.isPending ? (
                  <>
                    <LoaderSignalBars size="sm" className="mr-1.5" />
                    Salvando...
                  </>
                ) : (
                  "Salvar nome"
                )}
              </Button>
            </div>
          </form>
        </Form>

        <PerforatedDivider />

        <Form {...passwordForm}>
          <form onSubmit={passwordForm.handleSubmit(onSubmitPassword)} className="p-6 sm:p-8">
            <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">Segurança</p>
            <h2 className="font-heading mt-1 text-xl">Trocar senha</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Peça a senha atual antes de trocar, por segurança.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <FormField
                control={passwordForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-baseline justify-between gap-2">
                      <FormLabel>Senha atual</FormLabel>
                      <CharacterCounter length={field.value.length} max={PASSWORD_MAX_LENGTH} />
                    </div>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        className={underlineInputClass}
                        maxLength={PASSWORD_MAX_LENGTH}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-baseline justify-between gap-2">
                      <FormLabel>Nova senha</FormLabel>
                      <CharacterCounter length={field.value.length} max={PASSWORD_MAX_LENGTH} />
                    </div>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        className={underlineInputClass}
                        maxLength={PASSWORD_MAX_LENGTH}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar nova senha</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        className={underlineInputClass}
                        maxLength={PASSWORD_MAX_LENGTH}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" className="mt-6" disabled={updateProfileMutation.isPending}>
              {updateProfileMutation.isPending ? (
                <>
                  <LoaderSignalBars size="sm" className="mr-1.5" />
                  Salvando...
                </>
              ) : (
                "Salvar senha"
              )}
            </Button>
          </form>
        </Form>
      </div>

      {/* Sair não precisa de uma caixa de alerta vermelha própria — é
          uma ação rara e de baixo risco (só desconecta este aparelho),
          não uma "danger zone". Uma linha quieta abaixo do cartão já
          comunica isso sem gritar. */}
      <div className="flex items-center justify-between gap-4 border-t border-border/60 pt-6">
        <div>
          <p className="text-sm font-medium text-foreground">Sair da conta</p>
          <p className="text-xs text-muted-foreground">Encerra sua sessão neste dispositivo.</p>
        </div>
        <Button
          variant="ghost"
          className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={logout}
        >
          <LogOut className="size-4" />
          Sair
        </Button>
      </div>
    </main>
  );
}

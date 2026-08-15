"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { isAxiosError } from "axios";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import { useProfileQuery, useUpdateProfileMutation } from "@/hooks/use-profile";
import { roleLabel } from "@/lib/auth";
import { formatCentsToBRL, formatEventDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

const nameSchema = z.object({
  name: z.string().min(2, "Informe pelo menos 2 caracteres"),
});
type NameFormValues = z.infer<typeof nameSchema>;

const passwordSchema = z
  .object({
    currentPassword: z.string().min(6, "Informe sua senha atual"),
    newPassword: z.string().min(6, "A nova senha precisa ter pelo menos 6 caracteres"),
    confirmPassword: z.string().min(6, "Confirme a nova senha"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });
type PasswordFormValues = z.infer<typeof passwordSchema>;

export default function ProfilePage() {
  const { user, updateUser, logout } = useAuth();
  const { data: profile, isLoading } = useProfileQuery();
  const updateProfileMutation = useUpdateProfileMutation();

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

  if (isLoading || !profile) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
        <PageLoader />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-6 py-12">
      <div>
        <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">Perfil</p>
        <h1 className="font-heading text-3xl">Minha conta</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-heading text-xl">{profile.name}</CardTitle>
              <CardDescription>{profile.email}</CardDescription>
            </div>
            <Badge variant="outline">{roleLabel(profile.role)}</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Membro desde</p>
            <p className="font-medium text-foreground">{formatEventDate(profile.createdAt)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{profile.statsLabel}</p>
            <p className="font-medium text-foreground">{profile.statsCount}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Saldo</p>
            <p className="font-medium text-foreground">
              {formatCentsToBRL(profile.balanceCents)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Nome de exibição</CardTitle>
          <CardDescription>Usado no cabeçalho e nos ingressos.</CardDescription>
        </CardHeader>
        <Form {...nameForm}>
          <form onSubmit={nameForm.handleSubmit(onSubmitName)}>
            <CardContent>
              <FormField
                control={nameForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
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
            </CardFooter>
          </form>
        </Form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Trocar senha</CardTitle>
          <CardDescription>Peça a senha atual antes de trocar, por segurança.</CardDescription>
        </CardHeader>
        <Form {...passwordForm}>
          <form onSubmit={passwordForm.handleSubmit(onSubmitPassword)}>
            <CardContent className="grid gap-4">
              <FormField
                control={passwordForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha atual</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
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
                    <FormLabel>Nova senha</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
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
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={updateProfileMutation.isPending}>
                {updateProfileMutation.isPending ? (
                  <>
                    <LoaderSignalBars size="sm" className="mr-1.5" />
                    Salvando...
                  </>
                ) : (
                  "Salvar senha"
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Sessão</CardTitle>
          <CardDescription>Sair da sua conta neste dispositivo.</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button variant="destructive" onClick={logout}>
            Sair
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}

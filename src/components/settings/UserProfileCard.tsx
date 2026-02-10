import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Lock, Phone, Save, Loader2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/ui/useToast";

// Brazilian phone format: (XX) XXXXX-XXXX or (XX) XXXX-XXXX
const PHONE_REGEX = /^\(\d{2}\)\s?\d{4,5}-\d{4}$/;

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, digits.length - 4)}-${digits.slice(digits.length - 4)}`;
}

function isValidPhone(phone: string): boolean {
  if (!phone) return true; // optional
  return PHONE_REGEX.test(phone);
}

export function UserProfileCard() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPw, setShowNewPw] = useState(false);
  const [isChangingPw, setIsChangingPw] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    setIsLoading(true);

    const { data } = await supabase
      .from("profiles")
      .select("name, phone")
      .eq("id", user.id)
      .single();

    if (data) {
      setName(data.name || "");
      setPhone(data.phone ? formatPhone(data.phone) : "");
    }

    setIsLoading(false);
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhone(value);
    setPhone(formatted);
    if (formatted && !isValidPhone(formatted)) {
      setPhoneError("Formato: (XX) XXXXX-XXXX");
    } else {
      setPhoneError("");
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    if (phone && !isValidPhone(phone)) {
      setPhoneError("Formato inválido. Use (XX) XXXXX-XXXX");
      return;
    }

    if (!name.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }

    if (name.trim().length > 100) {
      toast({ title: "Nome muito longo (máx. 100 caracteres)", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const rawPhone = phone.replace(/\D/g, "");

      const { error } = await supabase
        .from("profiles")
        .update({ name: name.trim(), phone: rawPhone || null })
        .eq("id", user.id);

      if (error) throw error;

      // Also update whatsapp_config phone_number if connected
      if (rawPhone) {
        const { data: waConfig } = await supabase
          .from("whatsapp_config")
          .select("id, is_connected")
          .eq("user_id", user.id)
          .single();

        if (waConfig) {
          await supabase
            .from("whatsapp_config")
            .update({ phone_number: rawPhone })
            .eq("id", waConfig.id);
        }
      }

      toast({ title: "Perfil atualizado!" });
    } catch (e: any) {
      toast({ title: "Erro ao salvar perfil", description: e.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast({ title: "Senha deve ter no mínimo 6 caracteres", variant: "destructive" });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({ title: "As senhas não coincidem", variant: "destructive" });
      return;
    }

    setIsChangingPw(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) throw error;

      toast({ title: "Senha alterada com sucesso!" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: any) {
      toast({ title: "Erro ao alterar senha", description: e.message, variant: "destructive" });
    } finally {
      setIsChangingPw(false);
    }
  };

  if (isLoading) {
    return <div className="text-center text-muted-foreground py-8">Carregando perfil...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Profile Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Dados Pessoais
          </CardTitle>
          <CardDescription>
            Seu nome e número do WhatsApp para receber notificações
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="profile-name">Nome Completo</Label>
            <Input
              id="profile-name"
              placeholder="Seu nome completo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-email">E-mail</Label>
            <Input
              id="profile-email"
              value={user?.email || ""}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">O e-mail não pode ser alterado</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Número do WhatsApp
            </Label>
            <Input
              id="profile-phone"
              placeholder="(11) 99999-9999"
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              maxLength={16}
            />
            {phoneError && (
              <p className="text-xs text-destructive">{phoneError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Usado para envio de notificações via WhatsApp
            </p>
          </div>

          <Button onClick={handleSaveProfile} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar Perfil
          </Button>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Alterar Senha
          </CardTitle>
          <CardDescription>
            Atualize sua senha de acesso
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">Nova Senha</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showNewPw ? "text" : "password"}
                placeholder="Mínimo 6 caracteres"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowNewPw(!showNewPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="Repita a nova senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-destructive">As senhas não coincidem</p>
            )}
          </div>

          <Button
            onClick={handleChangePassword}
            disabled={isChangingPw || !newPassword || newPassword !== confirmPassword}
          >
            {isChangingPw ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Lock className="h-4 w-4 mr-2" />
            )}
            Alterar Senha
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

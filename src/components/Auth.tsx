import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { z } from "zod";
import { toast } from "sonner";

// Schema de validação para registro
const signUpSchema = z.object({
  email: z.string().email("Email inválido").max(255, "Email muito longo"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres").max(100, "Senha muito longa"),
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres").max(100, "Nome muito longo"),
  phone: z.string().max(20, "Telefone muito longo").optional().or(z.literal(""))
});

// Schema de validação para login
const signInSchema = z.object({
  email: z.string().email("Email inválido").max(255, "Email muito longo"),
  password: z.string().min(1, "Senha é obrigatória").max(100, "Senha muito longa")
});

export function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Redirecionar para home quando usuário estiver autenticado
  useEffect(() => {
    if (user && !authLoading) {
      navigate("/", { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação com Zod
    try {
      if (isSignUp) {
        signUpSchema.parse({ email, password, name, phone: phone || undefined });
      } else {
        signInSchema.parse({ email, password });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        toast.error("Erro de validação", { description: firstError.message });
        return;
      }
    }
    
    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password, name, phone);
      } else {
        await signIn(email, password);
        navigate("/", { replace: true });
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error(error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{isSignUp ? "Criar Conta" : "Entrar"}</CardTitle>
          <CardDescription>
            {isSignUp ? "Crie sua conta para começar" : "Entre para acessar seu Kanban"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <>
                <div>
                  <Input
                    type="text"
                    placeholder="Nome completo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Input
                    type="tel"
                    placeholder="Telefone (opcional)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </>
            )}
            <div>
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-background"></div>
                  {isSignUp ? "Criando conta..." : "Entrando..."}
                </div>
              ) : (
                <>{isSignUp ? "Registrar" : "Entrar"}</>
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setIsSignUp(!isSignUp)}
            >
              {isSignUp ? "Já tem conta? Entre" : "Não tem conta? Registre-se"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

import { createContext, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string, phone?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, name: string, phone?: string) => {
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`
      }
    });
    
    if (error) {
      toast.error("Erro ao registrar", { description: error.message });
      throw error;
    }

    // Criar perfil do usuário
    if (data.user) {
      const { error: profileError } = await supabase
        .from("profiles")
        .insert([{ 
          id: data.user.id, 
          name, 
          phone: phone || null 
        }]);

      if (profileError) {
        toast.error("Erro ao criar perfil", { description: profileError.message });
        throw profileError;
      }
    }

    toast.success("Sucesso!", { description: "Conta criada com sucesso" });
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      setLoading(false);
      toast.error("Erro ao entrar", { description: error.message });
      throw error;
    }

    // Verificar se perfil existe, se não, criar
    if (data.user) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", data.user.id)
        .single();

      if (profileError || !profile) {
        // Criar perfil padrão se não existir
        const { error: insertError } = await supabase
          .from("profiles")
          .insert([{ 
            id: data.user.id, 
            name: data.user.email?.split('@')[0] || 'Usuário',
            phone: null 
          }]);

        if (insertError && import.meta.env.DEV) {
          console.error("Erro ao criar perfil:", insertError);
        }
      }
    }
    
    setLoading(false);
    toast.success("Sucesso!", { description: "Login realizado com sucesso" });
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Erro ao sair", { description: error.message });
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

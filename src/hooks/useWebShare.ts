import { useToast } from "@/hooks/ui/useToast";

export interface ShareData {
  title: string;
  text: string;
  url?: string;
}

export function useWebShare() {
  const { toast } = useToast();

  const canShare = typeof navigator !== "undefined" && "share" in navigator;

  const share = async (data: ShareData) => {
    if (!canShare) {
      // Fallback: copiar para clipboard
      try {
        const shareText = `${data.title}\n\n${data.text}${data.url ? `\n\n${data.url}` : ""}`;
        await navigator.clipboard.writeText(shareText);
        toast({
          title: "✓ Copiado",
          description: "Conteúdo copiado para a área de transferência",
        });
      } catch (error) {
        toast({
          title: "Erro ao copiar",
          description: "Não foi possível copiar o conteúdo",
          variant: "destructive",
        });
      }
      return;
    }

    try {
      await navigator.share({
        title: data.title,
        text: data.text,
        url: data.url,
      });
      
      toast({
        title: "✓ Compartilhado",
        description: "Conteúdo compartilhado com sucesso",
      });
    } catch (error: any) {
      // Usuário cancelou o compartilhamento
      if (error.name === "AbortError") {
        return;
      }
      
      toast({
        title: "Erro ao compartilhar",
        description: error.message || "Não foi possível compartilhar",
        variant: "destructive",
      });
    }
  };

  return { share, canShare };
}

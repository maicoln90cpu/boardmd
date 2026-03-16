import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { FileText, ExternalLink } from "lucide-react";

interface SharedNoteData {
  title: string;
  content: string | null;
  color: string | null;
}

export default function SharedNote() {
  const { slug } = useParams<{ slug: string }>();
  const [note, setNote] = useState<SharedNoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;

    const fetchSharedNote = async () => {
      const { data, error } = await supabase
        .rpc("get_shared_note", { p_slug: slug });

      if (error || !data || data.length === 0) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setNote(data[0] as SharedNoteData);
      setLoading(false);
    };

    fetchSharedNote();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin p-3 rounded-xl bg-primary/10">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <p className="text-muted-foreground">Carregando nota...</p>
        </div>
      </div>
    );
  }

  if (notFound || !note) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md p-8">
          <div className="p-4 rounded-2xl bg-destructive/10 inline-block mb-4">
            <FileText className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Nota não encontrada</h1>
          <p className="text-muted-foreground">
            Este link pode ter expirado ou a nota foi removida.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <span className="text-sm text-muted-foreground">Nota compartilhada</span>
          </div>
          <a
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            BoardMD
          </a>
        </div>
      </header>

      <main
        className="max-w-4xl mx-auto px-6 py-8 transition-colors"
        style={{ backgroundColor: note.color || undefined }}
      >
        <h1 className="text-3xl font-bold mb-6">{note.title}</h1>
        {note.content && (
          <div
            className="prose prose-sm max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: note.content }}
          />
        )}
      </main>
    </div>
  );
}

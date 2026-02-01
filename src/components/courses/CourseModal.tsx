import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { CourseModulesUploader } from "./CourseModulesUploader";
import { CourseModulesChecklist, type CourseModule } from "./CourseModulesChecklist";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Course, CourseFormData } from "@/types";
import type { CourseCategory } from "@/hooks/useCourseCategories";

const courseSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(200, "Máximo 200 caracteres"),
  author: z.string().max(200, "Máximo 200 caracteres").optional(),
  url: z.string().url("URL inválida").optional().or(z.literal("")),
  price: z.coerce.number().min(0, "Valor deve ser positivo").optional(),
  current_episode: z.coerce.number().min(0).optional(),
  total_episodes: z.coerce.number().min(1, "Mínimo 1 episódio").optional(),
  current_module: z.coerce.number().min(0).optional(),
  total_modules: z.coerce.number().min(1, "Mínimo 1 módulo").optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  status: z.enum(["not_started", "in_progress", "completed", "paused"]).optional(),
  category: z.string().optional(),
  platform: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
  started_at: z.string().optional(),
});

type CourseFormValues = z.infer<typeof courseSchema>;

interface CourseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course?: Course | null;
  onSubmit: (data: CourseFormData & { modules_checklist?: CourseModule[] }) => Promise<void>;
  categories?: CourseCategory[];
}

const statuses = [
  { value: "not_started", label: "Não Iniciado" },
  { value: "in_progress", label: "Em Progresso" },
  { value: "completed", label: "Concluído" },
  { value: "paused", label: "Pausado" },
];

const priorities = [
  { value: "low", label: "Baixa" },
  { value: "medium", label: "Média" },
  { value: "high", label: "Alta" },
];

export function CourseModal({ open, onOpenChange, course, onSubmit, categories = [] }: CourseModalProps) {
  const [modulesChecklist, setModulesChecklist] = useState<CourseModule[]>([]);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isGeneratingModules, setIsGeneratingModules] = useState(false);

  // Build category options from database categories (filter empty names)
  const categoryOptions = categories
    .filter((cat) => cat.name && cat.name.trim() !== "")
    .map((cat) => ({
      value: cat.name,
      label: cat.name,
      color: cat.color,
    }));

  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      name: "",
      author: "",
      url: "",
      price: 0,
      current_episode: 0,
      total_episodes: 1,
      current_module: 0,
      total_modules: 1,
      priority: "medium",
      status: "not_started",
      category: "",
      platform: "",
      notes: "",
      started_at: "",
    },
  });

  useEffect(() => {
    if (course) {
      form.reset({
        name: course.name,
        author: (course as any).author || "",
        url: course.url || "",
        price: course.price || 0,
        current_episode: course.current_episode || 0,
        total_episodes: course.total_episodes || 1,
        current_module: course.current_module || 0,
        total_modules: course.total_modules || 1,
        priority: course.priority,
        status: course.status,
        category: course.category || "",
        platform: course.platform || "",
        notes: course.notes || "",
        started_at: course.started_at || "",
      });
      // Load existing modules checklist
      const existingModules = (course as any).modules_checklist;
      if (Array.isArray(existingModules)) {
        setModulesChecklist(existingModules);
      } else {
        setModulesChecklist([]);
      }
    } else {
      form.reset({
        name: "",
        author: "",
        url: "",
        price: 0,
        current_episode: 0,
        total_episodes: 1,
        current_module: 0,
        total_modules: 1,
        priority: "medium",
        status: "not_started",
        category: "",
        platform: "",
        notes: "",
        started_at: "",
      });
      setModulesChecklist([]);
    }
    setUploadedImage(null);
  }, [course, form]);

  const handleGenerateModules = async () => {
    if (!uploadedImage) {
      toast.error("Envie uma imagem primeiro");
      return;
    }

    setIsGeneratingModules(true);
    try {
      const { data, error } = await supabase.functions.invoke("parse-course-modules", {
        body: { image: uploadedImage },
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (data?.modules && Array.isArray(data.modules)) {
        setModulesChecklist(data.modules);
        toast.success(`${data.modules.length} módulos extraídos!`);
      } else {
        toast.error("Não foi possível extrair módulos da imagem");
      }
    } catch (error) {
      console.error("Error generating modules:", error);
      toast.error("Erro ao processar imagem");
    } finally {
      setIsGeneratingModules(false);
    }
  };

  const handleToggleModule = (moduleId: string) => {
    setModulesChecklist((prev) =>
      prev.map((m) => (m.id === moduleId ? { ...m, completed: !m.completed } : m))
    );
  };

  const handleSubmit = async (values: CourseFormValues) => {
    await onSubmit({
      name: values.name,
      author: values.author || undefined,
      url: values.url || undefined,
      price: values.price,
      current_episode: values.current_episode,
      total_episodes: values.total_episodes,
      current_module: values.current_module,
      total_modules: values.total_modules,
      priority: values.priority,
      status: values.status,
      category: values.category || undefined,
      platform: values.platform || undefined,
      notes: values.notes || undefined,
      started_at: values.started_at || undefined,
      modules_checklist: modulesChecklist,
    } as any);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {course ? "Editar Curso" : "Adicionar Curso"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Curso *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: React Avançado" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="author"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Autor / Instrutor</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Fernando Daciuk" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="platform"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plataforma</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Udemy, Alura" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categoryOptions.length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">
                            Nenhuma categoria criada
                          </div>
                        ) : (
                          categoryOptions.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full shrink-0" 
                                  style={{ backgroundColor: cat.color }}
                                />
                                <span>{cat.label}</span>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL do Curso</FormLabel>
                  <FormControl>
                    <Input placeholder="https://..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Preço */}
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preço (R$)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Módulos */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="current_module"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Módulo Atual</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="total_modules"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Módulos</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Episódios */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="current_episode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ep. Atual</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="total_episodes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Eps.</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {statuses.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridade</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {priorities.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="started_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data Início</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Anotações</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Observações sobre o curso..."
                      className="resize-none"
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Modules Upload Section */}
            <div className="space-y-3 pt-2 border-t">
              <Label className="flex items-center gap-2">
                📸 Módulos do Curso (via IA)
              </Label>
              
              <CourseModulesUploader
                onImageSelected={setUploadedImage}
                isProcessing={isGeneratingModules}
              />

              {uploadedImage && !isGeneratingModules && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGenerateModules}
                  className="w-full gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  Gerar checklist com IA
                </Button>
              )}

              {isGeneratingModules && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analisando imagem...
                </div>
              )}

              {modulesChecklist.length > 0 && (
                <div className="space-y-2">
                  <Label>Checklist de Módulos</Label>
                  <CourseModulesChecklist
                    modules={modulesChecklist}
                    onToggleModule={handleToggleModule}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {course ? "Salvar" : "Adicionar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

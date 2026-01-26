import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import type { Course, CourseFormData } from "@/types";

const courseSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(200, "Máximo 200 caracteres"),
  url: z.string().url("URL inválida").optional().or(z.literal("")),
  price: z.coerce.number().min(0, "Valor deve ser positivo").optional(),
  current_episode: z.coerce.number().min(0).optional(),
  total_episodes: z.coerce.number().min(1, "Mínimo 1 episódio").optional(),
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
  onSubmit: (data: CourseFormData) => Promise<void>;
}

const categories = [
  { value: "programacao", label: "💻 Programação" },
  { value: "design", label: "🎨 Design" },
  { value: "marketing", label: "📈 Marketing" },
  { value: "negocios", label: "💼 Negócios" },
  { value: "idiomas", label: "🌍 Idiomas" },
  { value: "desenvolvimento_pessoal", label: "🧠 Desenvolvimento Pessoal" },
  { value: "financas", label: "💰 Finanças" },
  { value: "saude", label: "🏃 Saúde" },
  { value: "musica", label: "🎵 Música" },
  { value: "fotografia", label: "📷 Fotografia" },
  { value: "outro", label: "📚 Outro" },
];

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

export function CourseModal({ open, onOpenChange, course, onSubmit }: CourseModalProps) {
  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      name: "",
      url: "",
      price: 0,
      current_episode: 0,
      total_episodes: 1,
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
        url: course.url || "",
        price: course.price || 0,
        current_episode: course.current_episode || 0,
        total_episodes: course.total_episodes || 1,
        priority: course.priority,
        status: course.status,
        category: course.category || "",
        platform: course.platform || "",
        notes: course.notes || "",
        started_at: course.started_at || "",
      });
    } else {
      form.reset({
        name: "",
        url: "",
        price: 0,
        current_episode: 0,
        total_episodes: 1,
        priority: "medium",
        status: "not_started",
        category: "",
        platform: "",
        notes: "",
        started_at: "",
      });
    }
  }, [course, form]);

  const handleSubmit = async (values: CourseFormValues) => {
    await onSubmit({
      name: values.name,
      url: values.url || undefined,
      price: values.price,
      current_episode: values.current_episode,
      total_episodes: values.total_episodes,
      priority: values.priority,
      status: values.status,
      category: values.category || undefined,
      platform: values.platform || undefined,
      notes: values.notes || undefined,
      started_at: values.started_at || undefined,
    });
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
                        {categories.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
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

            <div className="grid grid-cols-3 gap-3">
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

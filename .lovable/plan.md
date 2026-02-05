
# Plano de Implementação - 4 Funcionalidades

## Resumo das Alterações

---

## 1. Atrelar Tarefa a Curso e Vice-Versa

**Impacto:** Alto | **Complexidade:** 7/10

### Análise Técnica

**Tabelas Atuais:**
- `tasks`: Não possui campo para vincular a curso
- `courses`: Não possui campo para vincular a tarefa

### Alterações no Banco de Dados

```sql
-- Adicionar campo na tabela tasks
ALTER TABLE tasks 
ADD COLUMN linked_course_id uuid REFERENCES courses(id) ON DELETE SET NULL;

-- Adicionar campo na tabela courses
ALTER TABLE courses 
ADD COLUMN linked_task_id uuid REFERENCES tasks(id) ON DELETE SET NULL;
```

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/TaskModal.tsx` | Adicionar seletor de curso vinculado |
| `src/components/courses/CourseModal.tsx` | Adicionar seletor de tarefa vinculada |
| `src/hooks/tasks/useTasks.ts` | Adicionar `linked_course_id` ao tipo Task e queries |
| `src/hooks/useCourses.ts` | Adicionar `linked_task_id` ao tipo Course e queries |
| `src/types/index.ts` | Atualizar interfaces |
| `src/components/task-card/TaskCardBadges.tsx` | Mostrar badge de curso vinculado |
| `src/components/courses/CourseCard.tsx` | Mostrar badge de tarefa vinculada |

### Fluxo de Uso

1. **No TaskModal**: Adicionar campo "Curso vinculado" com select dos cursos disponíveis
2. **No CourseModal**: Adicionar campo "Tarefa vinculada" com select de tarefas disponíveis
3. **Nos Cards**: Mostrar ícone/badge indicando vínculo com navegação rápida

---

## 2. Novo Filtro de Data "Amanhã"

**Impacto:** Baixo | **Complexidade:** 2/10

### Análise Técnica

O filtro "tomorrow" já existe implementado em `src/lib/taskFilters.ts` (linhas 144-148):
```typescript
case "tomorrow": {
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return taskDueDate !== null && taskDueDate.toDateString() === tomorrow.toDateString();
}
```

### Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/kanban/KanbanFiltersBar.tsx` | Adicionar opção "Amanhã" no array `dueDateOptions` |

### Alteração Específica

```typescript
// Linha 63-70 - Adicionar "tomorrow" após "today"
const dueDateOptions = [
  { value: "no_date", label: "Sem data", icon: "📭" },
  { value: "overdue", label: "Atrasadas", icon: "🔴" },
  { value: "today", label: "Hoje", icon: "📅" },
  { value: "tomorrow", label: "Amanhã", icon: "🌅" },  // ← ADICIONAR
  { value: "next_7_days", label: "Próximos 7 dias", icon: "📆" },
  { value: "week", label: "Esta semana", icon: "📆" },
  { value: "month", label: "Este mês", icon: "🗓️" },
];
```

---

## 3. Avançar/Retroceder Módulos IA no Card Externo

**Impacto:** Médio | **Complexidade:** 5/10

### Análise Técnica

Atualmente, quando um curso tem `modules_checklist` (gerado por IA), o card mostra apenas texto estático:
- "📚 X/Y módulos" 
- "Próximo: [título do módulo]"

Não há botões +/- para avançar/retroceder como nos módulos/episódios manuais.

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useCourses.ts` | Adicionar função `incrementAIModule(id, increment)` |
| `src/components/courses/CourseCard.tsx` | Adicionar botões +/- para módulos IA |
| `src/pages/Courses.tsx` | Passar nova função para o CourseCard |

### Nova Função em useCourses.ts

```typescript
const incrementAIModule = useCallback(
  async (id: string, increment: boolean = true): Promise<boolean> => {
    const course = courses.find((c) => c.id === id);
    if (!course) return false;
    
    const aiModules = (course as any).modules_checklist as CourseModule[];
    if (!aiModules || aiModules.length === 0) return false;
    
    // Encontrar o próximo módulo não concluído (para incrementar)
    // Ou o último concluído (para decrementar)
    let updatedModules = [...aiModules];
    
    if (increment) {
      // Marcar o próximo não concluído como concluído
      const nextIndex = updatedModules.findIndex(m => !m.completed);
      if (nextIndex !== -1) {
        updatedModules[nextIndex].completed = true;
      }
    } else {
      // Desmarcar o último concluído
      const lastCompletedIndex = [...updatedModules]
        .reverse()
        .findIndex(m => m.completed);
      if (lastCompletedIndex !== -1) {
        const actualIndex = updatedModules.length - 1 - lastCompletedIndex;
        updatedModules[actualIndex].completed = false;
      }
    }
    
    return updateCourse(id, { modules_checklist: updatedModules });
  },
  [courses, updateCourse]
);
```

### UI no CourseCard

```text
┌──────────────────────────────────────────┐
│ 📚 Módulos do Curso                      │
│  [-]  2/5 módulos concluídos  [+]        │
│  Próximo: 3. Google Analytics 4          │
│  ▓▓▓▓▓▓░░░░░░░░ 40%                      │
└──────────────────────────────────────────┘
```

---

## 4. Adicionar Controle de Capítulos/Episódios Externos nos Cards com IA

**Impacto:** Médio | **Complexidade:** 4/10

### Análise Técnica

Atualmente, quando um curso tem módulos de IA, o card **esconde** os controles de episódios manuais. O usuário solicitou que os episódios também apareçam externamente.

### Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/courses/CourseCard.tsx` | Mostrar controles de episódios mesmo quando há módulos IA |

### Layout Proposto

```text
┌──────────────────────────────────────────┐
│ 📚 Curso de Dados, Traqueamento...       │
│  ⭐                                       │
│  [Concluído] [Média] [Traqueamento]      │
├──────────────────────────────────────────┤
│ 📚 Módulos IA:                           │
│  [-]  1/3 módulos  [+]   33%             │
│  Próximo: 2. Google Analytics 4          │
├──────────────────────────────────────────┤
│ 🎬 Capítulos:                            │
│  [-]  Ep. 0/1  [+]                       │
│  ▓░░░░░░░░░░░░░░ 0%                      │
├──────────────────────────────────────────┤
│ R$ 0.00             Início: 31/01/26     │
│ [Abrir] [✎] [🗑]                         │
└──────────────────────────────────────────┘
```

### Alterações no CourseCard.tsx

Modificar a seção que renderiza o progresso:
- Quando `hasAIModules === true`: mostrar AMBOS os controles (módulos IA + episódios)
- Módulos IA com botões +/- que chamam `onIncrementAIModule`
- Episódios manuais com botões +/- que chamam `onIncrementEpisode`

---

## Resumo de Alterações

| # | Feature | Arquivos Novos | Arquivos Modificados | Complexidade |
|---|---------|----------------|----------------------|--------------|
| 1 | Tarefa ↔ Curso | migração SQL | 7 | 7/10 |
| 2 | Filtro "Amanhã" | 0 | 1 | 2/10 |
| 3 | +/- Módulos IA | 0 | 3 | 5/10 |
| 4 | Episódios externos | 0 | 1 | 4/10 |

**Pontuação Total de Risco: 18/25** - Dentro do limite seguro.

---

## Ordem de Implementação

1. ✅ Filtro "Amanhã" (mais simples)
2. ✅ Controles +/- para módulos IA no CourseCard
3. ✅ Controles de episódios externos nos cards com IA
4. ✅ Migração e vínculo Tarefa ↔ Curso (mais complexo)

---

## Checklist de Testes Manuais

### Filtro Amanhã:
- [ ] Acessar página Kanban/Projetos
- [ ] Abrir filtro de Vencimento
- [ ] Verificar que opção "Amanhã" aparece
- [ ] Selecionar "Amanhã" e verificar que apenas tarefas com vencimento para amanhã aparecem

### Módulos IA com +/-:
- [ ] Abrir card de curso COM módulos gerados por IA
- [ ] Clicar em [+] e verificar que próximo módulo é marcado como concluído
- [ ] Clicar em [-] e verificar que último módulo concluído é desmarcado
- [ ] Verificar que a barra de progresso atualiza corretamente

### Episódios externos em cards com IA:
- [ ] Abrir card de curso COM módulos IA
- [ ] Verificar que TAMBÉM aparecem os controles de episódios (Ep. X/Y)
- [ ] Testar incrementar/decrementar episódios
- [ ] Verificar que ambos os progressos (módulos e episódios) são exibidos

### Vínculo Tarefa ↔ Curso:
- [ ] Criar nova tarefa
- [ ] No modal, selecionar um curso no campo "Curso vinculado"
- [ ] Salvar e verificar badge no card da tarefa
- [ ] Clicar no badge e verificar navegação para o curso
- [ ] Editar curso e selecionar uma tarefa no campo "Tarefa vinculada"
- [ ] Salvar e verificar badge no card do curso
- [ ] Clicar no badge e verificar navegação para a tarefa

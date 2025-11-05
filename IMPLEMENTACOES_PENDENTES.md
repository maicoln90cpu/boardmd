# Implementações Pendentes - Kanban Board

## 1. Notificações de Prazo (Due Date Alerts)
- Hook personalizado para verificar tarefas com prazo próximo
- Toast automático quando a data de entrega estiver próxima (ex: 24h antes)
- Indicador visual no card da tarefa quando o prazo estiver próximo

## 2. Exportar Visual (PNG/PDF)
- Botão "Exportar Visual" no menu lateral
- Usar html2canvas para capturar screenshot do quadro
- Usar jsPDF para gerar PDF
- Download automático do arquivo gerado

## 3. Resumo Lateral / Dashboard
- Painel lateral com estatísticas:
  - Total de tarefas por status
  - Tarefas concluídas hoje/semana
  - Tarefas com prazo próximo
  - Gráfico de progresso

## 4. Customização de Colunas
- Modal para adicionar novas colunas além das 3 padrão
- Renomear colunas existentes
- Reordenar colunas (drag & drop)
- Deletar colunas customizadas (com confirmação)

## 5. Melhorias na Importação de JSON
- Validação mais robusta do arquivo JSON
- Merge inteligente de dados (não sobrescrever, apenas adicionar)
- Preview dos dados antes de importar
- Opção de importar apenas categorias ou apenas tarefas

## 6. Refinamentos de UI/UX
- Animações de transição mais suaves
- Loading states mais elegantes
- Empty states para quando não há tarefas
- Confirmação visual ao salvar/criar/deletar
- Melhorar responsividade mobile
- Adicionar atalhos de teclado (ex: Ctrl+N para nova tarefa)

---

## Prioridade de Implementação

**Alta prioridade:**
- Notificações de Prazo (1)
- Exportar Visual (2)
- Customização de Colunas (4)

**Média prioridade:**
- Resumo Lateral (3)
- Melhorias na Importação (5)

**Baixa prioridade:**
- Refinamentos de UI/UX (6) - podem ser implementados incrementalmente

export interface NoteTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  content: string;
}

export const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: "meeting",
    name: "Ata de Reunião",
    icon: "📋",
    description: "Modelo para registrar decisões e ações de reuniões",
    content: `<h2>📋 Ata de Reunião</h2>
<p><strong>Data:</strong> ${new Date().toLocaleDateString("pt-BR")}</p>
<p><strong>Participantes:</strong> </p>
<p><strong>Pauta:</strong> </p>
<hr>
<h3>📌 Pontos Discutidos</h3>
<ul><li><p></p></li></ul>
<h3>✅ Decisões Tomadas</h3>
<ul><li><p></p></li></ul>
<h3>🎯 Ações / Próximos Passos</h3>
<ul class="task-list" data-type="taskList">
<li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Ação 1 — Responsável: </p></div></li>
<li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Ação 2 — Responsável: </p></div></li>
</ul>
<h3>📅 Próxima Reunião</h3>
<p>Data: </p>`,
  },
  {
    id: "daily",
    name: "Daily Standup",
    icon: "🧍",
    description: "Modelo para daily standup (o que fiz, o que vou fazer, bloqueios)",
    content: `<h2>🧍 Daily Standup — ${new Date().toLocaleDateString("pt-BR")}</h2>
<h3>✅ O que fiz ontem</h3>
<ul><li><p></p></li></ul>
<h3>🎯 O que vou fazer hoje</h3>
<ul><li><p></p></li></ul>
<h3>🚧 Bloqueios / Impedimentos</h3>
<ul><li><p>Nenhum</p></li></ul>`,
  },
  {
    id: "brainstorm",
    name: "Brainstorm",
    icon: "💡",
    description: "Modelo para sessão de brainstorming e ideação",
    content: `<h2>💡 Brainstorm</h2>
<p><strong>Tema:</strong> </p>
<p><strong>Data:</strong> ${new Date().toLocaleDateString("pt-BR")}</p>
<hr>
<h3>🌊 Ideias Livres</h3>
<ul><li><p></p></li></ul>
<h3>⭐ Ideias Favoritas</h3>
<ol><li><p></p></li></ol>
<h3>🔍 Critérios de Avaliação</h3>
<ul>
<li><p>Viabilidade: </p></li>
<li><p>Impacto: </p></li>
<li><p>Esforço: </p></li>
</ul>
<h3>🎯 Próximos Passos</h3>
<ul class="task-list" data-type="taskList">
<li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p></p></div></li>
</ul>`,
  },
  {
    id: "retro",
    name: "Retrospectiva",
    icon: "🔄",
    description: "Modelo para retrospectiva semanal ou de sprint",
    content: `<h2>🔄 Retrospectiva — Semana de ${new Date().toLocaleDateString("pt-BR")}</h2>
<h3>🟢 O que foi bem</h3>
<ul><li><p></p></li></ul>
<h3>🔴 O que pode melhorar</h3>
<ul><li><p></p></li></ul>
<h3>💡 Aprendizados</h3>
<ul><li><p></p></li></ul>
<h3>🎯 Ações para a Próxima Semana</h3>
<ul class="task-list" data-type="taskList">
<li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p></p></div></li>
</ul>`,
  },
  {
    id: "checklist",
    name: "Checklist",
    icon: "✅",
    description: "Modelo de checklist genérico reutilizável",
    content: `<h2>✅ Checklist</h2>
<p><strong>Título:</strong> </p>
<hr>
<ul class="task-list" data-type="taskList">
<li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Item 1</p></div></li>
<li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Item 2</p></div></li>
<li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Item 3</p></div></li>
</ul>`,
  },
];

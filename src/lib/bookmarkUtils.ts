/**
 * Utilitários para importar/exportar bookmarks no formato Netscape HTML
 * Compatível com Chrome, Firefox, Edge e Safari
 */

export interface BookmarkEntry {
  title: string;
  url: string;
}

/**
 * Gera um arquivo HTML de bookmarks no formato Netscape
 */
export function exportToBookmarkHtml(links: BookmarkEntry[]): string {
  const bookmarkItems = links
    .map(
      (link) =>
        `    <DT><A HREF="${escapeHtml(link.url)}">${escapeHtml(link.title)}</A>`
    )
    .join("\n");

  return `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
  <DT><H3>Links Rápidos</H3>
  <DL><p>
${bookmarkItems}
  </DL><p>
</DL><p>`;
}

/**
 * Faz parse de um arquivo HTML de bookmarks do navegador
 * Extrai todos os links (<A HREF="...">) encontrados
 */
export function parseBookmarkHtml(html: string): BookmarkEntry[] {
  const entries: BookmarkEntry[] = [];
  // Match <A HREF="url">title</A> — case insensitive
  const regex = /<A\s[^>]*HREF="([^"]*)"[^>]*>(.*?)<\/A>/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(html)) !== null) {
    const url = match[1].trim();
    const title = stripHtml(match[2]).trim();
    if (url && title && url.startsWith("http")) {
      entries.push({ title, url });
    }
  }

  return entries;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, "");
}

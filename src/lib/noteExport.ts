import jsPDF from "jspdf";

/**
 * Convert TipTap HTML content to plain Markdown (best-effort).
 */
export function htmlToMarkdown(html: string): string {
  let md = html;

  // Headers
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n\n");
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n\n");
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n\n");
  md = md.replace(/<h4[^>]*>(.*?)<\/h4>/gi, "#### $1\n\n");

  // Bold / italic / underline
  md = md.replace(/<strong>(.*?)<\/strong>/gi, "**$1**");
  md = md.replace(/<b>(.*?)<\/b>/gi, "**$1**");
  md = md.replace(/<em>(.*?)<\/em>/gi, "*$1*");
  md = md.replace(/<i>(.*?)<\/i>/gi, "*$1*");
  md = md.replace(/<u>(.*?)<\/u>/gi, "$1");

  // Links
  md = md.replace(/<a[^>]+href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)");

  // Images
  md = md.replace(/<img[^>]+src="([^"]*)"[^>]*\/?>/gi, "![]($1)");

  // Lists
  md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n");
  md = md.replace(/<\/?[ou]l[^>]*>/gi, "\n");

  // Code blocks
  md = md.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, "```\n$1\n```\n\n");
  md = md.replace(/<code>(.*?)<\/code>/gi, "`$1`");

  // Paragraphs and breaks
  md = md.replace(/<br\s*\/?>/gi, "\n");
  md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n\n");

  // Strip remaining tags
  md = md.replace(/<[^>]+>/g, "");

  // Decode HTML entities
  md = md.replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");

  // Clean up extra newlines
  md = md.replace(/\n{3,}/g, "\n\n").trim();

  return md;
}

export function exportNoteAsMarkdown(title: string, content: string) {
  const md = `# ${title}\n\n${htmlToMarkdown(content || "")}`;
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/[^a-zA-Z0-9À-ú ]/g, "").trim() || "nota"}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportNoteAsPDF(title: string, content: string) {
  const plainText = htmlToMarkdown(content || "");
  const pdf = new jsPDF({ unit: "mm", format: "a4" });

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text(title, 15, 20);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);

  const lines = pdf.splitTextToSize(plainText, 180);
  let y = 32;
  const pageHeight = pdf.internal.pageSize.getHeight();

  for (const line of lines) {
    if (y > pageHeight - 15) {
      pdf.addPage();
      y = 15;
    }
    pdf.text(line, 15, y);
    y += 5.5;
  }

  pdf.save(`${title.replace(/[^a-zA-Z0-9À-ú ]/g, "").trim() || "nota"}.pdf`);
}

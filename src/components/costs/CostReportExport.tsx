import { Button } from "@/components/ui/button";
import { Share2, FileDown, MessageCircle } from "lucide-react";
import { useWebShare } from "@/hooks/useWebShare";
import { jsPDF } from "jspdf";
import type { CostTheme, CostItem } from "@/hooks/useCostCalculator";

interface Props {
  theme: CostTheme;
  items: CostItem[];
  totals: { byOriginal: Record<string, number>; converted: Record<string, number> };
  reportText: string;
}

export function CostReportExport({ theme, items, totals, reportText }: Props) {
  const { share } = useWebShare();

  const handleWhatsApp = () => {
    const text = encodeURIComponent(reportText);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const handleShare = () => {
    share({
      title: theme.name,
      text: reportText,
    });
  };

  const handlePDF = () => {
    const doc = new jsPDF();
    const margin = 20;
    let y = margin;

    doc.setFontSize(18);
    doc.text(theme.name, margin, y);
    y += 12;

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Gerado em ${new Date().toLocaleDateString("pt-BR")}`, margin, y);
    y += 10;

    // Items
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text("Itens", margin, y);
    y += 8;

    doc.setFontSize(9);
    for (const item of items) {
      const line = `• ${item.description}: ${Number(item.amount).toFixed(2)} ${item.currency} (${item.cost_date})`;
      doc.text(line, margin + 4, y);
      y += 6;
      if (y > 270) {
        doc.addPage();
        y = margin;
      }
    }

    y += 6;
    doc.setFontSize(12);
    doc.text("Totais Convertidos", margin, y);
    y += 8;

    doc.setFontSize(10);
    for (const cur of theme.currencies) {
      const val = (totals.converted[cur.code] || 0).toFixed(2);
      doc.text(`${cur.name} (${cur.code}): ${val}`, margin + 4, y);
      y += 6;
    }

    y += 6;
    doc.setFontSize(12);
    doc.text("Câmbios Utilizados", margin, y);
    y += 8;

    doc.setFontSize(9);
    for (const [key, val] of Object.entries(theme.exchange_rates)) {
      const [from, to] = key.split("_");
      doc.text(`1 ${from} = ${val} ${to}`, margin + 4, y);
      y += 5;
    }

    doc.save(`${theme.name.replace(/\s+/g, "_")}_custos.pdf`);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={handlePDF} className="gap-1">
        <FileDown className="h-4 w-4" /> PDF
      </Button>
      <Button variant="outline" size="sm" onClick={handleWhatsApp} className="gap-1">
        <MessageCircle className="h-4 w-4" /> WhatsApp
      </Button>
      <Button variant="outline" size="sm" onClick={handleShare} className="gap-1">
        <Share2 className="h-4 w-4" /> Compartilhar
      </Button>
    </div>
  );
}

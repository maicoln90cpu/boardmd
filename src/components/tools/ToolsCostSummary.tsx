import { useMemo } from "react";
import { DollarSign, TrendingUp, Wrench } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tool } from "@/hooks/useTools";

interface ToolsCostSummaryProps {
  tools: Tool[];
}

export function ToolsCostSummary({ tools }: ToolsCostSummaryProps) {
  const stats = useMemo(() => {
    const toolsWithCost = tools.filter(t => t.monthly_cost && t.monthly_cost > 0);
    const totalMonthly = toolsWithCost.reduce((sum, t) => sum + (t.monthly_cost || 0), 0);
    const totalAnnual = totalMonthly * 12;
    const averageCost = toolsWithCost.length > 0 ? totalMonthly / toolsWithCost.length : 0;
    
    return {
      totalMonthly,
      totalAnnual,
      averageCost,
      toolsWithCost: toolsWithCost.length,
      totalTools: tools.length,
    };
  }, [tools]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (stats.totalTools === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Custo Mensal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CardTitle className="text-2xl">
            {formatCurrency(stats.totalMonthly)}
          </CardTitle>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Custo Anual
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CardTitle className="text-2xl">
            {formatCurrency(stats.totalAnnual)}
          </CardTitle>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Média por Ferramenta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CardTitle className="text-2xl">
            {formatCurrency(stats.averageCost)}
          </CardTitle>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Ferramentas com Custo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CardTitle className="text-2xl">
            {stats.toolsWithCost} / {stats.totalTools}
          </CardTitle>
        </CardContent>
      </Card>
    </div>
  );
}

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wifi, MessageSquare, History } from "lucide-react";
import { WhatsAppConnection } from "./WhatsAppConnection";
import { WhatsAppTemplates } from "./WhatsAppTemplates";
import { WhatsAppLogs } from "./WhatsAppLogs";

export function WhatsAppSettings() {
  return (
    <Tabs defaultValue="connection" className="space-y-4">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="connection" className="flex items-center gap-2">
          <Wifi className="h-4 w-4" />
          <span className="hidden sm:inline">Conexão</span>
          <span className="sm:hidden">Conn</span>
        </TabsTrigger>
        <TabsTrigger value="templates" className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          <span className="hidden sm:inline">Templates</span>
          <span className="sm:hidden">Msgs</span>
        </TabsTrigger>
        <TabsTrigger value="logs" className="flex items-center gap-2">
          <History className="h-4 w-4" />
          <span className="hidden sm:inline">Histórico</span>
          <span className="sm:hidden">Log</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="connection">
        <WhatsAppConnection />
      </TabsContent>
      <TabsContent value="templates">
        <WhatsAppTemplates />
      </TabsContent>
      <TabsContent value="logs">
        <WhatsAppLogs />
      </TabsContent>
    </Tabs>
  );
}

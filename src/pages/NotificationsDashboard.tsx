import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Bell, Calendar, Layers, FileText, BarChart3, Settings } from "lucide-react";
import { PushNotificationsSettings } from "@/components/PushNotificationsSettings";
import { PushNotificationDiagnostics } from "@/components/PushNotificationDiagnostics";
import { PushNotificationMonitor } from "@/components/dashboard/PushNotificationMonitor";
import { NotificationTemplatesEditor } from "@/components/NotificationTemplatesEditor";
import { useNavigate } from "react-router-dom";

export default function NotificationsDashboard() {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-background flex">
      <div className="hidden md:block">
        <div className="fixed left-0 top-0 h-screen w-64 border-r border-border bg-card">
          <div className="px-6 py-4 border-b">
            <h1 className="text-xl font-bold">Kanban Board</h1>
          </div>
          <nav className="flex flex-col gap-1 p-4">
            <Button variant="ghost" onClick={() => navigate("/")} className="justify-start gap-3">
              <Calendar className="h-4 w-4" />
              Diário
            </Button>
            <Button variant="ghost" onClick={() => navigate("/")} className="justify-start gap-3">
              <Layers className="h-4 w-4" />
              Projetos
            </Button>
            <Button variant="ghost" onClick={() => navigate("/calendar")} className="justify-start gap-3">
              <Calendar className="h-4 w-4" />
              Calendário
            </Button>
            <Button variant="ghost" onClick={() => navigate("/notes")} className="justify-start gap-3">
              <FileText className="h-4 w-4" />
              Anotações
            </Button>
            <Button variant="ghost" onClick={() => navigate("/dashboard")} className="justify-start gap-3">
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </Button>
            <Button variant="secondary" className="justify-start gap-3">
              <Bell className="h-4 w-4" />
              Notificações
            </Button>
            <Button variant="ghost" onClick={() => navigate("/config")} className="justify-start gap-3">
              <Settings className="h-4 w-4" />
              Setup
            </Button>
          </nav>
        </div>
      </div>

      <div className="flex-1 md:ml-64">
        <div className="container mx-auto px-4 py-6 md:py-8 pb-24 md:pb-8">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <Bell className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">Central de Notificações</h1>
            </div>
            <p className="text-muted-foreground">
              Configure, monitore e diagnostique o sistema de notificações push
            </p>
          </div>

          <Tabs defaultValue="settings" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
              <TabsTrigger value="settings">Configurações</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
              <TabsTrigger value="monitor">Monitor</TabsTrigger>
              <TabsTrigger value="diagnostics">Diagnóstico</TabsTrigger>
            </TabsList>

            <TabsContent value="settings" className="space-y-4">
              <PushNotificationsSettings />
            </TabsContent>

            <TabsContent value="templates" className="space-y-4">
              <NotificationTemplatesEditor />
            </TabsContent>

            <TabsContent value="monitor" className="space-y-4">
              <PushNotificationMonitor />
            </TabsContent>

            <TabsContent value="diagnostics" className="space-y-4">
              <PushNotificationDiagnostics />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

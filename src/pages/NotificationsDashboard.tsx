import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell } from "lucide-react";
import { PushNotificationsSettings } from "@/components/PushNotificationsSettings";
import { PushNotificationDiagnostics } from "@/components/PushNotificationDiagnostics";
import { PushNotificationMonitor } from "@/components/dashboard/PushNotificationMonitor";
import { NotificationTemplatesEditor } from "@/components/NotificationTemplatesEditor";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { useTheme } from "@/contexts/ThemeContext";

export default function NotificationsDashboard() {
  const navigate = useNavigate();
  const { toggleTheme } = useTheme();
  
  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar
        onExport={() => {}}
        onImport={() => {}}
        onThemeToggle={toggleTheme}
        onViewChange={(mode) => navigate(`/?view=${mode}`)}
        viewMode="daily"
      />

      <div className="flex-1">
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

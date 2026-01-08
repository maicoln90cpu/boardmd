import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Settings, History, MessageSquare } from "lucide-react";
import { OneSignalSettings } from "@/components/OneSignalSettings";
import { NotificationPreferences } from "@/components/notifications/NotificationPreferences";
import { NotificationHistory } from "@/components/notifications/NotificationHistory";
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
              Configure e monitore o sistema de notificações push
            </p>
          </div>

          <Tabs defaultValue="config" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
              <TabsTrigger value="config" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline">Ativar Push</span>
                <span className="sm:hidden">Push</span>
              </TabsTrigger>
              <TabsTrigger value="preferences" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Preferências</span>
                <span className="sm:hidden">Config</span>
              </TabsTrigger>
              <TabsTrigger value="templates" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <span className="hidden sm:inline">Templates</span>
                <span className="sm:hidden">Msgs</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">Histórico</span>
                <span className="sm:hidden">Log</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="config" className="space-y-4">
              <OneSignalSettings />
            </TabsContent>

            <TabsContent value="preferences" className="space-y-4">
              <NotificationPreferences />
            </TabsContent>

            <TabsContent value="templates" className="space-y-4">
              <NotificationTemplatesEditor />
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <NotificationHistory />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

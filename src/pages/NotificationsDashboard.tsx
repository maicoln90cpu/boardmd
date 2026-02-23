import { lazy, Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Settings, History, MessageSquare } from "lucide-react";
import { PushProviderSelector } from "@/components/PushProviderSelector";
import { Sidebar } from "@/components/Sidebar";
import { useTheme } from "@/contexts/ThemeContext";
import { Skeleton } from "@/components/ui/skeleton";

const NotificationPreferences = lazy(() => import("@/components/notifications/NotificationPreferences").then(m => ({ default: m.NotificationPreferences })));
const NotificationHistory = lazy(() => import("@/components/notifications/NotificationHistory").then(m => ({ default: m.NotificationHistory })));
const NotificationTemplatesEditor = lazy(() => import("@/components/NotificationTemplatesEditor").then(m => ({ default: m.NotificationTemplatesEditor })));
const WhatsAppSettings = lazy(() => import("@/components/whatsapp/WhatsAppSettings").then(m => ({ default: m.WhatsAppSettings })));

// WhatsApp icon inline
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

function TabSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-10 w-3/4" />
    </div>
  );
}

export default function NotificationsDashboard() {
  const { toggleTheme } = useTheme();
  
  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar
        onExport={() => {}}
        onImport={() => {}}
        onThemeToggle={toggleTheme}
      />

      <div className="flex-1">
        <div className="container mx-auto px-4 py-6 md:py-8 pb-24 md:pb-8">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <Bell className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">Central de Notificações</h1>
            </div>
            <p className="text-muted-foreground">
              Configure push, WhatsApp e monitore o sistema de notificações
            </p>
          </div>

          <Tabs defaultValue="config" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 lg:grid-cols-5">
              <TabsTrigger value="config" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline">Ativar Push</span>
                <span className="sm:hidden">Push</span>
              </TabsTrigger>
              <TabsTrigger value="whatsapp" className="flex items-center gap-2">
                <WhatsAppIcon className="h-4 w-4" />
                <span className="hidden sm:inline">WhatsApp</span>
                <span className="sm:hidden">Whats</span>
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
              <PushProviderSelector />
            </TabsContent>

            <TabsContent value="whatsapp" className="space-y-4">
              <Suspense fallback={<TabSkeleton />}>
                <WhatsAppSettings />
              </Suspense>
            </TabsContent>

            <TabsContent value="preferences" className="space-y-4">
              <Suspense fallback={<TabSkeleton />}>
                <NotificationPreferences />
              </Suspense>
            </TabsContent>

            <TabsContent value="templates" className="space-y-4">
              <Suspense fallback={<TabSkeleton />}>
                <NotificationTemplatesEditor />
              </Suspense>
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <Suspense fallback={<TabSkeleton />}>
                <NotificationHistory />
              </Suspense>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

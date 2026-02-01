import { useState } from "react";
import { Key, Plus, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ApiKeyCard } from "./ApiKeyCard";
import { ApiKeyModal } from "./ApiKeyModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useApiKeys, type ApiKey } from "@/hooks/useApiKeys";

export function ApiKeysList() {
  const { apiKeys, loading, addApiKey, updateApiKey, deleteApiKey } = useApiKeys();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [keyToEdit, setKeyToEdit] = useState<ApiKey | null>(null);
  const [keyToDelete, setKeyToDelete] = useState<ApiKey | null>(null);

  const handleAdd = () => {
    setKeyToEdit(null);
    setIsModalOpen(true);
  };

  const handleEdit = (apiKey: ApiKey) => {
    setKeyToEdit(apiKey);
    setIsModalOpen(true);
  };

  const handleSave = async (data: { source: string; name: string; key_value: string }): Promise<boolean> => {
    if (keyToEdit) {
      return updateApiKey(keyToEdit.id, data);
    } else {
      const result = await addApiKey(data);
      return !!result;
    }
  };

  const handleConfirmDelete = async () => {
    if (keyToDelete) {
      await deleteApiKey(keyToDelete.id);
      setKeyToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(2)].map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-lg bg-muted animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (apiKeys.length === 0) {
    return (
      <>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center justify-center p-8 text-center"
        >
          <div className="relative mb-6">
            <div className="p-6 rounded-full bg-amber-500/10">
              <Key className="h-12 w-12 text-amber-500" />
            </div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="absolute -top-1 -right-1"
            >
              <Sparkles className="h-5 w-5 text-yellow-500" />
            </motion.div>
          </div>
          <h3 className="text-lg font-semibold mb-2">Nenhuma API Key cadastrada</h3>
          <p className="text-sm text-muted-foreground max-w-xs mb-6">
            Adicione suas API Keys para gerenciá-las de forma segura em um só lugar.
          </p>
          <Button onClick={handleAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            Adicionar API Key
          </Button>
        </motion.div>

        <ApiKeyModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          apiKey={keyToEdit}
          onSave={handleSave}
        />
      </>
    );
  }

  // Group by source
  const groupedBySource = apiKeys.reduce((acc, key) => {
    if (!acc[key.source]) {
      acc[key.source] = [];
    }
    acc[key.source].push(key);
    return acc;
  }, {} as Record<string, ApiKey[]>);

  return (
    <>
      <div className="space-y-6">
        {/* Add button */}
        <div className="flex justify-end">
          <Button onClick={handleAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            Adicionar API Key
          </Button>
        </div>

        {/* Grouped list */}
        {Object.entries(groupedBySource).map(([source, keys]) => (
          <div key={source} className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              🔑 {source} ({keys.length})
            </h3>
            <div className="space-y-2">
              {keys.map((apiKey) => (
                <ApiKeyCard
                  key={apiKey.id}
                  apiKey={apiKey}
                  onEdit={handleEdit}
                  onDelete={setKeyToDelete}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      <ApiKeyModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        apiKey={keyToEdit}
        onSave={handleSave}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!keyToDelete} onOpenChange={() => setKeyToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir API Key</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a chave "{keyToDelete?.name}" de {keyToDelete?.source}? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

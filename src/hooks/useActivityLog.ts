import { useLocalStorage } from "./useLocalStorage";

export interface ActivityLogEntry {
  id: string;
  action: string;
  details: string;
  timestamp: string;
}

export function useActivityLog() {
  const [activityLog, setActivityLog] = useLocalStorage<ActivityLogEntry[]>("kanban_activity_log", []);

  const addActivity = (action: string, details: string) => {
    const entry: ActivityLogEntry = {
      id: crypto.randomUUID(),
      action,
      details,
      timestamp: new Date().toISOString(),
    };

    setActivityLog((prev) => [entry, ...prev].slice(0, 50)); // Keep last 50 entries
  };

  const clearActivity = () => {
    setActivityLog([]);
  };

  return { activityLog, addActivity, clearActivity };
}

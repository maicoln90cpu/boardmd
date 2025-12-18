import React, { createContext, useContext, useState, useCallback } from "react";

interface SwipeContextType {
  openCardId: string | null;
  setOpenCardId: (id: string | null) => void;
  closeAll: () => void;
}

const SwipeContext = createContext<SwipeContextType | undefined>(undefined);

export function SwipeProvider({ children }: { children: React.ReactNode }) {
  const [openCardId, setOpenCardId] = useState<string | null>(null);

  const closeAll = useCallback(() => {
    setOpenCardId(null);
  }, []);

  return (
    <SwipeContext.Provider value={{ openCardId, setOpenCardId, closeAll }}>
      {children}
    </SwipeContext.Provider>
  );
}

export function useSwipe() {
  const context = useContext(SwipeContext);
  if (context === undefined) {
    throw new Error("useSwipe must be used within a SwipeProvider");
  }
  return context;
}

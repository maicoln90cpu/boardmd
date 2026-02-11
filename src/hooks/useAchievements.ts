import { useEffect, useCallback } from "react";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { notifyAchievement } from "@/lib/whatsappNotifier";

interface Badge {
  id: string;
  icon: string;
  name: string;
  description: string;
  condition: (stats: BadgeStats) => boolean;
  rarity: "common" | "rare" | "epic" | "legendary";
}

interface BadgeStats {
  level: number;
  totalPoints: number;
  currentStreak: number;
  bestStreak: number;
  tasksCompletedToday: number;
  tasksCompletedWeek: number;
  totalTasksCompleted: number;
}

// Lista completa de badges
export const allBadges: Badge[] = [
  // Streak badges
  {
    id: "streak_3",
    icon: "🔥",
    name: "Iniciante em Fogo",
    description: "Complete tarefas por 3 dias seguidos",
    condition: (s) => s.currentStreak >= 3 || s.bestStreak >= 3,
    rarity: "common",
  },
  {
    id: "streak_7",
    icon: "🔥",
    name: "Semana de Fogo",
    description: "Complete tarefas por 7 dias seguidos",
    condition: (s) => s.currentStreak >= 7 || s.bestStreak >= 7,
    rarity: "rare",
  },
  {
    id: "streak_30",
    icon: "💎",
    name: "Mês Imparável",
    description: "Complete tarefas por 30 dias seguidos",
    condition: (s) => s.currentStreak >= 30 || s.bestStreak >= 30,
    rarity: "legendary",
  },
  
  // Points badges
  {
    id: "points_100",
    icon: "⭐",
    name: "Primeira Centena",
    description: "Acumule 100 pontos",
    condition: (s) => s.totalPoints >= 100,
    rarity: "common",
  },
  {
    id: "points_500",
    icon: "⭐",
    name: "Estrela Ascendente",
    description: "Acumule 500 pontos",
    condition: (s) => s.totalPoints >= 500,
    rarity: "rare",
  },
  {
    id: "points_1000",
    icon: "🌟",
    name: "Super Estrela",
    description: "Acumule 1000 pontos",
    condition: (s) => s.totalPoints >= 1000,
    rarity: "epic",
  },
  {
    id: "points_5000",
    icon: "💫",
    name: "Estrela Lendária",
    description: "Acumule 5000 pontos",
    condition: (s) => s.totalPoints >= 5000,
    rarity: "legendary",
  },

  // Productivity badges
  {
    id: "daily_5",
    icon: "🎯",
    name: "Dia Produtivo",
    description: "Complete 5 tarefas em um dia",
    condition: (s) => s.tasksCompletedToday >= 5,
    rarity: "common",
  },
  {
    id: "daily_10",
    icon: "🚀",
    name: "Super Produtivo",
    description: "Complete 10 tarefas em um dia",
    condition: (s) => s.tasksCompletedToday >= 10,
    rarity: "rare",
  },
  {
    id: "weekly_35",
    icon: "💪",
    name: "Semana Perfeita",
    description: "Complete 35 tarefas em uma semana (5/dia)",
    condition: (s) => s.tasksCompletedWeek >= 35,
    rarity: "epic",
  },

  // Level badges
  {
    id: "level_5",
    icon: "🏅",
    name: "Aprendiz",
    description: "Alcance o nível 5",
    condition: (s) => s.level >= 5,
    rarity: "common",
  },
  {
    id: "level_10",
    icon: "👑",
    name: "Mestre",
    description: "Alcance o nível 10",
    condition: (s) => s.level >= 10,
    rarity: "rare",
  },
  {
    id: "level_25",
    icon: "🎖️",
    name: "Veterano",
    description: "Alcance o nível 25",
    condition: (s) => s.level >= 25,
    rarity: "epic",
  },
  {
    id: "level_50",
    icon: "🏆",
    name: "Lenda",
    description: "Alcance o nível 50",
    condition: (s) => s.level >= 50,
    rarity: "legendary",
  },
];

export const rarityColors: Record<Badge["rarity"], string> = {
  common: "bg-slate-500/10 border-slate-500/30 text-slate-700 dark:text-slate-300",
  rare: "bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300",
  epic: "bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-300",
  legendary: "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300",
};

export const rarityNames: Record<Badge["rarity"], string> = {
  common: "Comum",
  rare: "Raro",
  epic: "Épico",
  legendary: "Lendário",
};

// Hook para gerenciar conquistas
export function useAchievements(stats: BadgeStats | null, userId?: string) {
  const triggerConfetti = useCallback(() => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);

      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);
  }, []);

  const showBadgeUnlocked = useCallback((badge: Badge) => {
    triggerConfetti();
    
    toast.success(`🎉 Nova Conquista: ${badge.name}`, {
      description: badge.description,
      duration: 5000,
    });
  }, [triggerConfetti]);

  // Verificar novas conquistas quando stats mudam
  useEffect(() => {
    if (!stats) return;

    const unlockedBadgeIds = JSON.parse(localStorage.getItem("unlocked-badges") || "[]") as string[];
    const newUnlocked: Badge[] = [];

    allBadges.forEach((badge) => {
      if (!unlockedBadgeIds.includes(badge.id) && badge.condition(stats)) {
        newUnlocked.push(badge);
        unlockedBadgeIds.push(badge.id);
      }
    });

    if (newUnlocked.length > 0) {
      localStorage.setItem("unlocked-badges", JSON.stringify(unlockedBadgeIds));
      
      // Mostrar notificação para cada badge desbloqueado (com delay)
      newUnlocked.forEach((badge, index) => {
        setTimeout(() => {
          showBadgeUnlocked(badge);
          // WhatsApp notification
          if (userId) {
            notifyAchievement(userId, `${badge.icon} ${badge.name}`, badge.rarity === 'legendary' ? 500 : badge.rarity === 'epic' ? 200 : badge.rarity === 'rare' ? 100 : 50);
          }
        }, index * 2000);
      });
    }
  }, [stats, showBadgeUnlocked]);

  // Obter badges desbloqueados
  const getUnlockedBadges = useCallback((): Badge[] => {
    if (!stats) return [];
    return allBadges.filter((badge) => badge.condition(stats));
  }, [stats]);

  // Obter próximos badges
  const getNextBadges = useCallback((): Badge[] => {
    if (!stats) return allBadges.slice(0, 3);
    return allBadges.filter((badge) => !badge.condition(stats)).slice(0, 3);
  }, [stats]);

  return {
    allBadges,
    getUnlockedBadges,
    getNextBadges,
    triggerConfetti,
  };
}

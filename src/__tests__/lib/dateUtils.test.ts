import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  formatDateTimeBR,
  formatDateOnlyBR,
  formatDateShortBR,
  formatTimeOnlyBR,
  formatRelativeDateBR,
  getNowInTimezone,
  formatCalendarDateBR,
  parseDateTimeForSort,
  getTimezone,
  setTimezone,
} from '@/lib/dateUtils';

describe('dateUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock localStorage para retornar timezone padrão
    vi.mocked(localStorage.getItem).mockReturnValue(null);
  });

  describe('getTimezone / setTimezone', () => {
    it('deve retornar timezone padrão quando localStorage está vazio', () => {
      vi.mocked(localStorage.getItem).mockReturnValue(null);
      expect(getTimezone()).toBe('America/Sao_Paulo');
    });

    it('deve retornar timezone salvo no localStorage', () => {
      vi.mocked(localStorage.getItem).mockReturnValue('America/New_York');
      expect(getTimezone()).toBe('America/New_York');
    });

    it('deve salvar timezone no localStorage', () => {
      setTimezone('Europe/London');
      expect(localStorage.setItem).toHaveBeenCalledWith('app-timezone', 'Europe/London');
    });
  });

  describe('formatDateTimeBR', () => {
    it('deve formatar Date object para pt-BR', () => {
      const date = new Date('2024-06-15T14:30:00Z');
      const result = formatDateTimeBR(date);
      expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
      expect(result).toMatch(/\d{2}:\d{2}/);
    });

    it('deve formatar string ISO para pt-BR', () => {
      const result = formatDateTimeBR('2024-06-15T14:30:00Z');
      expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });
  });

  describe('formatDateOnlyBR', () => {
    it('deve formatar apenas a data', () => {
      const date = new Date('2024-06-15T14:30:00Z');
      const result = formatDateOnlyBR(date);
      expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    });
  });

  describe('formatDateShortBR', () => {
    it('deve formatar data curta (dia/mês)', () => {
      const date = new Date('2024-06-15T14:30:00Z');
      const result = formatDateShortBR(date);
      expect(result).toMatch(/^\d{2}\/\d{2}$/);
    });
  });

  describe('formatTimeOnlyBR', () => {
    it('deve formatar apenas o horário', () => {
      const date = new Date('2024-06-15T14:30:00Z');
      const result = formatTimeOnlyBR(date);
      expect(result).toMatch(/^\d{2}:\d{2}$/);
    });
  });

  describe('formatRelativeDateBR', () => {
    it('deve retornar "Hoje" para data de hoje', () => {
      const today = new Date();
      const result = formatRelativeDateBR(today);
      expect(result).toBe('Hoje');
    });

    it('deve retornar "Amanhã" para data de amanhã', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const result = formatRelativeDateBR(tomorrow);
      expect(result).toBe('Amanhã');
    });

    it('deve retornar data formatada para outras datas', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);
      const result = formatRelativeDateBR(futureDate);
      expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    });
  });

  describe('getNowInTimezone', () => {
    it('deve retornar uma data válida', () => {
      const result = getNowInTimezone();
      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBeLessThanOrEqual(Date.now() + 1000);
    });
  });

  describe('formatCalendarDateBR', () => {
    it('deve formatar data para calendário', () => {
      const date = new Date('2024-06-15T14:30:00Z');
      const result = formatCalendarDateBR(date);
      // Deve conter dia da semana abreviado
      expect(result.length).toBeGreaterThan(5);
    });
  });

  describe('parseDateTimeForSort', () => {
    it('deve retornar valores padrão para null', () => {
      const result = parseDateTimeForSort(null);
      expect(result.date).toBe(Number.POSITIVE_INFINITY);
      expect(result.time).toBe(Number.POSITIVE_INFINITY);
    });

    it('deve parsear data ISO corretamente', () => {
      const result = parseDateTimeForSort('2024-06-15T14:30:00Z');
      expect(result.date).toBeGreaterThan(20240000);
      expect(result.time).toBeGreaterThanOrEqual(0);
      expect(result.time).toBeLessThan(1440); // Minutos no dia
    });

    it('deve permitir valor padrão customizado', () => {
      const result = parseDateTimeForSort(null, -1);
      expect(result.date).toBe(-1);
      expect(result.time).toBe(-1);
    });
  });
});

import { endOfMonth, startOfMonth } from 'date-fns';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useServices } from '@/contexts/ServicesContext';
import type { Activity } from '@/types/activity';
import type { Category } from '@/types/category';
import type { DailyReport } from '@/types/report';
import { isoToDate, toISODate } from '@/utils/uiFormat';

export interface DayDetail {
  report: DailyReport;
  activities: Activity[];
  categories: Category[];
}

export function useCalendar(month: Date, selected: Date) {
  const services = useServices();
  const monthKey = toISODate(startOfMonth(month));
  const dayKey = toISODate(selected);

  const [markedDates, setMarkedDates] = useState<Set<string>>(new Set());
  const [day, setDay] = useState<DayDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const monthEnd = toISODate(endOfMonth(isoToDate(monthKey)));
      const [dates, report, activities, categories] = await Promise.all([
        services.activities.getDatesWithRecords(monthKey, monthEnd),
        services.reports.getDaily(dayKey),
        services.activities.list({ date: dayKey }),
        services.categories.list(),
      ]);
      setMarkedDates(new Set(dates));
      setDay({
        report,
        categories,
        activities: [...activities].sort((a, b) => a.startTime.localeCompare(b.startTime)),
      });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível carregar este dia.');
    } finally {
      setLoading(false);
    }
  }, [services, monthKey, dayKey]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return { markedDates, day, loading, error, reload: load };
}
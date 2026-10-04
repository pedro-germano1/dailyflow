import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useServices } from '@/contexts/ServicesContext';
import type { Activity } from '@/types/activity';
import type { DailyReport } from '@/types/report';
import type { User } from '@/types/settings';
import { toISODate, toTimeString } from '@/utils/uiFormat';

export interface DashboardData {
  user: User;
  report: DailyReport;
  nextActivity: Activity | null;
}

export type DashboardState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: DashboardData };

/** Primeira atividade pendente que ainda não começou (HH:mm compara como texto). */
export function findNextActivity(activities: Activity[], nowTime: string): Activity | null {
  return (
    [...activities]
      .filter((a) => a.status === 'pending' && a.startTime >= nowTime)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))[0] ?? null
  );
}

export function useDashboard() {
  const services = useServices();
  const [state, setState] = useState<DashboardState>({ status: 'loading' });

  const load = useCallback(async () => {
    try {
      const now = new Date();
      const today = toISODate(now);
      const [user, report, todays] = await Promise.all([
        services.settings.getUser(),
        services.reports.getDaily(today),
        services.activities.list({ date: today }),
      ]);
      setState({
        status: 'ready',
        data: { user, report, nextActivity: findNextActivity(todays, toTimeString(now)) },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Não foi possível carregar o seu dia.';
      setState({ status: 'error', message });
    }
  }, [services]);

  // Recarrega sempre que a aba ganha foco (ex.: voltou da tela de Rotina)
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return { state, reload: load };
}
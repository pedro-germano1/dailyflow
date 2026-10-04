import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useServices } from '@/contexts/ServicesContext';
import type { Activity } from '@/types/activity';
import type { Category } from '@/types/category';
import type { Id } from '@/types/common';

function messageFrom(error: unknown): string {
  return error instanceof Error ? error.message : 'Algo deu errado. Tente novamente.';
}

export function useRoutine(date: string) {
  const services = useServices();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [cats, list] = await Promise.all([
        services.categories.list(),
        services.activities.list({ date }),
      ]);
      setCategories(cats);
      setActivities([...list].sort((a, b) => a.startTime.localeCompare(b.startTime)));
      setError(null);
    } catch (e) {
      setError(messageFrom(e));
    } finally {
      setLoading(false);
    }
  }, [services, date]);

  // Recarrega ao trocar de dia e sempre que a aba ganha foco
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const toggleComplete = useCallback(
    async (id: Id) => {
      try {
        const updated = await services.activities.toggleComplete(id);
        setActivities((prev) => prev.map((a) => (a.id === id ? updated : a)));
        setError(null);
      } catch (e) {
        setError(messageFrom(e));
      }
    },
    [services],
  );

  return { activities, categories, loading, error, toggleComplete, reload: load };
}
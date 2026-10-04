import { Ionicons } from '@expo/vector-icons';
import { addDays, isSameDay } from 'date-fns';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityItem } from '@/components/ActivityItem';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { useRoutine } from '@/hooks/useRoutine';
import type { Id } from '@/types/common';
import { formatDuration, formatLongDate, toISODate } from '@/utils/uiFormat';

export default function RoutineScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [date, setDate] = useState(() => new Date());
  const [categoryId, setCategoryId] = useState<Id | null>(null);

  const isoDate = toISODate(date);
  const { activities, categories, loading, error, toggleComplete, reload } = useRoutine(isoDate);

  const categoriesById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );

  const visible = categoryId ? activities.filter((a) => a.categoryId === categoryId) : activities;
  const isToday = isSameDay(date, new Date());

  const openNew = () => router.push({ pathname: '/activity-form', params: { date: isoDate } });
  const openEdit = (id: Id) => router.push({ pathname: '/activity-form', params: { id } });

  return (
    <Screen>
      <ThemedText variant="title">Rotina</ThemedText>

      <View style={styles.dayRow}>
        <Pressable onPress={() => setDate((d) => addDays(d, -1))} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.dayLabel}>
          <ThemedText variant="subheading">{formatLongDate(date)}</ThemedText>
          {!isToday && (
            <Pressable onPress={() => setDate(new Date())} hitSlop={8}>
              <ThemedText variant="caption" style={{ color: colors.primary }}>
                Voltar para hoje
              </ThemedText>
            </Pressable>
          )}
        </View>
        <Pressable onPress={() => setDate((d) => addDays(d, 1))} hitSlop={12}>
          <Ionicons name="chevron-forward" size={24} color={colors.text} />
        </Pressable>
      </View>

      <Button label="+ Adicionar atividade" onPress={openNew} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsBleed}
        contentContainerStyle={styles.chips}
      >
        <Chip label="Todas" selected={categoryId === null} onPress={() => setCategoryId(null)} />
        {categories.map((c) => (
          <Chip
            key={c.id}
            label={`${c.emoji} ${c.name}`}
            selected={categoryId === c.id}
            onPress={() => setCategoryId(c.id)}
          />
        ))}
      </ScrollView>

      {error && (
        <Card style={styles.gap}>
          <ThemedText variant="subheading">Algo deu errado</ThemedText>
          <ThemedText secondary>{error}</ThemedText>
          <Button label="Tentar novamente" onPress={reload} />
        </Card>
      )}

      {loading && <ActivityIndicator style={styles.loader} />}

      {!loading && visible.length === 0 && !error && (
        <EmptyState
          icon="🗓️"
          title="Nenhuma atividade"
          message={
            categoryId
              ? 'Não há atividades dessa categoria neste dia.'
              : 'Não há atividades registradas neste dia.'
          }
          actionLabel="Adicionar atividade"
          onAction={openNew}
        />
      )}

      <View style={styles.list}>
        {visible.map((activity) => {
          const category = categoriesById.get(activity.categoryId);
          return (
            <ActivityItem
              key={activity.id}
              title={activity.title}
              startTime={activity.startTime}
              endTime={activity.endTime}
              durationText={formatDuration(activity.duration)}
              categoryIcon={category?.emoji ?? '📝'}
              categoryColor={category?.color ?? '#6B7280'}
              status={activity.status}
              onPress={() => openEdit(activity.id)}
              onToggleComplete={() => toggleComplete(activity.id)}
            />
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.sm },
  list: { gap: spacing.md },
  loader: { marginTop: spacing.xl },
  dayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayLabel: { alignItems: 'center', gap: 2 },
  chipsBleed: { marginHorizontal: -spacing.xl, flexGrow: 0 },
  chips: { paddingHorizontal: spacing.xl, gap: spacing.sm },
});
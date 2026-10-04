import { addMonths, isSameDay, startOfMonth } from 'date-fns';
import { useRouter, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { ActivityItem } from '@/components/ActivityItem';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { MonthCalendar } from '@/components/MonthCalendar';
import { ProgressBar } from '@/components/ProgressBar';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { StatCard } from '@/components/StatCard';
import { ThemedText } from '@/components/ThemedText';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { useCalendar, type DayDetail } from '@/hooks/useCalendar';
import type { Id } from '@/types/common';
import { formatDuration, formatLongDate, toISODate } from '@/utils/uiFormat';

function DaySummary({
  day,
  onEdit,
}: {
  day: DayDetail;
  onEdit: (id: Id) => void;
}) {
  const { report, activities, categories } = day;
  const categoriesById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const withNotes = activities.filter((a) => a.notes);

  return (
    <>
      <Card style={styles.gap}>
        <ThemedText variant="subheading">Progresso do dia</ThemedText>
        <ThemedText variant="metric">{Math.round(report.completionRate)}%</ThemedText>
        <ProgressBar percent={report.completionRate} />
        <ThemedText variant="caption" secondary>
          {report.completedActivities} de {report.totalActivities} atividades concluídas
        </ThemedText>
      </Card>

      <View style={styles.grid}>
        <StatCard icon="😴" label="Sono" value={formatDuration(report.sleepMinutes)} />
        <StatCard icon="💼" label="Trabalho" value={formatDuration(report.workMinutes)} />
        <StatCard icon="📚" label="Estudo" value={formatDuration(report.studyMinutes)} />
        <StatCard icon="🏋️" label="Exercício" value={formatDuration(report.exerciseMinutes)} />
      </View>

      <SectionHeader title="Atividades" />
      {activities.length === 0 ? (
        <EmptyState
          icon="🗓️"
          title="Nenhuma atividade"
          message="Não há registros neste dia."
        />
      ) : (
        <View style={styles.list}>
          {activities.map((activity) => {
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
                onPress={() => onEdit(activity.id)}
              />
            );
          })}
        </View>
      )}

      {withNotes.length > 0 && (
        <Card style={styles.gap}>
          <ThemedText variant="subheading">Observações</ThemedText>
          {withNotes.map((activity) => (
            <ThemedText key={activity.id} secondary>
              • {activity.title}: {activity.notes}
            </ThemedText>
          ))}
        </Card>
      )}
    </>
  );
}

export default function CalendarScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState(() => new Date());

  const { markedDates, day, loading, error, reload } = useCalendar(month, selected);

  const isToday = isSameDay(selected, new Date());

  const goToToday = () => {
    const now = new Date();
    setMonth(startOfMonth(now));
    setSelected(now);
  };

  const openNew = () =>
    router.push({ pathname: '/activity-form', params: { date: toISODate(selected) } } as Href);
  const openEdit = (id: Id) =>
    router.push({ pathname: '/activity-form', params: { id } } as Href);

  return (
    <Screen>
      <ThemedText variant="title">Calendário</ThemedText>

      <MonthCalendar
        month={month}
        selected={selected}
        markedDates={markedDates}
        onSelect={setSelected}
        onChangeMonth={(delta) => setMonth((m) => addMonths(m, delta))}
      />

      <View style={styles.dayHeader}>
        <ThemedText variant="heading">{formatLongDate(selected)}</ThemedText>
        {!isToday && (
          <Pressable onPress={goToToday} hitSlop={8}>
            <ThemedText variant="label" style={{ color: colors.primary }}>Ir para hoje</ThemedText>
          </Pressable>
        )}
      </View>

      <Button label="+ Adicionar neste dia" onPress={openNew} />

      {error && (
        <Card style={styles.gap}>
          <ThemedText variant="subheading">Algo deu errado</ThemedText>
          <ThemedText secondary>{error}</ThemedText>
          <Button label="Tentar novamente" onPress={reload} />
        </Card>
      )}

      {loading && !day && <ActivityIndicator style={styles.loader} />}
      {day && !error && <DaySummary day={day} onEdit={openEdit} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.sm },
  list: { gap: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  loader: { marginTop: spacing.xl },
  dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
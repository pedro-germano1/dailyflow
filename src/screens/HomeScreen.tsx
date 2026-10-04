import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ProgressBar } from '@/components/ProgressBar';
import { Screen } from '@/components/Screen';
import { StatCard } from '@/components/StatCard';
import { ThemedText } from '@/components/ThemedText';
import { spacing } from '@/constants/theme';
import { useDashboard, type DashboardData } from '@/hooks/useDashboard';
import { formatDuration, formatLongDate, greeting } from '@/utils/uiFormat';

function TimeBlock({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.timeBlock}>
      <ThemedText variant="caption" secondary>{label}</ThemedText>
      <ThemedText variant="heading">{value}</ThemedText>
    </View>
  );
}

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card style={styles.gap}>
      <ThemedText variant="subheading">Algo deu errado</ThemedText>
      <ThemedText secondary>{message}</ThemedText>
      <Button label="Tentar novamente" onPress={onRetry} />
    </Card>
  );
}

function Dashboard({ data }: { data: DashboardData }) {
  const { user, report, nextActivity } = data;
  const now = new Date();

  return (
    <>
      <View>
        <ThemedText variant="title">{greeting(now)}, {user.name} 👋</ThemedText>
        <ThemedText secondary>{formatLongDate(now)}</ThemedText>
      </View>

      <Card style={styles.gap}>
        <ThemedText variant="subheading">Progresso do dia</ThemedText>
        <ThemedText variant="metric">{Math.round(report.completionRate)}%</ThemedText>
        <ProgressBar percent={report.completionRate} />
        <ThemedText variant="caption" secondary>
          {report.completedActivities} de {report.totalActivities} atividades concluídas
        </ThemedText>
      </Card>

      <Card style={styles.row}>
        <TimeBlock label="Acordou" value={report.wakeTime ?? '--:--'} />
        <TimeBlock label="Dormiu" value={report.sleepTime ?? '--:--'} />
        <TimeBlock label="Sono" value={formatDuration(report.sleepMinutes)} />
      </Card>

      <View style={styles.grid}>
        <StatCard icon="💼" label="Trabalho" value={formatDuration(report.workMinutes)} />
        <StatCard icon="📚" label="Estudo" value={formatDuration(report.studyMinutes)} />
        <StatCard icon="🏋️" label="Exercício" value={formatDuration(report.exerciseMinutes)} />
        <StatCard
          icon="✅"
          label="Atividades"
          value={`${report.completedActivities}/${report.totalActivities}`}
        />
      </View>

      <Card style={styles.gap}>
        <ThemedText variant="subheading">Próxima atividade</ThemedText>
        {nextActivity ? (
          <>
            <ThemedText variant="heading">{nextActivity.title}</ThemedText>
            <ThemedText secondary>
              {nextActivity.startTime} – {nextActivity.endTime}
            </ThemedText>
          </>
        ) : (
          <ThemedText secondary>Nenhuma atividade pendente para o resto do dia.</ThemedText>
        )}
      </Card>

      <Card style={styles.gap}>
        <ThemedText variant="subheading">Resumo de hoje</ThemedText>
        {report.insights.length > 0 ? (
          report.insights.map((line) => (
            <ThemedText key={line} secondary>• {line}</ThemedText>
          ))
        ) : (
          <ThemedText secondary>Registre atividades para ver o resumo do seu dia.</ThemedText>
        )}
      </Card>
    </>
  );
}

export default function HomeScreen() {
  const { state, reload } = useDashboard();

  return (
    <Screen>
      {state.status === 'loading' && <ActivityIndicator style={styles.loader} />}
      {state.status === 'error' && <ErrorCard message={state.message} onRetry={reload} />}
      {state.status === 'ready' && <Dashboard data={state.data} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  timeBlock: { gap: spacing.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  loader: { marginTop: spacing.xxl },
});
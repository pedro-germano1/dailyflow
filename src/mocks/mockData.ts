/**
 * Dados de exemplo para a UI (Pessoa 1) desenvolver sem depender do banco real.
 * As datas são relativas a HOJE, então o Dashboard sempre tem dados "do dia".
 */
import { Activity, ActivityStatus } from '../types/activity';
import { Goal } from '../types/goal';
import { DailyReport, MonthlyReport, WeeklyReport } from '../types/report';
import { Settings, User } from '../types/settings';
import { SleepRecord } from '../types/sleep';
import { addDays, calcDuration, toISODate } from '../utils/time';

const today = () => toISODate();

function act(
  id: string,
  title: string,
  categoryId: string,
  dayOffset: number,
  startTime: string,
  endTime: string,
  status: ActivityStatus,
  notes?: string,
): Activity {
  const stamp = new Date().toISOString();
  return {
    id, title, categoryId, date: addDays(today(), dayOffset), startTime, endTime,
    duration: calcDuration(startTime, endTime), status, notes, createdAt: stamp, updatedAt: stamp,
  };
}

const recentActivities: Activity[] = [
  // Hoje
  act('a1', 'Café da manhã', 'cat-food', 0, '08:00', '08:30', 'completed'),
  act('a2', 'Trabalho', 'cat-work', 0, '09:00', '12:00', 'completed', 'Reunião de planejamento'),
  act('a3', 'Almoço', 'cat-food', 0, '12:30', '13:30', 'completed'),
  act('a4', 'Trabalho', 'cat-work', 0, '13:30', '18:00', 'completed'),
  act('a5', 'Academia', 'cat-exercise', 0, '18:30', '19:30', 'pending'),
  act('a6', 'Estudo', 'cat-study', 0, '20:00', '22:00', 'pending', 'React Native'),
  act('a7', 'Lazer', 'cat-leisure', 0, '22:00', '23:00', 'pending'),
  // Ontem
  act('a8', 'Trabalho', 'cat-work', -1, '09:00', '17:30', 'completed'),
  act('a9', 'Estudo', 'cat-study', -1, '19:00', '20:30', 'completed'),
  act('a10', 'Academia', 'cat-exercise', -1, '18:00', '19:00', 'skipped'),
  // Anteontem
  act('a11', 'Trabalho', 'cat-work', -2, '09:00', '18:00', 'completed'),
  act('a12', 'Estudo', 'cat-study', -2, '19:30', '21:30', 'completed'),
  act('a13', 'Academia', 'cat-exercise', -2, '18:30', '19:30', 'completed'),
];

// Histórico dos 11 dias anteriores (para gráficos semanais/mensais não ficarem vazios).
const olderActivities: Activity[] = [];
for (let n = 3; n <= 13; n++) {
  olderActivities.push(act(`h${n}w`, 'Trabalho', 'cat-work', -n, '09:00', '17:00', 'completed'));
  olderActivities.push(
    act(`h${n}s`, 'Estudo', 'cat-study', -n, '19:00', n % 2 === 0 ? '21:00' : '20:00', n % 5 === 0 ? 'skipped' : 'completed'),
  );
  if (n % 2 === 1) olderActivities.push(act(`h${n}e`, 'Academia', 'cat-exercise', -n, '18:00', '19:00', 'completed'));
}

export const mockActivities: Activity[] = [...recentActivities, ...olderActivities];

const sleep = (offset: number, sleepTime: string, wakeTime: string, duration: number): SleepRecord => ({
  id: `s${-offset}`, date: addDays(today(), offset), sleepTime, wakeTime, duration,
});

/** date = dia em que acordou. Durações em minutos. */
export const mockSleepData: SleepRecord[] = [
  sleep(0, '23:45', '07:20', 455),
  sleep(-1, '00:10', '07:40', 450),
  sleep(-2, '23:30', '06:50', 440),
  sleep(-3, '00:30', '08:00', 450),
  sleep(-4, '23:00', '07:00', 480),
  sleep(-5, '01:00', '08:30', 450),
  sleep(-6, '23:15', '06:45', 450),
];

export const mockGoals: Goal[] = [
  { id: 'g1', title: 'Estudar 2 horas por dia', categoryId: 'cat-study', metric: 'hours', target: 2, frequency: 'daily', startDate: addDays(today(), -30), active: true },
  { id: 'g2', title: 'Dormir pelo menos 7 horas', metric: 'sleepHours', target: 7, frequency: 'daily', startDate: addDays(today(), -30), active: true },
  { id: 'g3', title: 'Treinar 4 vezes por semana', categoryId: 'cat-exercise', metric: 'count', target: 4, frequency: 'weekly', startDate: addDays(today(), -30), active: true },
];

export const mockUser: User = { id: 'user-1', name: 'Pedro', avatar: '🙂' };

export const mockSettings: Settings = {
  theme: 'system',
  defaultSleepTime: '23:30',
  defaultWakeTime: '07:00',
  notifications: {
    enabled: true, studyReminder: true, logRoutineReminder: true,
    sleepReminder: true, dailyReminderTime: '21:00',
  },
};

export const mockDailyReport: DailyReport = {
  date: today(),
  wakeTime: '07:20', sleepTime: '23:45',
  sleepMinutes: 455, workMinutes: 465, studyMinutes: 120, exerciseMinutes: 60, leisureMinutes: 60,
  totalActivities: 7, completedActivities: 4, pendingActivities: 3, completionRate: 57,
  insights: [
    'Hoje você registrou 7h45 de trabalho e 2h de estudo.',
    'Você concluiu 4 de 7 atividades (57%).',
  ],
};

const weekSleep = [455, 450, 440, 450, 480, 450, 450];
const weekWork = [480, 470, 510, 465, 480, 0, 0];
const weekStudy = [90, 120, 60, 120, 90, 150, 0];
const weekExercise = [60, 0, 60, 60, 0, 60, 0];
const weekCompletion = [85, 70, 90, 80, 75, 60, 50];

export function buildMockWeeklyReport(weekStart: string = addDays(today(), -6)): WeeklyReport {
  const days: DailyReport[] = weekSleep.map((sleepMinutes, i) => ({
    date: addDays(weekStart, i),
    sleepMinutes, workMinutes: weekWork[i], studyMinutes: weekStudy[i],
    exerciseMinutes: weekExercise[i], leisureMinutes: 60,
    totalActivities: 8, completedActivities: Math.round((8 * weekCompletion[i]) / 100),
    pendingActivities: 8 - Math.round((8 * weekCompletion[i]) / 100),
    completionRate: weekCompletion[i],
    insights: [],
  }));
  return {
    weekStart, weekEnd: addDays(weekStart, 6), days,
    averageSleepMinutes: 454, averageActivitiesPerDay: 8, averageCompletionRate: 73,
    totalExerciseSessions: 4, bestDay: days[2].date,
    insights: ['Você dormiu em média 7h34 por noite nesta semana.', 'Você treinou 4 vezes.'],
  };
}

export function buildMockMonthlyReport(month: string = today().slice(0, 7)): MonthlyReport {
  return {
    month,
    totalSleepMinutes: 13500, averageSleepMinutes: 450, totalWorkMinutes: 9600,
    totalStudyMinutes: 3000, totalExerciseSessions: 14, totalActivities: 180,
    daysRecorded: 28, bestStreak: 12, averageCompletionRate: 78,
    comparisonWithPreviousMonth: {
      sleepMinutesDiff: 15, workMinutesDiff: -120, studyMinutesDiff: 300, completionRateDiff: 5,
    },
    insights: ['Seu tempo de estudo aumentou em relação ao mês anterior.'],
  };
}

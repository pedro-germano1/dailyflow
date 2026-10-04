import { AppError, ISODate, ISOMonth } from '../types/common';
import { IActivityService, IReportService, ISleepService } from '../types/services';
import { addDays, isValidDate, isValidMonth, monthRange, previousMonth, startOfWeek, toISODate } from '../utils/time';
import { computeMonthlyReport, computeMonthStats } from './monthlyCalculations';
import { computeDailyReport, computeWeeklyReport } from './reportCalculations';

/** Quantos dias anteriores entram na comparação do relatório diário. */
const HISTORY_DAYS = 7;

/**
 * Depende das INTERFACES de atividade e sono (não do storage): funciona igual
 * com os services reais ou com os mocks.
 * `today` é injetável para os testes serem determinísticos.
 */
export function createReportService(
  activities: IActivityService,
  sleep: ISleepService,
  today: () => ISODate = () => toISODate(),
): IReportService {
  const assertDate = (date: string) => {
    if (!isValidDate(date)) throw new AppError('VALIDATION_ERROR', 'Data inválida.', 'date');
  };

  return {
    async getDaily(date: ISODate) {
      assertDate(date);
      const [dayActivities, sleepRecord, previous] = await Promise.all([
        activities.list({ date }),
        sleep.getByDate(date),
        activities.list({ from: addDays(date, -HISTORY_DAYS), to: addDays(date, -1) }),
      ]);
      return computeDailyReport(date, dayActivities, sleepRecord, previous, today());
    },

    async getWeekly(anyDateOfWeek: ISODate) {
      assertDate(anyDateOfWeek);
      const weekStart = startOfWeek(anyDateOfWeek);
      const weekEnd = addDays(weekStart, 6);
      const [weekActivities, sleepRecords] = await Promise.all([
        activities.list({ from: weekStart, to: weekEnd }),
        sleep.list(weekStart, weekEnd),
      ]);
      return computeWeeklyReport(weekStart, weekActivities, sleepRecords, today());
    },

    async getMonthly(month: ISOMonth) {
      if (!isValidMonth(month)) {
        throw new AppError('VALIDATION_ERROR', 'Mês inválido. Use o formato AAAA-MM.', 'month');
      }
      const load = async (m: ISOMonth) => {
        const { from, to } = monthRange(m);
        const [monthActivities, sleepRecords] = await Promise.all([
          activities.list({ from, to }),
          sleep.list(from, to),
        ]);
        return computeMonthStats(monthActivities, sleepRecords);
      };
      const [current, previous] = await Promise.all([load(month), load(previousMonth(month))]);
      return computeMonthlyReport(month, current, previous);
    },
  };
}

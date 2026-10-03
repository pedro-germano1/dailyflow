/**
 * CONTRATO ENTRE PESSOA 1 (UI) E PESSOA 2 (DADOS).
 * A UI só pode importar estas interfaces. Nunca AsyncStorage/SQLite.
 * Alterações aqui exigem aviso e aprovação das duas pessoas (PR para develop).
 */
import { Activity, ActivityFilter, CreateActivityInput, UpdateActivityInput } from './activity';
import { Category, CreateCategoryInput } from './category';
import { Id, ISODate, ISOMonth } from './common';
import { CreateGoalInput, Goal, GoalProgress, UpdateGoalInput } from './goal';
import { DailyReport, MonthlyReport, WeeklyReport } from './report';
import { SaveSleepInput, SleepRecord, SleepStats } from './sleep';
import { Settings, User } from './settings';

export interface IActivityService {
  list(filter?: ActivityFilter): Promise<Activity[]>;
  getById(id: Id): Promise<Activity>;
  create(input: CreateActivityInput): Promise<Activity>;
  update(id: Id, input: UpdateActivityInput): Promise<Activity>;
  remove(id: Id): Promise<void>;
  toggleComplete(id: Id): Promise<Activity>;
  /** Datas que possuem registros (para os indicadores do calendário). */
  getDatesWithRecords(from: ISODate, to: ISODate): Promise<ISODate[]>;
}

export interface ISleepService {
  getByDate(date: ISODate): Promise<SleepRecord | null>;
  list(from: ISODate, to: ISODate): Promise<SleepRecord[]>;
  save(input: SaveSleepInput): Promise<SleepRecord>;
  remove(id: Id): Promise<void>;
  getStats(from: ISODate, to: ISODate): Promise<SleepStats>;
}

export interface IReportService {
  getDaily(date: ISODate): Promise<DailyReport>;
  getWeekly(weekStart: ISODate): Promise<WeeklyReport>;
  getMonthly(month: ISOMonth): Promise<MonthlyReport>;
}

export interface IGoalService {
  list(): Promise<Goal[]>;
  create(input: CreateGoalInput): Promise<Goal>;
  update(id: Id, input: UpdateGoalInput): Promise<Goal>;
  remove(id: Id): Promise<void>;
  getProgress(id: Id, referenceDate?: ISODate): Promise<GoalProgress>;
}

export interface ICategoryService {
  list(): Promise<Category[]>;
  create(input: CreateCategoryInput): Promise<Category>;
  remove(id: Id): Promise<void>;
}

export interface ISettingsService {
  getSettings(): Promise<Settings>;
  updateSettings(patch: Partial<Settings>): Promise<Settings>;
  getUser(): Promise<User>;
  updateUser(patch: Partial<Omit<User, 'id'>>): Promise<User>;
  exportData(): Promise<string>; // JSON
  clearAllData(): Promise<void>;
}

/** Ponto único de acesso para a UI (injetado via Context). */
export interface Services {
  activities: IActivityService;
  sleep: ISleepService;
  reports: IReportService;
  goals: IGoalService;
  categories: ICategoryService;
  settings: ISettingsService;
}

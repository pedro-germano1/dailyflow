import { Category } from '../types';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-sleep', name: 'Sono', emoji: '😴', color: '#6C63FF', isDefault: true },
  { id: 'cat-work', name: 'Trabalho', emoji: '💼', color: '#3B82F6', isDefault: true },
  { id: 'cat-study', name: 'Estudo', emoji: '📚', color: '#F59E0B', isDefault: true },
  { id: 'cat-food', name: 'Alimentação', emoji: '🍽️', color: '#10B981', isDefault: true },
  { id: 'cat-exercise', name: 'Exercício', emoji: '🏋️', color: '#EF4444', isDefault: true },
  { id: 'cat-leisure', name: 'Lazer', emoji: '🎮', color: '#EC4899', isDefault: true },
  { id: 'cat-home', name: 'Casa', emoji: '🧹', color: '#14B8A6', isDefault: true },
  { id: 'cat-social', name: 'Social', emoji: '👥', color: '#8B5CF6', isDefault: true },
  { id: 'cat-other', name: 'Outros', emoji: '📝', color: '#6B7280', isDefault: true },
];

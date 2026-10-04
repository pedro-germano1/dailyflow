import { ID } from './common';

export interface Category {
  id: ID;
  name: string;
  icon: string; // emoji, ex: '💼'
  color: string; // hex, ex: '#4F8EF7'
  isCustom: boolean;
}
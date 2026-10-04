import { createContext, useContext, useState } from 'react';
import { createMockServices } from '@/mocks/mockServices';
import type { Services } from '@/types/services';

const ServicesContext = createContext<Services | null>(null);

export function ServicesProvider({ children }: { children: React.ReactNode }) {
  // Semana 8: trocar createMockServices pela fábrica dos serviços reais.
  const [services] = useState<Services>(() => createMockServices());
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
}

export function useServices(): Services {
  const ctx = useContext(ServicesContext);
  if (!ctx) throw new Error('useServices deve ser usado dentro de ServicesProvider');
  return ctx;
}
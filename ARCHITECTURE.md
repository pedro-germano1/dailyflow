# DailyFlow — Arquitetura

## Camadas
UI (Pessoa 1) -> `Services` (interfaces em src/types/services.ts)
                      |
          Implementação real (Pessoa 2): src/services/*  -> StorageAdapter -> AsyncStorage
          Implementação mock  (ambos):   src/mocks/*     -> dados em memória

## Convenções de dados
- Datas "YYYY-MM-DD", horas "HH:mm", meses "YYYY-MM", durações em minutos.
- Duração, progresso e relatórios são DERIVADOS (calculados nos services).
- Erros: services lançam `AppError` (com `code`, `message` amigável e `field`); a UI mostra `error.message`.

## Decisões de contrato (revisão do PR #1)
1. **Notificações:** quem agenda é o service. `INotificationService` (`requestPermission`, `syncReminders`);
   `settings.updateSettings()` chama `syncReminders()` internamente. A UI nunca importa `expo-notifications`.
2. **Metas:** o histórico vem em `GoalProgress.history` (últimos 8 períodos, do mais antigo ao mais recente).
   Não existe `getHistory`.
3. **Meia-noite:** atividade NÃO atravessa a meia-noite (`endTime > startTime`, mesmo dia). Para 23:00–01:00,
   a UI cria duas atividades. Exceção: sono (`SleepRecord`), onde `wakeTime < sleepTime` soma 24h.
4. **Semana:** segunda a domingo. `getWeekly` aceita qualquer data da semana e normaliza para a segunda.
5. **Sono:** `date` = dia em que a pessoa ACORDOU.

## Armazenamento
AsyncStorage (compatível com Expo Go), 1 chave por coleção (JSON), versionada (`@dailyflow:v1:*`).
Acesso somente via `StorageAdapter`. Escritas serializadas em fila (`Repository`).

## Propriedade de pastas (evita conflito de merge)
- **Pessoa 1 (UI):** `src/app` (rotas do Expo Router), `src/components`, `src/hooks`, `src/contexts`
- **Pessoa 2 (dados):** `src/types` (contrato), `src/services`, `src/database`, `src/utils`,
  `src/constants/categories.ts`, `scripts/`
- **Mocks (`src/mocks`):** `mockServices.ts` é da Pessoa 2 (acompanha o contrato). A Pessoa 1 pode
  ajustar livremente os VALORES em `mockData.ts` para montar as telas (não os tipos).
- **Compartilhado:** `src/types/**`. Alterar só via PR com aprovação das duas pessoas.

## Persistência e CRUD (Semana 2)
- `Repository<T>`, `AsyncStorageAdapter` (app) e `MemoryStorageAdapter` (testes e mocks).
- `createActivityService(storage, categoryService)` e `createCategoryService(storage)`.
- Categorias padrão vêm do código; só as personalizadas são gravadas.
- Validações: título obrigatório (<=60), categoria existente, data real, horas HH:mm,
  fim > início, observação <= 300, duplicidade (mesma data + título + horário).
- Mocks para a UI: `createMockServices()` em `src/mocks/mockServices.ts`.
- Teste rápido da lógica: `npx tsx scripts/smoke-activity.ts`.

## Git
main <- develop <- feature/pessoa-1-ui | feature/pessoa-2-data
Commits pequenos; `git pull origin develop` antes de abrir PR.

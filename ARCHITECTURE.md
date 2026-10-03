# DailyFlow — Arquitetura (visão da Pessoa 2)

## Camadas
UI (Pessoa 1) -> `Services` (interfaces em src/types/services.ts)
                      |
          Implementação real (Pessoa 2): src/services/*  -> StorageAdapter -> AsyncStorage
          Implementação mock  (ambos):   src/mocks/*     -> dados em memória

## Convenções de dados
- Datas "YYYY-MM-DD", horas "HH:mm", meses "YYYY-MM", durações em minutos.
- Duração, progresso e relatórios são DERIVADOS (calculados nos services).
- Sono atravessando a meia-noite: wakeTime < sleepTime => soma 24h.
- Atividades: endTime <= startTime => AppError VALIDATION_ERROR.
- Erros: services lançam `AppError`; a UI mostra `error.message`.

## Armazenamento
AsyncStorage (compatível com Expo Go), 1 chave por coleção (JSON), versionada
(`@dailyflow:v1:*`). Acesso somente via `StorageAdapter`.

## Propriedade de pastas (evita conflito de merge)
Pessoa 2: src/types (contrato), src/services, src/database, src/utils (cálculos),
          src/constants/categories.ts, src/mocks
Pessoa 1: src/components, src/screens, src/navigation, src/hooks, src/contexts (tema/UI)
Arquivo compartilhado: src/types/** -> alterar só via PR com aprovação mútua.

## Git
main <- develop <- feature/pessoa-1-ui | feature/pessoa-2-data
Commits pequenos; `git pull origin develop` (rebase) antes de abrir PR.

## Semana 2 — Persistência e CRUD
- `Repository<T>` (src/database/repository.ts): coleção em 1 chave, escritas em fila (sem corrida).
- `AsyncStorageAdapter` (app real) e `MemoryStorageAdapter` (testes e mocks).
- `createActivityService(storage, categoryService)` e `createCategoryService(storage)`.
- Categorias padrão vêm do código; só as personalizadas são gravadas.
- Validações (todas lançam `AppError` com mensagem amigável e `field`):
  título obrigatório (<=60), categoria existente, data real, horas HH:mm,
  fim > início, observação <= 300, duplicidade (mesma data+título+horário).
- Mocks para a UI: `createMockServices()` em src/mocks/mockServices.ts.
- Teste rápido da lógica: `npx tsx scripts/smoke-activity.ts`.

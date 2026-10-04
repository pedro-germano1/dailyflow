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
2. **Metas:** o histórico vem em `GoalProgress.history` (até 8 períodos ENCERRADOS, sem o atual, do mais antigo ao mais recente).
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

## Sono e cálculos de duração (Semana 3)
- `calcSleepDuration(dormir, acordar)`: se acordar <= dormir, soma 24h (23:45 -> 07:20 = 455 min).
  Horários iguais = inválido; duração acima de 18h = inválida (`MAX_SLEEP_MINUTES`, ajustável).
- Um registro por data (dia em que acordou). Salvar de novo na mesma data SUBSTITUI o registro.
- `getStats(from, to)`: use o intervalo da semana ou do mês para as médias semanal e mensal.
  Melhor dia = maior duração; menor sono = menor duração (empate vale o dia mais antigo).
- Regularidade: desvio padrão do horário de dormir numa escala contínua (23:50 e 00:10 ficam
  a 20 min, não a ~23h). Score = 100 - (desvio / 120min * 100), limitado a 0-100.
  Com menos de 2 registros o score vem 0 e a UI mostra "—" (`recordsCount < 2`).
- `formatDuration(min)` -> "7h 35min", usado nos textos de análise dos relatórios.
- O mock de sono agora usa o `sleepService` REAL sobre dados em memória.
- Testes: `npx tsx scripts/smoke-sleep.ts`.

## Relatórios diário e semanal (Semana 4)
- `reportCalculations.ts` tem as funções PURAS (sem storage); `reportService.ts` só busca os dados e chama
  os cálculos. O service depende de `IActivityService` e `ISleepService`, não do storage.
- **Só atividades CONCLUÍDAS contam tempo** (trabalho, estudo, exercício, lazer). Pendente e pulada não contam.
- `pendingActivities` = não concluídas (pendentes + puladas). `completionRate` = concluídas / total.
- Categorias usadas nos totais: `cat-work`, `cat-study`, `cat-exercise`, `cat-leisure`.
  Categorias personalizadas entram nos totais de atividades, mas não nesses quatro tempos.
- Sono do dia = `SleepRecord` com `date` = o dia (noite que terminou nele).
- Análise automática: cada frase vem de um dado real. Sem dado, a frase não aparece
  (dia vazio: "Ainda não há registros neste dia.").
- Comparação com o histórico: média dos 7 dias anteriores QUE TIVERAM registro; só comenta se o dia
  atual tem o tempo > 0 e a variação é de pelo menos 10%.
- Semanal: segunda a domingo; médias consideram só dias com registro; `days[i].insights` vem vazio.
- Testes: `npx tsx scripts/smoke-reports.ts`.

## Relatório mensal e metas (Semana 5)
**Mensal** (`monthlyCalculations.ts`, `getMonthly('AAAA-MM')`)
- `daysRecorded` = dias com atividade OU sono. `bestStreak` = maior sequência de dias seguidos com registro
  DENTRO do mês (30/09 e 01/10 não se juntam).
- Totais de tempo contam só concluídas. Taxa média de conclusão = média das taxas diárias.
- Comparação com o mês anterior usa MÉDIAS (sono por noite; trabalho/estudo por dia com atividade),
  não totais: meses têm tamanhos e quantidades de registro diferentes. Fica 0 se faltar dado num dos lados;
  `comparisonWithPreviousMonth` é `null` se o mês anterior não tem nenhum registro.
- Análise só comenta variação de 10% ou mais.

**Metas** (`goalCalculations.ts` puro + `goalService.ts`)
- Período: diária = o dia; semanal = segunda a domingo; mensal = mês do calendário.
- Valor: `hours` = soma de horas concluídas da categoria; `count` = nº de atividades concluídas;
  `sleepHours` = MÉDIA de horas de sono por noite no período (meta é "pelo menos X por noite").
- Só conta a partir de `startDate` (o primeiro período pode ser parcial).
- `percent` pode passar de 100. `achieved` = current >= target.
- `daysRemaining` = dias depois da data de referência até o fim do período (quarta numa semana = 4).
- `history` = até 8 períodos encerrados desde `startDate`, do mais antigo ao mais recente (o atual não entra).
- Validações: título (<=60, sem duplicata), alvo > 0, `count` inteiro, horas <= 24/168/744 por período
  (diária/semanal/mensal), sono <= 24h, categoria existente (exceto sono), data de início real.
- Todo o mock agora usa os services REAIS em memória; `clearAllData` do mock limpa tudo.
- Testes: `npx tsx scripts/smoke-monthly.ts` e `npx tsx scripts/smoke-goals.ts`.

## Notificações, configurações e revisão de erros (Semana 6)
**Montagem dos services:** `createServices(storage, scheduler)` (`src/services/createServices.ts`) liga tudo e é usado
pelos mocks e pelos testes. No app (Semana 8): `createServices(new AsyncStorageAdapter(), createExpoNotificationScheduler())`.

**Notificações** (`notificationService.ts` + `notificationScheduler.ts`)
- O service só conhece a interface `NotificationScheduler`. Real: `expoNotificationScheduler.ts` (expo-notifications, SDK 57,
  gatilho diário). Falso: `src/mocks/fakeNotificationScheduler.ts` (testes e mocks). No navegador (web) tudo vira no-op.
- `buildReminderPlan(settings)` é PURA e decide os lembretes: `enabled = false` desliga tudo;
  **estudar** = horário fixo 19:00 (o contrato não tem horário de estudo); **registrar rotina** = `dailyReminderTime`;
  **dormir** = 30 min ANTES de `defaultSleepTime` (00:10 -> 23:40).
- `syncReminders()`: cancela os 3 lembretes do app (ids fixos, outras notificações não são tocadas) e reagenda os ligados.
  NUNCA lança erro (falha vai para `onError`/console.warn). Sem permissão: não agenda e NÃO pede permissão sozinho.
  Chamadas simultâneas rodam em fila.
- Fluxo da UI: ao ligar os lembretes, chamar `notifications.requestPermission()`; se `true`, `settings.updateSettings(...)`
  (que já chama `syncReminders()`). Se `false`, avisar para ativar nas configurações do celular.
  Chamar `syncReminders()` também ao abrir o app.
- Expo Go: notificações LOCAIS funcionam (push remoto não é usado).

**Configurações e perfil** (`settingsService.ts`)
- Padrão: tema `system`, dormir 23:30, acordar 07:00, lembretes DESLIGADOS, lembrete diário 21:00. Usuário padrão: `local-user` / "Usuário".
- `updateSettings(patch)`: faz merge (inclusive parcial em `notifications`), valida o RESULTADO e ignora campos desconhecidos.
  Erros usam `field` com ponto para notificações (`notifications.dailyReminderTime`). Horários padrão seguem as regras do sono
  (não podem ser iguais, duração <= 18h). Escritas em fila.
- `updateUser(patch)`: nome obrigatório (<= 40), avatar opcional (<= 500; `''` remove). O `id` nunca muda.
- `exportData()`: JSON `{ app, version, exportedAt, user, settings, customCategories, activities, sleep, goals }`
  (lido direto do armazenamento, sem filtro de data).
- `clearAllData()`: apaga tudo (as configurações voltam ao padrão) e cancela os lembretes.
- Dado salvo antigo ou corrompido é completado/corrigido com os padrões (`normalizeSettings`).

**Revisão de validações e erros (todos os services)**
- Regra: um service só lança `AppError`, qualquer que seja a entrada ou o estado do disco (`npx tsx scripts/smoke-errors.ts`).
- Entrada que não é objeto ou campo com tipo errado (`title: 123`) vira `VALIDATION_ERROR` com `field`.
- Datas passam a ser validadas também em `activities.list` (filtro), `getDatesWithRecords`, `sleep.getByDate/list/getStats`
  (antes devolviam lista vazia para data inválida). `isValidDate/Time/Month` aceitam qualquer tipo (`unknown`).
- `Repository` aceita uma guarda `isValid`: dado que não é lista vira `[]` e itens corrompidos são descartados na leitura
  (a próxima gravação limpa o disco). Falha de leitura/gravação continua sendo `STORAGE_ERROR`.
- Testes: `npx tsx scripts/smoke-notifications.ts`, `smoke-settings.ts` e `smoke-errors.ts`.

## Git
main <- develop <- feature/pessoa-1-ui | feature/pessoa-2-data
Commits pequenos; `git pull origin develop` antes de abrir PR.

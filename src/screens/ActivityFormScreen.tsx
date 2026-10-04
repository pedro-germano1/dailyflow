import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { DateTimeField } from '@/components/DateTimeField';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { ThemedText } from '@/components/ThemedText';
import { spacing } from '@/constants/theme';
import { useServices } from '@/contexts/ServicesContext';
import { useTheme } from '@/contexts/ThemeContext';
import type { ActivityStatus } from '@/types/activity';
import type { Category } from '@/types/category';
import type { Id } from '@/types/common';
import { isoToDate, timeToDate, toISODate, toTimeString } from '@/utils/uiFormat';

interface FormErrors {
  title?: string;
  time?: string;
  form?: string;
}

const STATUS_OPTIONS: { value: ActivityStatus; label: string }[] = [
  { value: 'pending', label: 'Pendente' },
  { value: 'completed', label: 'Concluída' },
  { value: 'skipped', label: 'Pulada' },
];

/** Traduz um erro dos serviços (AppError) para o campo certo do formulário. */
function errorsFrom(error: unknown): FormErrors {
  const message = error instanceof Error ? error.message : 'Algo deu errado. Tente novamente.';
  const field = (error as { field?: string } | null)?.field;
  if (field === 'title') return { title: message };
  if (field === 'startTime' || field === 'endTime') return { time: message };
  return { form: message };
}

export default function ActivityFormScreen() {
  const router = useRouter();
  const services = useServices();
  const { colors } = useTheme();
  const { id, date: dateParam } = useLocalSearchParams<{ id?: string; date?: string }>();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState<Id | null>(null);
  const [date, setDate] = useState(() => (dateParam ? isoToDate(dateParam) : new Date()));
  const [start, setStart] = useState(() => timeToDate('09:00'));
  const [end, setEnd] = useState(() => timeToDate('10:00'));
  const [status, setStatus] = useState<ActivityStatus>('pending');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const list = await services.categories.list();
        if (!active) return;
        setCategories(list);

        if (id) {
          const activity = await services.activities.getById(id);
          if (!active) return;
          setTitle(activity.title);
          setCategoryId(activity.categoryId);
          setDate(isoToDate(activity.date));
          setStart(timeToDate(activity.startTime));
          setEnd(timeToDate(activity.endTime));
          setStatus(activity.status);
          setNotes(activity.notes ?? '');
        } else {
          setCategoryId(list[0]?.id ?? null);
        }
      } catch (e) {
        if (active) setErrors(errorsFrom(e));
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [services, id]);

  async function handleSave() {
    const startTime = toTimeString(start);
    const endTime = toTimeString(end);

    const next: FormErrors = {};
    if (!title.trim()) next.title = 'Dê um nome para a atividade.';
    if (endTime <= startTime) {
      next.time =
        'O horário final precisa ser depois do inicial. Para passar da meia-noite, crie duas atividades.';
    }
    if (!categoryId) next.form = 'Escolha uma categoria.';
    if (Object.keys(next).length > 0 || !categoryId) {
      setErrors(next);
      return;
    }

    setSaving(true);
    setErrors({});

    const input = {
      title: title.trim(),
      categoryId,
      date: toISODate(date),
      startTime,
      endTime,
      status,
      notes: notes.trim() || undefined,
    };

    try {
      if (id) {
        await services.activities.update(id, input);
      } else {
        await services.activities.create(input);
      }
      router.back();
    } catch (e) {
      setErrors(errorsFrom(e));
      setSaving(false);
    }
  }

  function handleDelete() {
    if (!id) return;
    Alert.alert('Excluir atividade', 'Essa ação não pode ser desfeita.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await services.activities.remove(id);
            router.back();
          } catch (e) {
            setErrors(errorsFrom(e));
          }
        },
      },
    ]);
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ThemedText variant="label" style={{ color: colors.primary }}>Cancelar</ThemedText>
        </Pressable>
        <ThemedText variant="subheading">{isEditing ? 'Editar atividade' : 'Nova atividade'}</ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} />
      ) : (
        <>
          <TextField
            label="Nome"
            value={title}
            onChangeText={setTitle}
            placeholder="Ex.: Estudar inglês"
            maxLength={60}
            error={errors.title}
          />

          <View style={styles.group}>
            <ThemedText variant="label" secondary>Categoria</ThemedText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.bleed}
              contentContainerStyle={styles.chips}
            >
              {categories.map((c) => (
                <Chip
                  key={c.id}
                  label={`${c.emoji} ${c.name}`}
                  selected={categoryId === c.id}
                  onPress={() => setCategoryId(c.id)}
                />
              ))}
            </ScrollView>
          </View>

          <View style={styles.group}>
            <DateTimeField label="Data" mode="date" value={date} onChange={setDate} />
            <DateTimeField label="Início" mode="time" value={start} onChange={setStart} />
            <DateTimeField label="Fim" mode="time" value={end} onChange={setEnd} />
            {errors.time ? (
              <ThemedText variant="caption" style={{ color: colors.danger }}>{errors.time}</ThemedText>
            ) : null}
          </View>

          {isEditing && (
            <View style={styles.group}>
              <ThemedText variant="label" secondary>Status</ThemedText>
              <View style={styles.chips}>
                {STATUS_OPTIONS.map((option) => (
                  <Chip
                    key={option.value}
                    label={option.label}
                    selected={status === option.value}
                    onPress={() => setStatus(option.value)}
                  />
                ))}
              </View>
            </View>
          )}

          <TextField
            label="Observação (opcional)"
            value={notes}
            onChangeText={setNotes}
            placeholder="Algum detalhe importante?"
            multiline
            maxLength={300}
            style={styles.notes}
          />

          {errors.form ? (
            <ThemedText style={{ color: colors.danger }}>{errors.form}</ThemedText>
          ) : null}

          <Button label={saving ? 'Salvando...' : 'Salvar'} onPress={handleSave} />

          {isEditing && (
            <Pressable onPress={handleDelete} hitSlop={8}>
              <ThemedText variant="label" style={{ color: colors.danger }}>Excluir atividade</ThemedText>
            </Pressable>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerSpacer: { width: 60 },
  loader: { marginTop: spacing.xxl },
  group: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  bleed: { marginHorizontal: -spacing.xl, flexGrow: 0 },
  notes: { minHeight: 90, textAlignVertical: 'top' },
});
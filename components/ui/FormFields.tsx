import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import {
  addMonthsToKey,
  agencyDateKey,
  formatDateKey,
  formatMonthYear,
  monthGrid,
  WEEKDAY_SHORT_MON_FIRST,
} from '@/lib/time';
import { Avatar } from './Avatar';
import { Icon, type IconName } from './Icon';
import { IconButton } from './IconButton';
import { SearchField } from './SearchField';
import { Sheet } from './Sheet';
import { Text } from './Text';

/** Label + tappable box + error line, shared by the picker fields. */
function FieldShell({ label, error, value, placeholder, icon, onPress, required }: {
  label: string;
  error?: string | null;
  value: string | null;
  placeholder: string;
  icon: IconName;
  onPress: () => void;
  required?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrapper}>
      <Text variant="captionMedium" tone="secondary">
        {label}
        {required ? <Text variant="captionMedium" tone="danger"> *</Text> : null}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value ?? placeholder}`}
        onPress={onPress}
        style={({ pressed }) => [
          styles.box,
          { backgroundColor: colors.surface, borderColor: error ? colors.danger : colors.border, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Icon name={icon} size={17} color={colors.textTertiary} />
        <Text variant="body" numberOfLines={1} style={[styles.boxText, { color: value ? colors.text : colors.textTertiary }]}>
          {value ?? placeholder}
        </Text>
        <Icon name="chevron-down" size={16} color={colors.textTertiary} />
      </Pressable>
      {error ? (
        <Text variant="caption" tone="danger">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export type SelectOption<T extends string = string> = {
  value: T;
  label: string;
  description?: string | null;
  avatar?: { name: string | null; url?: string | null };
  icon?: IconName;
};

type SelectBase<T extends string> = {
  label: string;
  options: SelectOption<T>[];
  placeholder?: string;
  error?: string | null;
  icon?: IconName;
  required?: boolean;
  searchable?: boolean;
};

export function SelectField<T extends string>(
  props: SelectBase<T> & ({ multiple?: false; value: T | null; onChange: (value: T | null) => void; allowClear?: boolean } | { multiple: true; value: T[]; onChange: (value: T[]) => void }),
) {
  const { label, options, placeholder = 'Tanlang', error, icon = 'list', required, searchable } = props;
  const [open, setOpen] = useState(false);
  const selected = props.multiple ? props.value : props.value ? [props.value] : [];
  const display = selected.length
    ? options.filter((o) => selected.includes(o.value)).map((o) => o.label).join(', ')
    : null;

  return (
    <>
      <FieldShell label={label} error={error} value={display} placeholder={placeholder} icon={icon} onPress={() => setOpen(true)} required={required} />
      <OptionSheet
        visible={open}
        title={label}
        options={options}
        selected={selected}
        multiple={!!props.multiple}
        searchable={searchable ?? options.length > 8}
        onClose={() => setOpen(false)}
        onToggle={(value) => {
          if (props.multiple) {
            props.onChange(props.value.includes(value) ? props.value.filter((v) => v !== value) : [...props.value, value]);
          } else {
            props.onChange(props.value === value && props.allowClear ? null : value);
            setOpen(false);
          }
        }}
      />
    </>
  );
}

export function OptionSheet<T extends string>({ visible, title, options, selected, multiple, searchable, onClose, onToggle }: {
  visible: boolean;
  title: string;
  options: SelectOption<T>[];
  selected: T[];
  multiple: boolean;
  searchable: boolean;
  onClose: () => void;
  onToggle: (value: T) => void;
}) {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => `${o.label} ${o.description ?? ''}`.toLowerCase().includes(q)) : options;
  }, [options, query]);

  return (
    <Sheet visible={visible} onClose={onClose} title={title} actionLabel={multiple ? 'Tayyor' : undefined} onAction={multiple ? onClose : undefined}>
      {searchable ? <SearchField value={query} onChangeText={setQuery} /> : null}
      <View style={[styles.options, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {filtered.length === 0 ? (
          <Text variant="caption" tone="tertiary" style={styles.none}>
            Hech narsa topilmadi
          </Text>
        ) : null}
        {filtered.map((option, i) => {
          const isOn = selected.includes(option.value);
          return (
            <Pressable
              key={option.value}
              accessibilityRole={multiple ? 'checkbox' : 'radio'}
              accessibilityState={{ checked: isOn }}
              onPress={() => onToggle(option.value)}
              style={({ pressed }) => [
                styles.option,
                i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
                pressed && { backgroundColor: colors.surfaceSunken },
              ]}
            >
              {option.avatar ? <Avatar name={option.avatar.name} url={option.avatar.url} size={30} /> : null}
              {option.icon ? <Icon name={option.icon} size={17} color={colors.textSecondary} /> : null}
              <View style={styles.optionText}>
                <Text variant="bodyMedium">{option.label}</Text>
                {option.description ? (
                  <Text variant="caption" tone="secondary">
                    {option.description}
                  </Text>
                ) : null}
              </View>
              <View
                style={[
                  multiple ? styles.checkbox : styles.radio,
                  { borderColor: isOn ? colors.accent : colors.borderStrong, backgroundColor: isOn ? colors.accent : 'transparent' },
                ]}
              >
                {isOn ? <Icon name="check" size={13} color={colors.accentText} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
}

/** Month calendar picker; value is an agency date key "YYYY-MM-DD". */
export function DateField({ label, value, onChange, error, required, placeholder = 'Sanani tanlang', allowClear }: {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  error?: string | null;
  required?: boolean;
  placeholder?: string;
  allowClear?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <FieldShell
        label={label}
        error={error}
        value={value ? formatDateKey(value, true) : null}
        placeholder={placeholder}
        icon="calendar"
        onPress={() => setOpen(true)}
        required={required}
      />
      <Sheet visible={open} onClose={() => setOpen(false)} title={label} actionLabel={allowClear && value ? 'Tozalash' : undefined} onAction={() => { onChange(null); setOpen(false); }}>
        <MonthPicker
          value={value}
          onSelect={(key) => {
            onChange(key);
            setOpen(false);
          }}
        />
      </Sheet>
    </>
  );
}

export function MonthPicker({ value, onSelect, marked }: { value: string | null; onSelect: (key: string) => void; marked?: Set<string> }) {
  const { colors } = useTheme();
  const today = agencyDateKey();
  const [month, setMonth] = useState((value ?? today).slice(0, 7) + '-01');
  const days = monthGrid(month);
  return (
    <View style={styles.calendar}>
      <View style={styles.calHeader}>
        <IconButton icon="chevron-left" label="Oldingi oy" onPress={() => setMonth(addMonthsToKey(month, -1))} size={36} />
        <Text variant="heading">{formatMonthYear(month)}</Text>
        <IconButton icon="chevron-right" label="Keyingi oy" onPress={() => setMonth(addMonthsToKey(month, 1))} size={36} />
      </View>
      <View style={styles.weekRow}>
        {WEEKDAY_SHORT_MON_FIRST.map((d) => (
          <Text key={d} variant="micro" tone="tertiary" style={styles.weekCell}>
            {d}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {days.map((key) => {
          const inMonth = key.slice(0, 7) === month.slice(0, 7);
          const isSelected = key === value;
          const isToday = key === today;
          return (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityLabel={formatDateKey(key, true)}
              accessibilityState={{ selected: isSelected }}
              onPress={() => onSelect(key)}
              style={styles.dayCell}
            >
              <View
                style={[
                  styles.day,
                  isSelected && { backgroundColor: colors.accent },
                  !isSelected && isToday && { borderWidth: 1.5, borderColor: colors.brand },
                ]}
              >
                <Text
                  variant="bodyMedium"
                  style={{ color: isSelected ? colors.accentText : inMonth ? colors.text : colors.textTertiary, opacity: inMonth ? 1 : 0.5 }}
                >
                  {Number(key.slice(8))}
                </Text>
              </View>
              {marked?.has(key) ? <View style={[styles.mark, { backgroundColor: colors.brand }]} /> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const HOURS = Array.from({ length: 16 }, (_, i) => String(i + 7).padStart(2, '0'));
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

/** Time picker ("HH:MM", agency time) with hour and 5-minute steps. */
export function TimeField({ label, value, onChange, error, required, placeholder = 'Vaqtni tanlang' }: {
  label: string;
  value: string | null;
  onChange: (value: string) => void;
  error?: string | null;
  required?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [hour, minute] = (value ?? '10:00').split(':');
  return (
    <>
      <FieldShell label={label} error={error} value={value} placeholder={placeholder} icon="clock" onPress={() => setOpen(true)} required={required} />
      <Sheet visible={open} onClose={() => setOpen(false)} title={label} actionLabel="Tayyor" onAction={() => { onChange(`${hour}:${minute}`); setOpen(false); }}>
        <Text variant="label" tone="tertiary">Soat</Text>
        <ChoiceGrid values={HOURS} selected={hour} onSelect={(h) => onChange(`${h}:${minute}`)} />
        <Text variant="label" tone="tertiary">Daqiqa</Text>
        <ChoiceGrid values={MINUTES} selected={minute} onSelect={(m) => onChange(`${hour}:${m}`)} />
        <Text variant="metric" align="center">
          {hour}:{minute}
        </Text>
      </Sheet>
    </>
  );
}

function ChoiceGrid({ values, selected, onSelect }: { values: string[]; selected: string; onSelect: (value: string) => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.choiceGrid}>
      {values.map((v) => {
        const on = v === selected;
        return (
          <Pressable
            key={v}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onSelect(v)}
            style={[styles.choice, { backgroundColor: on ? colors.accent : colors.surface, borderColor: on ? colors.accent : colors.border }]}
          >
            <Text variant="bodyMedium" style={{ color: on ? colors.accentText : colors.text, fontVariant: ['tabular-nums'] }}>
              {v}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ToggleRow({ label, description, value, onChange, disabled }: { label: string; description?: string; value: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.toggle, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.optionText}>
        <Text variant="bodyMedium">{label}</Text>
        {description ? (
          <Text variant="caption" tone="secondary">
            {description}
          </Text>
        ) : null}
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ true: colors.brand, false: colors.borderStrong }}
        thumbColor="#FFFFFF"
        ios_backgroundColor={colors.borderStrong}
      />
    </View>
  );
}

export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.formSection}>
      <Text variant="label" tone="tertiary">
        {title}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs + 2 },
  box: {
    height: 52,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  boxText: { flex: 1 },
  options: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  option: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, minHeight: 54 },
  optionText: { flex: 1, gap: 2 },
  none: { padding: spacing.lg, textAlign: 'center' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  calendar: { gap: spacing.md },
  calHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  weekRow: { flexDirection: 'row' },
  weekCell: { flex: 1, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  day: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  mark: { position: 'absolute', bottom: 3, width: 5, height: 5, borderRadius: 3 },
  choiceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  choice: { width: 64, height: 44, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth },
  formSection: { gap: spacing.md },
});

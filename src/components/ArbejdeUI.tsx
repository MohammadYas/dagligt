import { ReactNode } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Switch, Text, TextInput, TextInputProps, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { dark as t } from '../theme';
import { Type } from '../type';
// RN Web activates non-button roles on Enter, but not Space.
export function spaceActivation(activate: () => void, disabled = false) {
  return Platform.OS === 'web' ? { onKeyDown: (e: { key: string; repeat: boolean; preventDefault(): void }) => {
    if (e.key === ' ') { e.preventDefault(); if (!disabled && !e.repeat) activate(); }
  } } : {};
}
export const layout = StyleSheet.create({
  page: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 24, paddingBottom: 28, gap: 24 },
  title: { ...Type.largeTitle, color: t.text }, body: { ...Type.body, color: t.text },
  secondary: { ...Type.subhead, color: t.dim }, caption: { ...Type.footnote, color: t.faint },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, minHeight: 60 },
  flex: { flex: 1, minWidth: 0 }, separator: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.line },
});
export function Title({ title, subtitle, back, backLabel = 'Tilbage' }: { title: string; subtitle?: string; back?: () => void; backLabel?: string }) {
  return <View style={{ gap: 8 }}>
    {back && <Pressable onPress={back} accessibilityRole="button" accessibilityLabel={backLabel} style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', minHeight: 44, gap: 4 }}>
      <Ionicons name="chevron-back" size={24} color={t.accent} /><Text style={[Type.body, { color: t.accent }]}>{backLabel}</Text>
    </Pressable>}
    <Text accessibilityRole="header" aria-level={1} style={layout.title}>{title}</Text>
    {subtitle && <Text style={layout.secondary}>{subtitle}</Text>}
  </View>;
}
export function Group({ title, help, children }: { title?: string; help?: string; children: ReactNode }) {
  return <View style={{ gap: 10 }}>
    {title && <Text accessibilityRole="header" aria-level={2} style={[Type.headline, { color: t.text, paddingHorizontal: 4, flexShrink: 1, minWidth: 0 }]}>{title}</Text>}
    <View style={{ backgroundColor: t.card, borderRadius: 18, overflow: 'hidden' }}>{children}</View>
    {help && <Text style={[layout.caption, { paddingHorizontal: 4, flexShrink: 1, minWidth: 0 }]}>{help}</Text>}
  </View>;
}
export function Action({ label, onPress, primary, danger, disabled, busy, icon }: { label: string; onPress: () => void; primary?: boolean; danger?: boolean; disabled?: boolean; busy?: boolean; icon?: keyof typeof Ionicons.glyphMap }) {
  const color = disabled ? t.faint : primary ? t.bg : danger ? t.fejl : t.accent;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled, busy: !!busy }} disabled={disabled || busy} onPress={onPress}
    style={({ pressed }) => ({ minHeight: 48, minWidth: 44, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, backgroundColor: primary ? disabled ? t.cardAlt : t.accent : 'transparent', opacity: pressed ? .65 : 1 })}>
    {busy ? <ActivityIndicator color={color} /> : icon ? <Ionicons name={icon} size={20} color={color} /> : null}
    <Text style={[Type.headline, { color, flexShrink: 1, textAlign: 'center' }]}>{label}</Text>
  </Pressable>;
}
export function IconButton({ name, label, onPress, disabled, danger }: { name: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; disabled?: boolean; danger?: boolean }) {
  return <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled }} style={({ pressed }) => ({ width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', opacity: disabled ? .35 : pressed ? .6 : 1 })}>
    <Ionicons name={name} size={22} color={danger ? t.fejl : t.accent} />
  </Pressable>;
}
export function Toggle({ label, help, value, onChange, disabled }: { label: string; help?: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return <Pressable {...spaceActivation(() => onChange(!value), disabled)} style={layout.row} accessibilityRole="switch" accessibilityLabel={label} accessibilityHint={help} aria-checked={value} accessibilityState={{ checked: value, disabled }} disabled={disabled} onPress={() => onChange(!value)}>
    <View style={layout.flex}><Text style={layout.body}>{label}</Text>{help && <Text style={[layout.caption, { marginTop: 4 }]}>{help}</Text>}</View>
    <View pointerEvents="none" aria-hidden importantForAccessibility="no-hide-descendants" style={{ minWidth: 52, minHeight: 44, justifyContent: 'center', alignItems: 'center' }}>
      {Platform.OS === 'web' ? <View style={{ width: 51, height: 31, borderRadius: 16, padding: 2, backgroundColor: value ? t.done : t.line, alignItems: value ? 'flex-end' : 'flex-start', opacity: disabled ? .5 : 1 }}><View style={{ width: 27, height: 27, borderRadius: 14, backgroundColor: t.text }} /></View> : <Switch accessible={false} value={value} disabled={disabled} trackColor={{ false: t.line, true: t.done }} thumbColor={t.text} />}
    </View>
  </Pressable>;
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return <View style={{ gap: 8, flexGrow: 1, minWidth: 0 }}><Text style={layout.secondary}>{label}</Text>
    <TextInput {...props} accessibilityLabel={label} placeholderTextColor={t.faint} selectionColor={t.accent} style={[Type.body, { minHeight: 50, padding: 12, borderRadius: 10, backgroundColor: t.cardAlt, color: t.text, borderWidth: 1, borderColor: t.line }, props.style]} />
  </View>;
}
export function Notice({ text, error = false }: { text: string; error?: boolean }) {
  return <Text accessibilityRole={error ? 'alert' : undefined} accessibilityLiveRegion="polite" style={[layout.secondary, { color: error ? t.fejl : t.dim, flexShrink: 1, minWidth: 0, maxWidth: '100%' }]}>{text}</Text>;
}
export function LinkRow({ title, detail, icon, onPress, first }: { title: string; detail: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void; first?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityHint={detail} onPress={onPress} style={({ pressed }) => [layout.row, !first && layout.separator, { backgroundColor: pressed ? t.cardAlt : t.card }]}>
    <Ionicons name={icon} size={23} color={t.accent} />
    <View style={layout.flex}><Text style={layout.body}>{title}</Text><Text style={[layout.caption, { marginTop: 3 }]}>{detail}</Text></View>
    <Ionicons name="chevron-forward" size={18} color={t.faint} />
  </Pressable>;
}

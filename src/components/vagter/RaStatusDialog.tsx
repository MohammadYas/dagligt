import { Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { dark as t } from '../../theme';
import { Type } from '../../type';

export default function RaStatusDialog({ name, text, onClose }: { name: string; text: string; onClose: () => void }) {
  const body = <View style={{ flex: 1, backgroundColor: t.bg, padding: 16, gap: 12 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <Text accessibilityRole="header" aria-level={2} style={[Type.title2, { color: t.text, flexShrink: 1 }]}>Rå statusfil · {name}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Luk råfil" onPress={onClose} style={{ minHeight: 44, minWidth: 64, justifyContent: 'center', alignItems: 'flex-end' }}>
        <Text style={[Type.headline, { color: t.accent }]}>Luk</Text>
      </Pressable>
    </View>
    <TextInput
      accessibilityLabel={`Hele råstatusfilen for ${name}`}
      editable={false}
      multiline
      scrollEnabled
      value={text}
      textAlignVertical="top"
      style={{ flex: 1, width: '100%', minHeight: 220, backgroundColor: t.cardAlt, borderRadius: 14, padding: 14, color: t.text, fontSize: 12, lineHeight: 18, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}
    />
  </View>;

  return Platform.OS === 'web' ? body : <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>{body}</Modal>;
}

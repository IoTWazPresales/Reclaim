import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme, Button } from 'react-native-paper';
import { supabase } from '@/lib/supabase';

type OnboardingStackParamList = {
  Goals: undefined;
  Permissions: undefined;
};

type GoalsScreenNavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'Goals'>;

const OPTIONS = ['Sleep', 'Focus', 'Energy', 'Stress balance'] as const;
type Goal = typeof OPTIONS[number];

export default function GoalsScreen() {
  const theme = useTheme();
  const navigation = useNavigation<GoalsScreenNavigationProp>();
  const [selected, setSelected] = useState<Goal[]>([]);

  function toggle(g: Goal) {
    setSelected((cur) => cur.includes(g) ? cur.filter(x => x !== g) : [...cur, g]);
  }

  async function onNext() {
    // Optional: persist to Supabase "profiles" table (id uuid pk, goals text[])
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles')
          .upsert({ id: user.id, goals: selected }, { onConflict: 'id' });
      }
    } catch {}
    navigation.replace('Permissions');
  }

  return (
    <View style={{ flex: 1, padding: 24, justifyContent: 'center', backgroundColor: theme.colors.background }}>
      <Text style={{ fontSize: 24, fontWeight: '800', marginBottom: 12, color: theme.colors.onSurface }}>
        What do you want to reclaim?
      </Text>
      <Text style={{ opacity: 0.7, marginBottom: 16, color: theme.colors.onSurfaceVariant }}>
        Choose one or more.
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {OPTIONS.map((g) => {
          const active = selected.includes(g);
          return (
            <TouchableOpacity
              key={g}
              onPress={() => toggle(g)}
              style={{
                paddingVertical: 10, paddingHorizontal: 14, borderRadius: 9999,
                borderWidth: 1, borderColor: active ? theme.colors.primary : theme.colors.outlineVariant,
                backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                marginRight: 8, marginBottom: 8
              }}>
              <Text style={{ color: active ? theme.colors.onPrimary : theme.colors.onSurface, fontWeight: '700' }}>{g}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Button mode="contained" onPress={onNext} style={{ marginTop: 20 }}>
        Continue
      </Button>
    </View>
  );
}

import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MedsStackParamList } from '@/routing/MedsStack';

type RouteParams = { id: string };

/**
 * Legacy MedDetails route — redirects to MedsHome inline expand (Phase 2).
 * Kept registered for old deep links (reclaim://meds/:id).
 */
export default function MedDetailsScreen() {
  const route = useRoute();
  const navigation = useNavigation<NativeStackNavigationProp<MedsStackParamList, 'MedDetails'>>();

  const { id } = (route.params as RouteParams) ?? { id: '' };

  useEffect(() => {
    if (!id) {
      navigation.replace('MedsHome', {});
      return;
    }
    navigation.replace('MedsHome', { expandMedId: id });
  }, [id, navigation]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator />
    </View>
  );
}

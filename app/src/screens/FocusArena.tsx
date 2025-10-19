import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';

export default function FocusArena() {
  const [seconds, setSeconds] = useState(25*60);
  const [running, setRunning] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;
    timer.current = setInterval(() => setSeconds((s) => (s>0 ? s-1 : 0)), 1000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [running]);

  useEffect(() => {
    return () => { if (timer.current) clearInterval(timer.current); };
  }, []);

  useEffect(() => { if (seconds === 0) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); setRunning(false);} }, [seconds]);

  const mm = String(Math.floor(seconds/60)).padStart(2,'0');
  const ss = String(seconds%60).padStart(2,'0');

  return (
    <View className="flex-1 bg-[#0b1220] items-center justify-center">
      <Text className="text-white text-6xl font-bold">{mm}:{ss}</Text>
      <View className="flex-row mt-6">
        <Btn onPress={() => setRunning((r) => !r)}>{running ? 'Pause' : 'Start'}</Btn>
        <Btn onPress={() => { setSeconds(25*60); setRunning(false); }}>Reset</Btn>
      </View>
    </View>
  );
}

function Btn({ onPress, children }: any) {
  return (
    <TouchableOpacity onPress={onPress} className="mx-2 px-5 py-3 bg-white/10 rounded-2xl">
      <Text className="text-white">{children}</Text>
    </TouchableOpacity>
  );
}

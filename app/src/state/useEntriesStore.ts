import { create } from 'zustand';

export type Mood = 1|2|3|4|5;

type Entry = {
  id: string;
  date: string;            // ISO
  mood?: Mood;
  sleepHours?: number;
  focusMinutes?: number;
  medsTaken?: boolean;
};

type Store = {
  entries: Entry[];
  add: (e: Entry) => void;
};

export const useEntriesStore = create<Store>((set) => ({
  entries: [],
  add: (e) => set((s) => ({ entries: [e, ...s.entries] })),
}));

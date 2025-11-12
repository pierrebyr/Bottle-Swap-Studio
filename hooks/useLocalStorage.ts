import { useState, useEffect } from 'react';

export const useLocalStorage = <T,>(key: string, initialValue: T) => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  const removeValue = () => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue, removeValue] as const;
};

interface GenerationHistory {
  id: string;
  timestamp: number;
  mode: 'simple' | 'complex';
  images: string[];
  prompt?: string;
}

export const useGenerationHistory = () => {
  const [history, setHistory, removeHistory] = useLocalStorage<GenerationHistory[]>('bottle-swap-history', []);

  const addToHistory = (mode: 'simple' | 'complex', images: string[], prompt?: string) => {
    const newEntry: GenerationHistory = {
      id: `gen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      mode,
      images,
      prompt,
    };

    setHistory((prev) => [newEntry, ...prev].slice(0, 20)); // Keep only last 20 generations
  };

  const clearHistory = () => {
    removeHistory();
  };

  const deleteEntry = (id: string) => {
    setHistory((prev) => prev.filter((entry) => entry.id !== id));
  };

  return {
    history,
    addToHistory,
    clearHistory,
    deleteEntry,
  };
};

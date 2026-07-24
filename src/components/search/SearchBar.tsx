'use client';

import { useRef, useCallback } from 'react';
import styles from './SearchBar.module.css';

interface SearchBarProps {
  value: string;
  onChange: (val: string) => void;
  onSearch: () => void;
  placeholder?: string;
}

export default function SearchBar({ value, onChange, onSearch, placeholder }: SearchBarProps) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (val.trim()) {
      timerRef.current = setTimeout(onSearch, 500);
    }
  }, [onChange, onSearch]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (timerRef.current) clearTimeout(timerRef.current);
      onSearch();
    }
  }, [onSearch]);

  return (
    <div className={styles.wrapper}>
      <span className={styles.icon}>🔍</span>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || 'Search...'}
        className={styles.input}
      />
      {value && (
        <button className={styles.clear} onClick={() => { onChange(''); }}>✕</button>
      )}
    </div>
  );
}

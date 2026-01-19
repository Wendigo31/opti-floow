import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from '../useLocalStorage';

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Initialization', () => {
    it('should return default value when no stored value exists', () => {
      const { result } = renderHook(() => useLocalStorage('test-key', 'default'));
      expect(result.current[0]).toBe('default');
    });

    it('should return stored value when it exists', () => {
      localStorage.setItem('test-key', JSON.stringify('stored-value'));
      const { result } = renderHook(() => useLocalStorage('test-key', 'default'));
      expect(result.current[0]).toBe('stored-value');
    });

    it('should handle object default values', () => {
      const defaultObj = { name: 'test', count: 0 };
      const { result } = renderHook(() => useLocalStorage('test-obj', defaultObj));
      expect(result.current[0]).toEqual(defaultObj);
    });

    it('should handle array default values', () => {
      const defaultArr = [1, 2, 3];
      const { result } = renderHook(() => useLocalStorage('test-arr', defaultArr));
      expect(result.current[0]).toEqual(defaultArr);
    });
  });

  describe('Value Updates', () => {
    it('should update state and localStorage when setValue is called', () => {
      const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));

      act(() => {
        result.current[1]('updated');
      });

      expect(result.current[0]).toBe('updated');
      expect(JSON.parse(localStorage.getItem('test-key') || '')).toBe('updated');
    });

    it('should handle object updates', () => {
      const { result } = renderHook(() => 
        useLocalStorage('test-obj', { name: 'initial', count: 0 })
      );

      act(() => {
        result.current[1]({ name: 'updated', count: 5 });
      });

      expect(result.current[0]).toEqual({ name: 'updated', count: 5 });
    });

    it('should handle array updates', () => {
      const { result } = renderHook(() => useLocalStorage('test-arr', [1, 2]));

      act(() => {
        result.current[1]([1, 2, 3, 4]);
      });

      expect(result.current[0]).toEqual([1, 2, 3, 4]);
    });

    it('should handle functional updates', () => {
      const { result } = renderHook(() => useLocalStorage('test-count', 0));

      act(() => {
        result.current[1]((prev: number) => prev + 1);
      });

      expect(result.current[0]).toBe(1);

      act(() => {
        result.current[1]((prev: number) => prev + 5);
      });

      expect(result.current[0]).toBe(6);
    });
  });

  describe('Type Safety', () => {
    it('should handle boolean values', () => {
      const { result } = renderHook(() => useLocalStorage('test-bool', false));

      expect(result.current[0]).toBe(false);

      act(() => {
        result.current[1](true);
      });

      expect(result.current[0]).toBe(true);
    });

    it('should handle number values', () => {
      const { result } = renderHook(() => useLocalStorage('test-num', 0));

      act(() => {
        result.current[1](42);
      });

      expect(result.current[0]).toBe(42);
    });

    it('should handle null values', () => {
      const { result } = renderHook(() => useLocalStorage<string | null>('test-null', null));

      expect(result.current[0]).toBeNull();

      act(() => {
        result.current[1]('not null');
      });

      expect(result.current[0]).toBe('not null');
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid JSON in localStorage gracefully', () => {
      localStorage.setItem('test-invalid', 'not valid json');
      const { result } = renderHook(() => useLocalStorage('test-invalid', 'default'));
      expect(result.current[0]).toBe('default');
    });

    it('should handle empty string in localStorage', () => {
      localStorage.setItem('test-empty', '""');
      const { result } = renderHook(() => useLocalStorage('test-empty', 'default'));
      expect(result.current[0]).toBe('');
    });

    it('should handle complex nested objects', () => {
      const complexObj = {
        level1: {
          level2: {
            level3: {
              value: 'deep',
            },
          },
        },
        array: [{ id: 1 }, { id: 2 }],
      };

      const { result } = renderHook(() => useLocalStorage('test-complex', complexObj));
      expect(result.current[0]).toEqual(complexObj);
    });
  });

  describe('Key Changes', () => {
    it('should update value when key changes', () => {
      localStorage.setItem('key-1', JSON.stringify('value-1'));
      localStorage.setItem('key-2', JSON.stringify('value-2'));

      const { result, rerender } = renderHook(
        ({ key }) => useLocalStorage(key, 'default'),
        { initialProps: { key: 'key-1' } }
      );

      expect(result.current[0]).toBe('value-1');

      rerender({ key: 'key-2' });
      expect(result.current[0]).toBe('value-2');
    });
  });
});

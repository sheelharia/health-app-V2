import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { debounce } from 'lodash-es';
import { useRef } from 'react';
import { searchFoods, getFoodCategories, getFoodWithUnits } from '../services/foods';
import { QUERY_KEYS } from '../lib/queryClient';
import type { FoodWithUnits } from '../lib/supabase';

export function useFoodSearch(initialQuery = '', initialCategory?: string) {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const debounceRef = useRef(
    debounce((q: string) => setDebouncedQuery(q), 300)
  );

  const handleQueryChange = useCallback((newQuery: string) => {
    setQuery(newQuery);
    debounceRef.current(newQuery);
  }, []);

  const { data: foods = [], isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.foods.search(debouncedQuery, category),
    queryFn: () => searchFoods(debouncedQuery, category),
    enabled: debouncedQuery.length >= 2,
    placeholderData: (prev) => prev,
  });

  return {
    query,
    setQuery: handleQueryChange,
    category,
    setCategory,
    foods,
    isLoading,
    error,
    hasResults: foods.length > 0,
  };
}

export function useFoodCategories() {
  return useQuery({
    queryKey: QUERY_KEYS.foods.categories(),
    queryFn: getFoodCategories,
    staleTime: 1000 * 60 * 60,
  });
}

export function useFoodDetail(foodId: string | null) {
  return useQuery({
    queryKey: foodId ? QUERY_KEYS.foods.detail(foodId) : ['foods', 'detail', 'null'],
    queryFn: () => getFoodWithUnits(foodId!),
    enabled: !!foodId,
  });
}

export function useRecentFoods(limit = 10) {
  const queryClient = useQueryClient();
  
  const addRecentFood = useCallback((food: FoodWithUnits) => {
    queryClient.setQueryData<FoodWithUnits[]>(['foods', 'recent'], (old = []) => {
      const filtered = old.filter(f => f.id !== food.id);
      return [food, ...filtered].slice(0, limit);
    });
  }, [queryClient, limit]);

  const { data: recentFoods = [] } = useQuery({
    queryKey: ['foods', 'recent'],
    queryFn: () => [],
    initialData: [],
    staleTime: Infinity,
  });

  return { recentFoods, addRecentFood };
}
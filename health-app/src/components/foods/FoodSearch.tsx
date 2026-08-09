import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';
import { useFoodSearch, useFoodCategories } from '../../hooks/useFoods';
import { useFoodDetail } from '../../hooks/useFoods';
import { useRecentFoods } from '../../hooks/useFoods';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Modal } from '../ui/Modal';
import { clsx } from 'clsx';
import type { FoodWithUnits, FoodUnit } from '../../lib/supabase';

interface FoodSearchProps {
  onSelect: (food: FoodWithUnits, unit: FoodUnit) => void;
  placeholder?: string;
  className?: string;
}

export function FoodSearch({ onSelect, placeholder = 'Search for a food...', className }: FoodSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodWithUnits | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<FoodUnit | null>(null);
  const [quantity, setQuantity] = useState(1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { query, setQuery, category, setCategory, foods, isLoading, hasResults } = useFoodSearch();
  const { data: categories = [] } = useFoodCategories();
  const { recentFoods, addRecentFood } = useRecentFoods();
  const { data: foodDetail } = useFoodDetail(selectedFood?.id || null);

  // Use food detail if available, otherwise selected food
  const currentFood = foodDetail || selectedFood;
  const currentUnits = currentFood?.units || [];
  const defaultUnit = currentUnits.find(u => u.is_default) || currentUnits[0];

  // Auto-select default unit when food changes
  useEffect(() => {
    if (defaultUnit && defaultUnit !== selectedUnit) {
      setSelectedUnit(defaultUnit);
      setQuantity(1);
    }
  }, [defaultUnit]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleFoodClick = (food: FoodWithUnits) => {
    setSelectedFood(food);
    setIsOpen(false);
    setQuery(food.name);
    addRecentFood(food);
  };

  const handleAdd = () => {
    if (currentFood && selectedUnit) {
      onSelect(currentFood, selectedUnit);
      // Reset for next entry
      setSelectedFood(null);
      setSelectedUnit(null);
      setQuantity(1);
      setQuery('');
      setIsOpen(false);
    }
  };

  const displayFoods = isOpen ? foods : recentFoods.slice(0, 5);

  return (
    <div className={clsx('relative w-full', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          autoComplete="off"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label="Clear search"
          >
            <X className="h-5 w-5" />
          </button>
        )}
        <ChevronDown className="absolute right-10 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
      </div>

      {/* Category filter */}
      <Select
        value={category}
        onChange={(e) => setCategory(e.target.value || undefined)}
        options={['all', ...categories].map(c => ({ value: c === 'all' ? '' : c, label: c === 'all' ? 'All Categories' : c }))}
        placeholder="Category"
        className="mt-2 w-full md:w-auto md:flex-1"
      />

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 w-full max-h-96 overflow-auto bg-white border border-gray-200 rounded-lg shadow-lg"
        >
          {isLoading && (
            <div className="p-4 text-center text-gray-500">Searching...</div>
          )}
          {!isLoading && displayFoods.length === 0 && (
            <div className="p-4 text-center text-gray-500">
              {query.length < 2 ? 'Type at least 2 characters' : 'No foods found'}
            </div>
          )}
          {!isLoading && displayFoods.length > 0 && (
            <ul className="divide-y divide-gray-100 max-h-96 overflow-auto">
              {displayFoods.map(food => (
                <li key={food.id}>
                  <button
                    onClick={() => handleFoodClick(food)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="font-medium text-gray-900">{food.name}</div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                      <span className="px-2 py-0.5 bg-gray-100 rounded">{food.category}</span>
                      <span>{food.calories_per_100g} kcal/100g</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Selected food details */}
      {currentFood && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-lg animate-slide-in">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">{currentFood.name}</h4>
              <p className="text-sm text-gray-600 mt-1">
                {currentFood.calories_per_100g} kcal | 
                P: {currentFood.protein_per_100g}g | 
                C: {currentFood.carbs_per_100g}g | 
                F: {currentFood.fat_per_100g}g per 100g
              </p>
            </div>
            <button
              onClick={() => { setSelectedFood(null); setSelectedUnit(null); setQuantity(1); }}
              className="ml-4 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Unit selector */}
          {currentUnits.length > 1 && (
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Serving</label>
              <Select
                value={selectedUnit?.id || ''}
                onChange={(e) => {
                  const unit = currentUnits.find(u => u.id === e.target.value);
                  if (unit) setSelectedUnit(unit);
                }}
                options={currentUnits.map(u => ({ value: u.id, label: `${u.name} (${u.grams_per_unit}g)` }))}
                placeholder="Select serving"
              />
            </div>
          )}

          {/* Quantity input */}
          <div className="mt-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQuantity(Math.max(0.5, quantity - (selectedUnit?.grams_per_unit && selectedUnit.grams_per_unit < 50 ? 0.5 : 1)))}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                aria-label="Decrease"
              >
                −
              </button>
              <Input
                type="number"
                step={selectedUnit?.grams_per_unit && selectedUnit.grams_per_unit < 50 ? 0.5 : 1}
                min={0.5}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(0.5, parseFloat(e.target.value) || 0.5))}
                className="w-24 text-center"
              />
              <button
                onClick={() => setQuantity(quantity + (selectedUnit?.grams_per_unit && selectedUnit.grams_per_unit < 50 ? 0.5 : 1))}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                aria-label="Increase"
              >
                +
              </button>
              <span className="text-sm text-gray-500 ml-2">
                {selectedUnit ? `${quantity} ${selectedUnit.name}` : 'pieces'}
              </span>
            </div>
          </div>

          {/* Preview calories */}
          {selectedUnit && (
            <div className="mt-3 p-3 bg-white rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Estimated calories:</span>
                <span className="font-semibold text-blue-700 text-lg">
                  {Math.round(currentFood.calories_per_100g * (selectedUnit.grams_per_unit * quantity) / 100)} kcal
                </span>
              </div>
            </div>
          )}

          {/* Add button */}
          <Button 
            className="mt-4 w-full" 
            onClick={handleAdd}
            disabled={!selectedUnit}
          >
            Add to Meal
          </Button>
        </div>
      )}
    </div>
  );
}
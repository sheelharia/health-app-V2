import { useState, useRef, useEffect } from 'react';
import { Search, X, ArrowLeft } from 'lucide-react';
import { useFoodSearch, useFoodCategories, useFoodDetail, useRecentFoods } from '../../hooks/useFoods';
import { Button } from '../ui/Button';
import { Stepper } from '../ui/Stepper';
import { PillFilter } from '../ui/PillFilter';
import { Select } from '../ui/Select';
import { clsx } from 'clsx';
import type { FoodWithUnits, FoodUnit } from '../../lib/supabase';
import { format } from 'date-fns';

interface FoodSearchProps {
  mealType: string;
  onSelect: (food: FoodWithUnits, unit: FoodUnit, quantity: number) => void;
  onClose: () => void;
}

export function FoodSearch({ mealType, onSelect, onClose }: FoodSearchProps) {
  const [selectedFood, setSelectedFood] = useState<FoodWithUnits | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<FoodUnit | null>(null);
  const [quantity, setQuantity] = useState(1);
  const inputRef = useRef<HTMLInputElement>(null);

  const { query, setQuery, category, setCategory, foods, isLoading } = useFoodSearch();
  const { data: categories = [] } = useFoodCategories();
  const { recentFoods, addRecentFood } = useRecentFoods();
  const { data: foodDetail } = useFoodDetail(selectedFood?.id || null);

  const currentFood = foodDetail || selectedFood;
  const currentUnits = currentFood?.units || [];
  const defaultUnit = currentUnits.find(u => u.is_default) || currentUnits[0];

  useEffect(() => {
    if (defaultUnit && defaultUnit !== selectedUnit) {
      setSelectedUnit(defaultUnit);
      setQuantity(1);
    }
  }, [defaultUnit]);

  const handleFoodClick = (food: FoodWithUnits) => {
    setSelectedFood(food);
    setQuery(food.name);
    addRecentFood(food);
  };

  const handleAdd = () => {
    if (currentFood && selectedUnit) {
      onSelect(currentFood, selectedUnit, quantity);
      setSelectedFood(null);
      setSelectedUnit(null);
      setQuantity(1);
      setQuery('');
    }
  };

  const categoryOptions = [
    { value: '', label: 'All' },
    ...categories.map(c => ({ value: c, label: c })),
  ];

  const displayFoods = query.length > 0 ? foods : recentFoods.slice(0, 5);
  const sectionLabel = query.length > 0 ? 'All Foods' : 'Recent';

  return (
    <div className="min-h-screen bg-brand-50">
      {/* Header */}
      <header className="bg-white border-b border-emerald-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-5 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900">Add to {mealType}</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-4 pb-24">
        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for a food..."
            className="w-full pl-12 pr-12 py-3.5 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            autoComplete="off"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Category Pills */}
        <PillFilter
          options={categoryOptions}
          selected={category || ''}
          onChange={(val) => setCategory(val || undefined)}
          className="mb-4"
        />

        {/* Food List */}
        {!selectedFood && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">{sectionLabel}</h3>
            
            {isLoading && (
              <div className="py-8 text-center text-gray-500">Searching...</div>
            )}
            
            {!isLoading && displayFoods.length === 0 && (
              <div className="py-8 text-center text-gray-500">
                {query.length < 2 ? 'Type at least 2 characters to search' : 'No foods found'}
              </div>
            )}
            
            {!isLoading && displayFoods.length > 0 && (
              <div className="space-y-1">
                {displayFoods.map(food => (
                  <button
                    key={food.id}
                    onClick={() => handleFoodClick(food)}
                    className="w-full p-4 text-left bg-white rounded-xl border border-emerald-100 hover:bg-gray-50 transition-colors"
                  >
                    <div className="font-medium text-gray-900">{food.name}</div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                      <span className="px-2 py-0.5 bg-brand-50 text-brand-700 rounded-full text-xs font-medium">
                        {food.category}
                      </span>
                      <span>{food.calories_per_100g} kcal/100g</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
            
            {/* Can't find your food */}
            <div className="pt-4 text-center">
              <button className="text-sm text-brand-600 hover:text-brand-700 font-medium">
                Can't find your food? +
              </button>
            </div>
          </div>
        )}

        {/* Food Detail Panel */}
        {currentFood && (
          <div className="space-y-6">
            {/* Food Header */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{currentFood.name}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {currentFood.calories_per_100g} kcal per 100g
                </p>
              </div>
              <button
                onClick={() => { setSelectedFood(null); setSelectedUnit(null); setQuantity(1); }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Quantity & Measure */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                <Stepper
                  value={quantity}
                  onChange={setQuantity}
                  min={0.5}
                  max={50}
                  step={0.5}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Measure</label>
                <Select
                  value={selectedUnit?.id || ''}
                  onChange={(e) => {
                    const unit = currentUnits.find(u => u.id === e.target.value);
                    if (unit) setSelectedUnit(unit);
                  }}
                  options={currentUnits.map(u => ({ value: u.id, label: u.name }))}
                  placeholder="Select serving"
                />
              </div>
            </div>

            {/* Macronutrients Breakdown */}
            <div className="bg-white rounded-2xl border border-emerald-100 p-5">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Macronutrients</h3>
              
              {/* Calories - Large Display */}
              <div className="flex items-baseline justify-between mb-4 pb-4 border-b border-gray-100">
                <div>
                  <p className="text-sm text-gray-500">Calories</p>
                  <p className="text-4xl font-bold text-gray-900">
                    {Math.round(currentFood.calories_per_100g * (selectedUnit?.grams_per_unit || 100) * quantity / 100)}
                  </p>
                </div>
                <p className="text-sm text-gray-500">
                  Net wt: {Math.round((selectedUnit?.grams_per_unit || 100) * quantity)}g
                </p>
              </div>

              {/* Individual Macros */}
              <div className="space-y-3">
                <MacroRow
                  icon="●"
                  label="Proteins"
                  value={Math.round(currentFood.protein_per_100g * (selectedUnit?.grams_per_unit || 100) * quantity / 100 * 10) / 10}
                  color="text-brand-600"
                />
                <MacroRow
                  icon="●"
                  label="Carbs"
                  value={Math.round(currentFood.carbs_per_100g * (selectedUnit?.grams_per_unit || 100) * quantity / 100 * 10) / 10}
                  color="text-green-600"
                />
                <MacroRow
                  icon="●"
                  label="Fat"
                  value={Math.round(currentFood.fat_per_100g * (selectedUnit?.grams_per_unit || 100) * quantity / 100 * 10) / 10}
                  color="text-yellow-600"
                />
                <MacroRow
                  icon="●"
                  label="Fiber"
                  value={Math.round(((currentFood as any).fiber_per_100g || 0) * (selectedUnit?.grams_per_unit || 100) * quantity / 100 * 10) / 10}
                  color="text-purple-600"
                />
              </div>
            </div>

            {/* Add Button */}
            <Button
              className="w-full py-4 text-lg"
              onClick={handleAdd}
              disabled={!selectedUnit}
            >
              Add to {mealType}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}

function MacroRow({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className={clsx('text-xs', color)}>{icon}</span>
        <span className="text-gray-700">{label}</span>
      </div>
      <span className="font-medium text-gray-900">{value} g</span>
    </div>
  );
}

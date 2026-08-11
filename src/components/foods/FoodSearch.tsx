import { useState, useRef, useEffect } from 'react';
import { Search, X, ArrowLeft, Sparkles, AlertTriangle } from 'lucide-react';
import { useFoodSearch, useFoodCategories, useFoodDetail, useRecentFoods, useFoodLookup } from '../../hooks/useFoods';
import { Button } from '../ui/Button';
import { Stepper } from '../ui/Stepper';
import { PillFilter } from '../ui/PillFilter';
import { Select } from '../ui/Select';
import { clsx } from 'clsx';
import type { FoodWithUnits, FoodUnit } from '../../lib/supabase';

interface FoodSearchProps {
  mealType: string;
  onSelect: (food: FoodWithUnits, unit: FoodUnit, quantity: number) => void;
  onClose: () => void;
}

interface AiFoodDraft {
  name: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  fiber_per_100g: number;
  default_unit: string;
  grams_per_unit: number;
}

export function FoodSearch({ mealType, onSelect, onClose }: FoodSearchProps) {
  const [selectedFood, setSelectedFood] = useState<FoodWithUnits | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<FoodUnit | null>(null);
  const [quantity, setQuantity] = useState(1);
  const inputRef = useRef<HTMLInputElement>(null);

  // AI lookup state
  const [showAiLookup, setShowAiLookup] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [aiDraft, setAiDraft] = useState<AiFoodDraft | null>(null);
  const foodLookup = useFoodLookup();

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

  const handleAiLookup = async () => {
    if (!aiQuery.trim()) return;
    try {
      const result = await foodLookup.mutateAsync(aiQuery.trim());
      const food = result.food;
      const defaultU = food.units?.find(u => u.is_default) || food.units?.[0];
      setAiDraft({
        name: food.name,
        calories_per_100g: food.calories_per_100g,
        protein_per_100g: food.protein_per_100g,
        carbs_per_100g: food.carbs_per_100g,
        fat_per_100g: food.fat_per_100g,
        fiber_per_100g: (food as any).fiber_per_100g || 0,
        default_unit: defaultU?.name || 'serving',
        grams_per_unit: defaultU?.grams_per_unit || 100,
      });
    } catch (err) {
      console.error('AI lookup failed:', err);
    }
  };

  const handleAiConfirm = () => {
    if (!aiDraft) return;
    // Create a temporary FoodWithUnits from the draft
    const tempFood: FoodWithUnits = {
      id: `ai-${Date.now()}`,
      name: aiDraft.name,
      calories_per_100g: aiDraft.calories_per_100g,
      protein_per_100g: aiDraft.protein_per_100g,
      carbs_per_100g: aiDraft.carbs_per_100g,
      fat_per_100g: aiDraft.fat_per_100g,
      category: 'AI Lookup',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      units: [{
        id: `ai-unit-${Date.now()}`,
        food_id: `ai-${Date.now()}`,
        name: aiDraft.default_unit,
        grams_per_unit: aiDraft.grams_per_unit,
        is_default: true,
        display_order: 0,
        created_at: new Date().toISOString(),
      }],
    };
    setSelectedFood(tempFood);
    setQuery(tempFood.name);
    setShowAiLookup(false);
    setAiDraft(null);
    setAiQuery('');
  };

  const handleAiCancel = () => {
    setShowAiLookup(false);
    setAiDraft(null);
    setAiQuery('');
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
        {!selectedFood && !showAiLookup && (
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
            
            {/* Can't find your food — AI Lookup */}
            {query.length >= 2 && !isLoading && displayFoods.length === 0 && (
              <div className="pt-4">
                <button
                  onClick={() => {
                    setShowAiLookup(true);
                    setAiQuery(query);
                  }}
                  className="w-full p-4 bg-brand-50 border-2 border-dashed border-brand-300 rounded-xl text-brand-700 font-medium hover:bg-brand-100 transition-colors flex items-center justify-center gap-2"
                >
                  <Sparkles className="h-5 w-5" />
                  Can't find "{query}"? Look it up with AI
                </button>
              </div>
            )}

            {query.length < 2 && (
              <div className="pt-4 text-center">
                <button
                  onClick={() => setShowAiLookup(true)}
                  className="text-sm text-brand-600 hover:text-brand-700 font-medium inline-flex items-center gap-1"
                >
                  <Sparkles className="h-4 w-4" />
                  Can't find your food?
                </button>
              </div>
            )}
          </div>
        )}

        {/* AI Lookup Panel */}
        {showAiLookup && !aiDraft && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-brand-200 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-5 w-5 text-brand-600" />
                <h3 className="font-semibold text-gray-900">AI Food Lookup</h3>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Describe what you ate — AI will estimate the nutrition info.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAiLookup()}
                  placeholder='e.g. "2 roti with ghee"'
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  autoFocus
                />
                <Button
                  onClick={handleAiLookup}
                  disabled={!aiQuery.trim() || foodLookup.isPending}
                  className="px-5 py-3"
                >
                  {foodLookup.isPending ? 'Looking up...' : 'Look up'}
                </Button>
              </div>
              <button
                onClick={handleAiCancel}
                className="mt-3 text-sm text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
            {foodLookup.isPending && (
              <div className="text-center py-6">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
                <p className="text-sm text-gray-500 mt-2">Looking up nutrition data...</p>
              </div>
            )}
            {foodLookup.isError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                Lookup failed. Please try again or search for a different food.
              </div>
            )}
          </div>
        )}

        {/* AI Draft Review — Editable */}
        {showAiLookup && aiDraft && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-brand-200 p-5">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-5 w-5 text-brand-600" />
                <h3 className="font-semibold text-gray-900">{aiDraft.name}</h3>
              </div>
              <div className="flex items-center gap-1.5 mb-4 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <span className="text-xs text-amber-700">Estimated nutrition — may vary</span>
              </div>

              <div className="space-y-3">
                <AiEditRow
                  label="Calories"
                  unit="kcal"
                  value={aiDraft.calories_per_100g}
                  onChange={(v) => setAiDraft({ ...aiDraft, calories_per_100g: v })}
                />
                <AiEditRow
                  label="Protein"
                  unit="g"
                  value={aiDraft.protein_per_100g}
                  onChange={(v) => setAiDraft({ ...aiDraft, protein_per_100g: v })}
                />
                <AiEditRow
                  label="Carbs"
                  unit="g"
                  value={aiDraft.carbs_per_100g}
                  onChange={(v) => setAiDraft({ ...aiDraft, carbs_per_100g: v })}
                />
                <AiEditRow
                  label="Fat"
                  unit="g"
                  value={aiDraft.fat_per_100g}
                  onChange={(v) => setAiDraft({ ...aiDraft, fat_per_100g: v })}
                />
                <AiEditRow
                  label="Fiber"
                  unit="g"
                  value={aiDraft.fiber_per_100g}
                  onChange={(v) => setAiDraft({ ...aiDraft, fiber_per_100g: v })}
                />

                <div className="pt-2 border-t border-gray-100">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Serving unit</label>
                      <input
                        type="text"
                        value={aiDraft.default_unit}
                        onChange={(e) => setAiDraft({ ...aiDraft, default_unit: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Grams per serving</label>
                      <input
                        type="number"
                        value={aiDraft.grams_per_unit}
                        onChange={(e) => setAiDraft({ ...aiDraft, grams_per_unit: Number(e.target.value) || 100 })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-5">
                <Button
                  onClick={handleAiConfirm}
                  className="flex-1 py-3"
                >
                  Confirm & Add
                </Button>
                <button
                  onClick={handleAiCancel}
                  className="px-4 py-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Food Detail Panel */}
        {currentFood && !showAiLookup && (
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

function AiEditRow({ label, unit, value, onChange }: { label: string; unit: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-700">{label}</span>
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="w-20 px-2 py-1.5 text-right border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
          step="0.1"
        />
        <span className="text-xs text-gray-500 w-8">{unit}</span>
      </div>
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

import { useState, useEffect } from 'react';
import { useAuth } from '@hooks/useAuth';
import { useDailyGoal } from '@hooks/useMeals';
import { Card, CardHeader } from '@components/ui/Card';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import { ArrowLeft, Save, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { clsx } from 'clsx';

function loadMacroTargets() {
  try {
    const saved = localStorage.getItem('macro_targets');
    if (saved) return JSON.parse(saved);
  } catch {}
  return { protein: 150, carbs: 200, fat: 67, fiber: 30 };
}

function loadMealPercentages() {
  try {
    const saved = localStorage.getItem('meal_percentages');
    if (saved) return JSON.parse(saved);
  } catch {}
  return { breakfast: 30, lunch: 35, snack: 10, dinner: 25 };
}

export function Settings() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const today = format(new Date(), 'yyyy-MM-dd');
  
  const { goal, setGoal, isSetting } = useDailyGoal(today);
  const savedMacros = loadMacroTargets();
  const savedPercents = loadMealPercentages();
  
  const [calories, setCalories] = useState(2000);
  const [protein, setProtein] = useState(savedMacros.protein);
  const [carbs, setCarbs] = useState(savedMacros.carbs);
  const [fat, setFat] = useState(savedMacros.fat);
  const [fiber, setFiber] = useState(savedMacros.fiber);
  
  const [mealPercentages, setMealPercentages] = useState(savedPercents);
  const [saved, setSaved] = useState(false);

  // Sync calories with DB goal once it loads
  useEffect(() => {
    if (goal?.calories) {
      setCalories(goal.calories);
    }
  }, [goal?.calories]);

  const handleSaveGoals = () => {
    setGoal(calories);
    localStorage.setItem('macro_targets', JSON.stringify({ protein, carbs, fat, fiber }));
    localStorage.setItem('meal_percentages', JSON.stringify(mealPercentages));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const totalPercentage = Object.values(mealPercentages).reduce((sum, val) => sum + val, 0);

  return (
    <div className="min-h-screen bg-brand-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-emerald-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-5 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">Settings</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-6 space-y-6">
        {/* Nutrition Goals */}
        <Card>
          <CardHeader title="Nutrition Goals" />
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Daily Calorie Goal</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={calories}
                  onChange={(e) => setCalories(parseInt(e.target.value) || 0)}
                  className="flex-1"
                />
                <span className="text-gray-500">kcal</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Protein Target</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={protein}
                    onChange={(e) => setProtein(parseInt(e.target.value) || 0)}
                    className="flex-1"
                  />
                  <span className="text-gray-500">g</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Carbs Target</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={carbs}
                    onChange={(e) => setCarbs(parseInt(e.target.value) || 0)}
                    className="flex-1"
                  />
                  <span className="text-gray-500">g</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fat Target</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={fat}
                    onChange={(e) => setFat(parseInt(e.target.value) || 0)}
                    className="flex-1"
                  />
                  <span className="text-gray-500">g</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fiber Target</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={fiber}
                    onChange={(e) => setFiber(parseInt(e.target.value) || 0)}
                    className="flex-1"
                  />
                  <span className="text-gray-500">g</span>
                </div>
              </div>
            </div>
            
            <Button onClick={handleSaveGoals} disabled={isSetting} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              {isSetting ? 'Saving...' : saved ? '✓ Saved!' : 'Save Goals'}
            </Button>
          </div>
        </Card>

        {/* Meal Preferences */}
        <Card>
          <CardHeader title="Meal Preferences" subtitle="Percentage of daily calories per meal" />
          <div className="space-y-4">
            {Object.entries(mealPercentages).map(([meal, percentage]) => (
              <div key={meal} className="flex items-center gap-3">
                <span className="w-24 text-sm font-medium text-gray-700 capitalize">{meal}</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={percentage}
                  onChange={(e) => setMealPercentages(prev => ({
                    ...prev,
                    [meal]: parseInt(e.target.value)
                  }))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
                />
                <span className="w-12 text-sm font-semibold text-gray-900 text-right">{percentage}%</span>
              </div>
            ))}
            
            <div className={clsx(
              'text-sm font-medium',
              totalPercentage === 100 ? 'text-green-600' : 'text-orange-600'
            )}>
              Total: {totalPercentage}% {totalPercentage !== 100 && '(should be 100%)'}
            </div>
          </div>
        </Card>

        {/* Account */}
        <Card>
          <CardHeader title="Account" />
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium text-gray-900">{user?.email}</p>
            </div>
            
            <Button variant="danger" onClick={handleSignOut} className="w-full">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}

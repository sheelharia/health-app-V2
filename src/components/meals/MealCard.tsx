import { clsx } from 'clsx';
import { useState } from 'react';
import { useMealsByDate, useMealActions, useDailySummary } from '../../hooks/useMeals';
import { FoodSearch } from '../foods/FoodSearch';
import { Button } from '../ui/Button';
import { Card, CardHeader } from '../ui/Card';
import { Modal, ConfirmDialog } from '../ui/Modal';
import { MealType, type MealWithItems, type MealItem } from '../../lib/supabase';
import { getMealTypeLabel, getMealTypeIcon, sumMealItems } from '../../services/meals';
import { Plus, Trash2, Edit, ChevronDown, ChevronUp, X } from 'lucide-react';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'snack', 'dinner'];

interface MealItemRowProps {
  item: MealItem;
  onUpdate: (itemId: string, quantity: number) => void;
  onDelete: (itemId: string) => void;
}

export function MealItemRow({ item, onUpdate, onDelete }: MealItemRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editQuantity, setEditQuantity] = useState(item.quantity);

  const foodName = item.food?.name || 'Unknown food';
  const unitName = item.unit?.name || 'unit';

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
        <input
          type="number"
          step="0.5"
          min="0.5"
          value={editQuantity}
          onChange={(e) => setEditQuantity(Math.max(0.5, parseFloat(e.target.value) || 0.5))}
          onBlur={() => { onUpdate(item.id, editQuantity); setIsEditing(false); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { onUpdate(item.id, editQuantity); setIsEditing(false); }}}
          className="w-20 px-2 py-1 border border-gray-300 rounded text-center text-sm"
          autoFocus
        />
        <span className="text-sm text-gray-500">{unitName}</span>
        <span className="text-sm font-medium text-blue-600">
          {Math.round(item.calories / item.quantity * editQuantity)} kcal
        </span>
        <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 truncate">{foodName}</span>
          <span className="px-2 py-0.5 bg-gray-200 rounded text-xs text-gray-600">{unitName}</span>
        </div>
        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
          <span>Qty: {item.quantity} {unitName}</span>
          <span>•</span>
          <span>{item.calories} kcal</span>
          <span className="text-xs">P:{item.protein}g C:{item.carbs}g F:{item.fat}g</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsEditing(true)}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors"
          aria-label="Edit quantity"
        >
          <Edit className="h-4 w-4" />
        </button>
        <button
          onClick={() => onDelete(item.id)}
          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
          aria-label="Delete item"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

interface MealCardProps {
  meal: MealWithItems;
  onAddItem: (mealType: MealType, foodId: string, unitId: string, quantity: number) => void;
  onDeleteItem: (itemId: string) => void;
  isLoading?: boolean;
}

export function MealCard({ meal, onAddItem, onDeleteItem, isLoading }: MealCardProps) {
  const [showFoodSearch, setShowFoodSearch] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { updateItem, deleteItem } = useMealActions(meal.date);

  const items = meal.items || [];
  const totals = sumMealItems(items);
  const type = meal.meal_type as MealType;
  const isEmpty = items.length === 0;

  const handleDeleteConfirm = () => {
    if (deleteItemId) {
      deleteItem.mutate(deleteItemId);
      setDeleteItemId(null);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <Card className={clsx('overflow-hidden', isEmpty && 'bg-gray-50 border-dashed border-gray-200')}>
      <CardHeader
        title={getMealTypeIcon(type) + ' ' + getMealTypeLabel(type)}
        subtitle={isEmpty ? 'No items logged' : `${items.length} item${items.length !== 1 ? 's' : ''} • ${totals.calories} kcal`}
        action={
          <>
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
            {!isEmpty && !isLoading && (
              <Button variant="ghost" size="sm" onClick={() => setShowFoodSearch(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            )}
          </>
        }
      />
      
      <div className={clsx('transition-all duration-200', expanded ? 'max-h-96' : 'max-h-0')}>
        {!expanded ? null : (
          <div className={clsx('divide-y divide-gray-100', isLoading ? 'opacity-50' : '')}>
            {isEmpty ? (
              <div className="py-8 text-center text-gray-500">
                <p className="mb-2">No foods logged for {getMealTypeLabel(type)}</p>
                {!isLoading && (
                  <Button size="sm" onClick={() => setShowFoodSearch(true)}>
                    <Plus className="h-4 w-4 mr-1" /> Add first item
                  </Button>
                )}
              </div>
            ) : (
              <>
{items.map(item => (
                    <MealItemRow
                      key={item.id}
                      item={item}
                      onUpdate={(id, qty) => updateItem.mutate({ itemId: id, quantity: qty })}
                      onDelete={(id) => { setDeleteItemId(id); setShowDeleteConfirm(true); }}
                    />
                  ))}
                <div className="p-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                  <span className="font-medium text-gray-900">Total</span>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-600">{totals.calories} kcal</span>
                    <span className="text-gray-500">P:{totals.protein}g C:{totals.carbs}g F:{totals.fat}g</span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Food Search Modal */}
      <Modal
        isOpen={showFoodSearch}
        onClose={() => setShowFoodSearch(false)}
        title={`Add to ${getMealTypeLabel(type)}`}
        size="lg"
      >
        <FoodSearch
          onSelect={(food, unit) => {
            onAddItem(type, food.id, unit.id, 1);
            setShowFoodSearch(false);
          }}
        />
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => { setShowDeleteConfirm(false); setDeleteItemId(null); }}
        onConfirm={handleDeleteConfirm}
        title="Remove food item?"
        message="This will remove the item from your meal log."
        confirmText="Remove"
        variant="danger"
      />
    </Card>
  );
}
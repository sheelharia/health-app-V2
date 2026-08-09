-- Initial schema for Health App
-- Users table (extends Supabase auth.users)
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Daily calorie goals
create table if not exists public.daily_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  calories integer not null check (calories > 0 and calories < 10000),
  date date not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, date)
);

-- Foods table (shared, admin-managed)
create table if not exists public.foods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_hi text,
  calories_per_100g numeric(8,2) not null check (calories_per_100g >= 0),
  protein_per_100g numeric(8,2) not null default 0 check (protein_per_100g >= 0),
  carbs_per_100g numeric(8,2) not null default 0 check (carbs_per_100g >= 0),
  fat_per_100g numeric(8,2) not null default 0 check (fat_per_100g >= 0),
  category text not null,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Units of measure for each food
create table if not exists public.food_units (
  id uuid primary key default gen_random_uuid(),
  food_id uuid not null references public.foods(id) on delete cascade,
  name text not null,
  name_hi text,
  grams_per_unit numeric(8,2) not null check (grams_per_unit > 0),
  is_default boolean default false,
  display_order integer default 0,
  created_at timestamptz default now()
);

-- Unit conversions for the same food (e.g., 1 katori = 150g, 1 cup = 200g)
create table if not exists public.food_unit_conversions (
  id uuid primary key default gen_random_uuid(),
  food_id uuid not null references public.foods(id) on delete cascade,
  from_unit_id uuid not null references public.food_units(id) on delete cascade,
  to_unit_id uuid not null references public.food_units(id) on delete cascade,
  conversion_factor numeric(10,4) not null check (conversion_factor > 0),
  created_at timestamptz default now(),
  unique (food_id, from_unit_id, to_unit_id)
);

-- Meals (Breakfast, Lunch, Snack, Dinner)
create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  date date not null,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'snack', 'dinner')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Individual food items within a meal
create table if not exists public.meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meals(id) on delete cascade,
  food_id uuid not null references public.foods(id) on delete restrict,
  unit_id uuid not null references public.food_units(id) on delete restrict,
  quantity numeric(8,2) not null check (quantity > 0),
  calories numeric(8,2) not null,
  protein numeric(8,2) not null default 0,
  carbs numeric(8,2) not null default 0,
  fat numeric(8,2) not null default 0,
  created_at timestamptz default now()
);

-- Indexes for performance
create index if not exists idx_daily_goals_user_date on public.daily_goals(user_id, date desc);
create index if not exists idx_meals_user_date on public.meals(user_id, date desc);
create index if not exists idx_meals_user_date_type on public.meals(user_id, date, meal_type);
create index if not exists idx_meal_items_meal on public.meal_items(meal_id);
create index if not exists idx_foods_category on public.foods(category) where is_active = true;
create index if not exists idx_foods_search on public.foods using gin (to_tsvector('english', name));
create index if not exists idx_food_units_food on public.food_units(food_id);
create index if not exists idx_food_unit_conversions_food on public.food_unit_conversions(food_id);

-- Row Level Security
alter table public.users enable row level security;
alter table public.daily_goals enable row level security;
alter table public.meals enable row level security;
alter table public.meal_items enable row level security;
alter table public.foods enable row level security;
alter table public.food_units enable row level security;
alter table public.food_unit_conversions enable row level security;

-- Users policies
create policy "users_own_data" on public.users
  for all using (auth.uid() = id);

-- Daily goals policies
create policy "goals_select_own" on public.daily_goals
  for select using (auth.uid() = user_id);
create policy "goals_insert_own" on public.daily_goals
  for insert with check (auth.uid() = user_id);
create policy "goals_update_own" on public.daily_goals
  for update using (auth.uid() = user_id);
create policy "goals_delete_own" on public.daily_goals
  for delete using (auth.uid() = user_id);

-- Meals policies
create policy "meals_select_own" on public.meals
  for select using (auth.uid() = user_id);
create policy "meals_insert_own" on public.meals
  for insert with check (auth.uid() = user_id);
create policy "meals_update_own" on public.meals
  for update using (auth.uid() = user_id);
create policy "meals_delete_own" on public.meals
  for delete using (auth.uid() = user_id);

-- Meal items policies
create policy "meal_items_select_own" on public.meal_items
  for select using (
    exists (
      select 1 from public.meals
      where meals.id = meal_items.meal_id
      and meals.user_id = auth.uid()
    )
  );
create policy "meal_items_insert_own" on public.meal_items
  for insert with check (
    exists (
      select 1 from public.meals
      where meals.id = meal_items.meal_id
      and meals.user_id = auth.uid()
    )
  );
create policy "meal_items_update_own" on public.meal_items
  for update using (
    exists (
      select 1 from public.meals
      where meals.id = meal_items.meal_id
      and meals.user_id = auth.uid()
    )
  );
create policy "meal_items_delete_own" on public.meal_items
  for delete using (
    exists (
      select 1 from public.meals
      where meals.id = meal_items.meal_id
      and meals.user_id = auth.uid()
    )
  );

-- Foods: public read, admin write (admin check via email in app logic)
create policy "foods_select_all" on public.foods
  for select using (true);
create policy "food_units_select_all" on public.food_units
  for select using (true);
create policy "food_conversions_select_all" on public.food_unit_conversions
  for select using (true);

-- Updated at triggers
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger users_updated_at
  before update on public.users
  for each row execute function public.handle_updated_at();

create trigger daily_goals_updated_at
  before update on public.daily_goals
  for each row execute function public.handle_updated_at();

create trigger meals_updated_at
  before update on public.meals
  for each row execute function public.handle_updated_at();
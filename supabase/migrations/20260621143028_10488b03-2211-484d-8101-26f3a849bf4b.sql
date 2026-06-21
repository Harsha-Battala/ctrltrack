
-- 1. Delete duplicate categories per user, keeping the oldest of each (user_id, lower(name)).
--    Re-parent any items pointing at a duplicate to the surviving category first.
WITH ranked AS (
  SELECT id, user_id, lower(name) AS lname,
         row_number() OVER (PARTITION BY user_id, lower(name) ORDER BY created_at ASC, id ASC) AS rn,
         first_value(id) OVER (PARTITION BY user_id, lower(name) ORDER BY created_at ASC, id ASC) AS keeper_id
  FROM public.categories
),
dups AS (SELECT id, keeper_id FROM ranked WHERE rn > 1)
UPDATE public.items i
SET category_id = d.keeper_id
FROM dups d
WHERE i.category_id = d.id;

WITH ranked AS (
  SELECT id,
         row_number() OVER (PARTITION BY user_id, lower(name) ORDER BY created_at ASC, id ASC) AS rn
  FROM public.categories
)
DELETE FROM public.categories c
USING ranked r
WHERE c.id = r.id AND r.rn > 1;

-- 2. Enforce uniqueness going forward (case-insensitive name per user).
CREATE UNIQUE INDEX IF NOT EXISTS categories_user_lower_name_unique
  ON public.categories (user_id, lower(name));

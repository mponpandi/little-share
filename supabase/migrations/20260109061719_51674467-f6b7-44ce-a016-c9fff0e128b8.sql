-- Fix infinite recursion between items <-> requests RLS policies
-- The items SELECT policy checks requests, and the requests policies checked items,
-- creating a cycle. Break the cycle by using a SECURITY DEFINER helper.

-- 1) Helper to fetch an item's donor_id without invoking RLS (runs as function owner)
CREATE OR REPLACE FUNCTION public.item_donor_id(_item_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT donor_id
  FROM public.items
  WHERE id = _item_id
  LIMIT 1;
$$;

-- 2) Replace requests policies that referenced public.items directly
DROP POLICY IF EXISTS "Users can view own requests" ON public.requests;
DROP POLICY IF EXISTS "Request participants can update" ON public.requests;

CREATE POLICY "Users can view own requests"
ON public.requests
FOR SELECT
USING (
  auth.uid() = receiver_id
  OR auth.uid() = public.item_donor_id(item_id)
);

CREATE POLICY "Request participants can update"
ON public.requests
FOR UPDATE
USING (
  auth.uid() = receiver_id
  OR auth.uid() = public.item_donor_id(item_id)
);

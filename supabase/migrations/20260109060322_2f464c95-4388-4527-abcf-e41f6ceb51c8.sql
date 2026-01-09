-- Drop the problematic policy
DROP POLICY IF EXISTS "View available or matched items" ON public.items;

-- Create a simpler policy that avoids infinite recursion
-- Use EXISTS with a direct subquery that doesn't cause circular reference
CREATE POLICY "View available or matched items" 
ON public.items 
FOR SELECT 
USING (
  is_available = true 
  OR auth.uid() = donor_id 
  OR EXISTS (
    SELECT 1 FROM public.requests r 
    WHERE r.item_id = items.id 
    AND r.receiver_id = auth.uid() 
    AND r.status = 'accepted'::request_status
  )
);
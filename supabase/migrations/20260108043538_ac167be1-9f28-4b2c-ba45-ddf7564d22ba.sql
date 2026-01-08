-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Anyone can view available items" ON public.items;

-- Create new policy: Allow viewing items that are available OR where user is donor OR where user has an accepted request
CREATE POLICY "View available or matched items" 
ON public.items 
FOR SELECT 
USING (
  is_available = true 
  OR auth.uid() = donor_id 
  OR auth.uid() IN (
    SELECT receiver_id FROM public.requests 
    WHERE requests.item_id = items.id 
    AND requests.status = 'accepted'
  )
);
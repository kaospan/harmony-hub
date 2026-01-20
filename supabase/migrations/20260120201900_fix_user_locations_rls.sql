-- Fix infinite recursion in user_locations RLS policy
-- by creating a SECURITY DEFINER function that bypasses RLS

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users who share can see others who share" ON public.user_locations;

-- Create a SECURITY DEFINER function to check if current user has sharing enabled
-- This function bypasses RLS to prevent infinite recursion
CREATE OR REPLACE FUNCTION public.user_has_sharing_enabled()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT sharing_enabled 
     FROM public.user_locations 
     WHERE user_id = auth.uid() 
     LIMIT 1),
    false
  );
$$;

-- Recreate the policy using the SECURITY DEFINER function
CREATE POLICY "Users who share can see others who share" ON public.user_locations 
FOR SELECT USING (
  sharing_enabled = true 
  AND public.user_has_sharing_enabled()
);

-- Add comment explaining the function
COMMENT ON FUNCTION public.user_has_sharing_enabled() IS 
'SECURITY DEFINER function to check if the current user has location sharing enabled. Bypasses RLS to prevent infinite recursion in user_locations SELECT policy.';

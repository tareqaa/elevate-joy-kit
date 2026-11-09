-- Security migration: Enable RLS on account_deletion_otps table
-- Resolves Supabase Security Advisory: "RLS Disabled in Public - Table public.account_deletion_otps is public, but RLS has not been enabled"

-- 1. Enable Row Level Security
ALTER TABLE public.account_deletion_otps ENABLE ROW LEVEL SECURITY;

-- 2. Restrict access: Only authenticated users can manage their own OTP records
DROP POLICY IF EXISTS "Users can only access their own deletion OTPs" ON public.account_deletion_otps;
CREATE POLICY "Users can only access their own deletion OTPs"
ON public.account_deletion_otps
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. Explicitly deny all public and anon access
DROP POLICY IF EXISTS "Deny anon public access to account_deletion_otps" ON public.account_deletion_otps;
CREATE POLICY "Deny anon public access to account_deletion_otps"
ON public.account_deletion_otps
FOR ALL
TO anon
USING (false);


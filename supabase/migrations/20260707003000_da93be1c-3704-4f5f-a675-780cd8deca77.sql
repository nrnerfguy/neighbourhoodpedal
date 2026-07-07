
-- 1) Revoke EXECUTE on SECURITY DEFINER trigger functions from client roles.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_open_order_gig() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_rider_on_approval() FROM PUBLIC, anon, authenticated;

-- 2) Explicit deny INSERT/UPDATE/DELETE policies on open_order_gigs, and revoke privileges.
REVOKE INSERT, UPDATE, DELETE ON public.open_order_gigs FROM anon, authenticated;

DROP POLICY IF EXISTS "Deny direct inserts on open_order_gigs" ON public.open_order_gigs;
CREATE POLICY "Deny direct inserts on open_order_gigs"
  ON public.open_order_gigs FOR INSERT TO anon, authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "Deny direct updates on open_order_gigs" ON public.open_order_gigs;
CREATE POLICY "Deny direct updates on open_order_gigs"
  ON public.open_order_gigs FOR UPDATE TO anon, authenticated
  USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "Deny direct deletes on open_order_gigs" ON public.open_order_gigs;
CREATE POLICY "Deny direct deletes on open_order_gigs"
  ON public.open_order_gigs FOR DELETE TO anon, authenticated
  USING (false);

-- 3) Prevent applicants from tampering with review fields on their pending apps.
CREATE OR REPLACE FUNCTION public.rider_applications_guard_review_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Skip guard for admins (they legitimately review applications).
  IF public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'status cannot be modified by applicant';
  END IF;
  IF NEW.admin_notes IS DISTINCT FROM OLD.admin_notes THEN
    RAISE EXCEPTION 'admin_notes cannot be modified by applicant';
  END IF;
  IF NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by THEN
    RAISE EXCEPTION 'reviewed_by cannot be modified by applicant';
  END IF;
  IF NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at THEN
    RAISE EXCEPTION 'reviewed_at cannot be modified by applicant';
  END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'user_id cannot be modified';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rider_applications_guard_review_fields() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS rider_applications_guard_review_fields ON public.rider_applications;
CREATE TRIGGER rider_applications_guard_review_fields
  BEFORE UPDATE ON public.rider_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.rider_applications_guard_review_fields();

-- Remove 'approved' from submissions status check constraint
ALTER TABLE public.submissions
  DROP CONSTRAINT IF EXISTS submissions_status_check;

ALTER TABLE public.submissions
  ADD CONSTRAINT submissions_status_check
  CHECK (status IN ('draft', 'pending', 'rejected', 'sent_to_tr', 'tr_failed'));

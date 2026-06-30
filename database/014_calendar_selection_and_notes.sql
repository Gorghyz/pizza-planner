ALTER TABLE business_calendar_exceptions
  DROP CONSTRAINT IF EXISTS business_calendar_exceptions_status_check;

ALTER TABLE business_calendar_exceptions
  DROP CONSTRAINT IF EXISTS business_calendar_exceptions_times_check;

ALTER TABLE business_calendar_exceptions
  ADD CONSTRAINT business_calendar_exceptions_status_check
    CHECK (status IN ('open', 'closed', 'note'));

ALTER TABLE business_calendar_exceptions
  ADD CONSTRAINT business_calendar_exceptions_times_check
    CHECK (
      status <> 'open'
      OR
      (opens_at IS NOT NULL AND closes_at IS NOT NULL AND opens_at < closes_at)
    );

-- Release candidate only. Not applied to the shared Supabase project.
-- Apply first to an isolated database; approve production separately.
BEGIN;
DROP POLICY IF EXISTS bookings_customer_insert ON public.bookings;
DROP POLICY IF EXISTS bookings_customer_update ON public.bookings;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION public.staff_complete_attendance(p_booking_id uuid, p_km_exit integer, p_exit_notes text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_att public.attendances%rowtype;
begin
 if not public.is_staff() then raise exception 'STAFF_ONLY'; end if;
 perform 1 from public.bookings where id=p_booking_id and status='AWAITING_PICKUP' for update;
 if not found then raise exception 'INVALID_STATUS_TRANSITION'; end if;
 select * into v_att from public.attendances where booking_id=p_booking_id for update;
 if not found then raise exception 'CHECKIN_REQUIRED'; end if;
 if v_att.status <> 'READY' then raise exception 'INVALID_STATUS_TRANSITION'; end if;
 if p_km_exit is null then raise exception 'KM_EXIT_REQUIRED'; end if;
 if p_km_exit < v_att.km_entry then raise exception 'KM_EXIT_BELOW_ENTRY'; end if;
 update public.attendances set status='COMPLETED',km_exit=p_km_exit,exit_notes=nullif(trim(p_exit_notes),''),delivered_at=now(),updated_at=now() where id=v_att.id;
 update public.bookings set status='COMPLETED',updated_at=now() where id=p_booking_id;
end $function$;

CREATE OR REPLACE FUNCTION public.staff_finish_service(p_booking_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_id uuid;
begin
 if not public.is_staff() then raise exception 'STAFF_ONLY'; end if;
 perform 1 from public.bookings where id=p_booking_id and status='IN_SERVICE' for update;
 if not found then raise exception 'INVALID_STATUS_TRANSITION'; end if;
 select id into v_id from public.attendances where booking_id=p_booking_id and status='IN_SERVICE' for update;
 if v_id is null then raise exception 'CHECKIN_REQUIRED'; end if;
 update public.attendances set status='READY',service_finished_at=coalesce(service_finished_at,now()),ready_at=coalesce(ready_at,now()),updated_at=now() where id=v_id;
 update public.bookings set status='AWAITING_PICKUP',updated_at=now() where id=p_booking_id;
end $function$;

CREATE OR REPLACE FUNCTION public.staff_start_service(p_booking_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_id uuid;
begin
 if not public.is_staff() then raise exception 'STAFF_ONLY'; end if;
 perform 1 from public.bookings where id=p_booking_id and status='CUSTOMER_ARRIVED' for update;
 if not found then raise exception 'INVALID_STATUS_TRANSITION'; end if;
 select id into v_id from public.attendances where booking_id=p_booking_id and status='CHECKED_IN' and inspection_completed_at is not null for update;
 if v_id is null then raise exception 'INSPECTION_REQUIRED'; end if;
 update public.attendances set status='IN_SERVICE',service_started_at=coalesce(service_started_at,now()),updated_at=now() where id=v_id;
 update public.bookings set status='IN_SERVICE',updated_at=now() where id=p_booking_id;
end $function$;


-- The management UI and the Data API must enforce the same authorization.
DROP POLICY IF EXISTS payments_staff_write ON public.payments;
CREATE POLICY payments_management ON public.payments FOR ALL TO authenticated
USING (public.is_package_manager()) WITH CHECK (public.is_package_manager());

-- Rescheduling preserves the booked duration and updates box occupancy atomically.
CREATE OR REPLACE FUNCTION public.reschedule_customer_booking(
 p_booking_id uuid, p_new_date date, p_new_start time
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $function$
DECLARE
 v_booking public.bookings%rowtype;
 v_duration integer;
 v_end time;
 v_unit uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
 SELECT * INTO v_booking FROM public.bookings WHERE id=p_booking_id FOR UPDATE;
 IF NOT FOUND OR NOT EXISTS (
  SELECT 1 FROM public.customers WHERE id=v_booking.customer_id AND profile_id=auth.uid() AND active
 ) THEN RAISE EXCEPTION 'BOOKING_NOT_ALLOWED'; END IF;
 IF v_booking.status NOT IN ('REQUESTED','CONFIRMED','RESCHEDULED') THEN
  RAISE EXCEPTION 'BOOKING_CANNOT_BE_RESCHEDULED';
 END IF;
 IF p_new_date IS NULL OR p_new_start IS NULL OR
  (p_new_date+p_new_start) <= (now() AT TIME ZONE 'America/Sao_Paulo') THEN
  RAISE EXCEPTION 'INVALID_BOOKING_DATE';
 END IF;
 SELECT sum(historical_duration_minutes*quantity)::integer INTO v_duration
 FROM public.booking_items WHERE booking_id=p_booking_id;
 IF v_duration IS NULL THEN RAISE EXCEPTION 'BOOKING_CONFIGURATION_INVALID'; END IF;
 SELECT id INTO v_unit FROM public.units WHERE active ORDER BY created_at LIMIT 1;
 IF v_unit IS NULL THEN RAISE EXCEPTION 'UNIT_NOT_CONFIGURED'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(v_unit::text||':'||p_new_date::text,0));
 v_end:=public.calculate_booking_end_v2(p_new_date,p_new_start,v_duration);
 IF v_end IS NULL THEN RAISE EXCEPTION 'TIME_OUTSIDE_AVAILABLE_HOURS'; END IF;
 IF EXISTS (
  SELECT 1 FROM public.calendar_blocks WHERE unit_id=v_unit
  AND starts_at<((p_new_date+v_end) AT TIME ZONE 'America/Sao_Paulo')
  AND ends_at>((p_new_date+p_new_start) AT TIME ZONE 'America/Sao_Paulo')
 ) THEN RAISE EXCEPTION 'TIME_BLOCKED'; END IF;
 IF EXISTS (
  SELECT 1 FROM public.bookings WHERE id<>p_booking_id AND booking_date=p_new_date
  AND status NOT IN ('CANCELLED','NO_SHOW') AND start_time<v_end AND end_time>p_new_start
 ) THEN RAISE EXCEPTION 'TIME_UNAVAILABLE'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.booking_resources WHERE booking_id=p_booking_id) THEN
  RAISE EXCEPTION 'BOOKING_CONFIGURATION_INVALID';
 END IF;
 UPDATE public.booking_resources SET
  start_at=(p_new_date+p_new_start) AT TIME ZONE 'America/Sao_Paulo',
  end_at=(p_new_date+v_end) AT TIME ZONE 'America/Sao_Paulo'
 WHERE booking_id=p_booking_id;
 UPDATE public.bookings SET booking_date=p_new_date,start_time=p_new_start,
  end_time=v_end,status='REQUESTED',updated_at=now() WHERE id=p_booking_id;
 RETURN p_booking_id;
END $function$;
REVOKE EXECUTE ON FUNCTION public.reschedule_customer_booking(uuid,date,time) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reschedule_customer_booking(uuid,date,time) TO authenticated;
COMMIT;

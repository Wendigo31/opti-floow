-- Fiches de paie (même écran qu'OptiFret) : RH prépare, Comptabilité / Direction valident.
create table if not exists public.payslips (
  id uuid primary key default gen_random_uuid(),
  license_id uuid not null,
  driver_id text,
  employee_name text not null,
  employee_job text,
  employee_classification text,
  period text not null check (period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  input jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  gross numeric(12,2) not null default 0,
  net_to_pay numeric(12,2) not null default 0,
  employer_cost numeric(12,2) not null default 0,
  status text not null default 'draft' check (status in ('draft', 'validated')),
  validated_at timestamptz,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists payslips_unique_driver_period on public.payslips (license_id, driver_id, period) where driver_id is not null;
create index if not exists payslips_license_period on public.payslips (license_id, period desc);
alter table public.payslips enable row level security;
drop policy if exists payslips_rw on public.payslips;
drop policy if exists payslips_delete_draft on public.payslips;
drop policy if exists payslips_insert on public.payslips;
drop policy if exists payslips_update on public.payslips;
create policy payslips_rw on public.payslips for select to authenticated
  using (license_id = get_user_license_id(auth.uid()));
create policy payslips_insert on public.payslips for insert to authenticated
  with check (license_id = get_user_license_id(auth.uid()));
create policy payslips_update on public.payslips for update to authenticated
  using (license_id = get_user_license_id(auth.uid()))
  with check (license_id = get_user_license_id(auth.uid()));
create policy payslips_delete_draft on public.payslips for delete to authenticated
  using (status = 'draft' and license_id = get_user_license_id(auth.uid()));
grant select, insert, update, delete on public.payslips to authenticated;

create table if not exists public.payroll_settings (
  license_id uuid primary key,
  rates jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.payroll_settings enable row level security;
drop policy if exists payroll_settings_rw on public.payroll_settings;
create policy payroll_settings_rw on public.payroll_settings for all to authenticated
  using (license_id = get_user_license_id(auth.uid()))
  with check (license_id = get_user_license_id(auth.uid()));
grant select, insert, update, delete on public.payroll_settings to authenticated;

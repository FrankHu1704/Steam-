-- Self-service applications for the collaborator/recruiter program — the
-- admin shares a public link (/colaborador/candidatura); applicants fill in
-- their own details instead of the admin typing them in. Still admin-gated:
-- approving an application is what actually provisions the account (see
-- lib/actions/employee-applications.ts -> provisionEmployeeAccount).
create table employee_applications (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text not null,
  bi_number text not null,
  address text not null,
  city text not null,
  province text not null,
  mpesa_number text,
  emola_number text,
  message text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  rejection_reason text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_employee_id uuid references employees(id),
  created_at timestamptz not null default now()
);

create index employee_applications_status_idx on employee_applications (status, created_at);

-- No policies: only the service-role client (admin actions) reads/writes
-- this table, matching how the public application form and admin review
-- are both implemented as server actions, never direct client queries.
alter table employee_applications enable row level security;

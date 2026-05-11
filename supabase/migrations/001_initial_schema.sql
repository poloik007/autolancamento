-- AutoLançamento — Schema inicial
-- Supabase / PostgreSQL

create extension if not exists "uuid-ossp";

-- ============================================================
-- USERS
-- ============================================================
create table public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null unique,
  full_name   text,
  avatar_url  text,
  role        text not null default 'client' check (role in ('admin', 'client')),
  is_active   boolean not null default true,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "users_select_own" on public.users
  for select using (auth.uid() = id);

create policy "users_select_admin" on public.users
  for select using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );

create policy "users_update_admin" on public.users
  for update using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );

create policy "users_insert_service" on public.users
  for insert with check (true);

-- ============================================================
-- COMPANIES (espelho do TR Domínio Web)
-- ============================================================
create table public.companies (
  id             uuid primary key default uuid_generate_v4(),
  tr_company_id  text not null unique,
  name           text not null,
  cnpj           text,
  is_active      boolean not null default true,
  synced_at      timestamptz not null default now(),
  created_at     timestamptz not null default now()
);

-- ============================================================
-- CLIENT_COMPANY_ACCESS
-- ============================================================
create table public.client_company_access (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.users(id) on delete cascade,
  company_id  uuid not null references public.companies(id) on delete cascade,
  is_active   boolean not null default true,
  granted_by  uuid references public.users(id),
  granted_at  timestamptz not null default now(),
  unique (user_id, company_id)
);

alter table public.client_company_access enable row level security;

create policy "access_all_admin" on public.client_company_access
  for all using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );

create policy "access_select_own" on public.client_company_access
  for select using (auth.uid() = user_id);

-- ============================================================
-- SUBMISSIONS
-- ============================================================
create table public.submissions (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.users(id),
  company_id      uuid not null references public.companies(id),
  status          text not null default 'draft' check (status in (
                    'draft', 'pending', 'approved', 'rejected', 'sent_to_tr', 'tr_failed'
                  )),
  pdf_path        text not null,
  pdf_filename    text not null,
  pdf_type        text check (pdf_type in ('digital', 'scanned')),
  statement_type  text check (statement_type in ('debit', 'credit', 'both')),
  period_start    date,
  period_end      date,
  rejection_note  text,
  tr_response     jsonb,
  tr_sent_at      timestamptz,
  reviewed_by     uuid references public.users(id),
  reviewed_at     timestamptz,
  submitted_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.submissions enable row level security;

create policy "submissions_own_client" on public.submissions
  for all using (auth.uid() = user_id);

create policy "submissions_all_admin" on public.submissions
  for all using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );

-- ============================================================
-- SUBMISSION_TRANSACTIONS
-- ============================================================
create table public.submission_transactions (
  id               uuid primary key default uuid_generate_v4(),
  submission_id    uuid not null references public.submissions(id) on delete cascade,
  transaction_date date not null,
  description      text not null,
  amount           numeric(15,2) not null,
  transaction_type text not null check (transaction_type in ('debit', 'credit')),
  balance          numeric(15,2),
  document_number  text,
  raw_text         text,
  is_edited        boolean not null default false,
  sort_order       int not null default 0,
  created_at       timestamptz not null default now()
);

alter table public.submission_transactions enable row level security;

create policy "transactions_follow_submission" on public.submission_transactions
  for all using (
    exists (
      select 1 from public.submissions s
      where s.id = submission_id
        and (
          s.user_id = auth.uid()
          or exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
        )
    )
  );

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
create table public.notifications (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references public.users(id) on delete cascade,
  type           text not null check (type in (
                   'submission_pending',
                   'submission_rejected',
                   'submission_approved',
                   'submission_sent'
                 )),
  submission_id  uuid references public.submissions(id) on delete set null,
  message        text not null,
  is_read        boolean not null default false,
  created_at     timestamptz not null default now()
);

alter table public.notifications enable row level security;

create policy "notifications_select_own" on public.notifications
  for select using (auth.uid() = user_id);

create policy "notifications_update_own" on public.notifications
  for update using (auth.uid() = user_id);

create policy "notifications_insert_service" on public.notifications
  for insert with check (true);

-- ============================================================
-- AUDIT_LOG
-- ============================================================
create table public.audit_log (
  id           uuid primary key default uuid_generate_v4(),
  actor_id     uuid references public.users(id),
  action       text not null,
  entity_type  text,
  entity_id    uuid,
  metadata     jsonb,
  created_at   timestamptz not null default now()
);

alter table public.audit_log enable row level security;

create policy "audit_select_admin" on public.audit_log
  for select using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );

create policy "audit_insert_service" on public.audit_log
  for insert with check (true);

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_submissions_user_id on public.submissions(user_id);
create index idx_submissions_company_id on public.submissions(company_id);
create index idx_submissions_status on public.submissions(status);
create index idx_submission_transactions_submission_id on public.submission_transactions(submission_id);
create index idx_notifications_user_unread on public.notifications(user_id) where is_read = false;
create index idx_client_company_access_user on public.client_company_access(user_id) where is_active = true;
create index idx_audit_log_entity on public.audit_log(entity_type, entity_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_users_updated_at
  before update on public.users
  for each row execute procedure public.set_updated_at();

create trigger set_submissions_updated_at
  before update on public.submissions
  for each row execute procedure public.set_updated_at();

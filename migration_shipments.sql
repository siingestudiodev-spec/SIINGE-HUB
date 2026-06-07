create table if not exists project_shipments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade not null,
  carrier text,
  tracking_number text not null,
  description text,
  created_at timestamptz default now()
);

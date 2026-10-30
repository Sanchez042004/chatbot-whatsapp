-- Enable pgvector extension
create extension if not exists vector;

-- Create documents table for the gym's RAG context
create table if not exists documents (
  id bigint primary key generated always as identity,
  content text not null,
  embedding vector(3072) not null
);

-- Enable Row Level Security (RLS)
alter table documents enable row level security;

-- Policy: Allow read access to anyone (for matching documents)
create policy if not exists "Allow read access to documents"
  on documents for select
  using (true);

-- Policy: Allow service role / anon write access for seeding (can be restricted to service_role in production)
create policy if not exists "Allow insert and delete for seeding"
  on documents for all
  using (true)
  with check (true);

-- Create a similarity search function (Cosine Similarity)
create or replace function match_documents (
  query_embedding vector(3072),
  match_threshold float,
  match_count int
)
returns table (
  id bigint,
  content text,
  similarity float
)
language sql stable
as $$
  select
    documents.id,
    documents.content,
    1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where 1 - (documents.embedding <=> query_embedding) > match_threshold
  order by documents.embedding <=> query_embedding
  limit match_count;
$$;


-- Create bookings table for gym appointments, free passes, and classes
create table if not exists bookings (
  id bigint primary key generated always as identity,
  phone text not null,
  name text not null,
  service_type text not null,
  booking_date text not null,
  booking_time text,
  notes text,
  status text default 'confirmed',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table bookings enable row level security;

-- Policy: Allow read and insert access
create policy if not exists "Allow read access to bookings"
  on bookings for select
  using (true);

create policy if not exists "Allow insert access to bookings"
  on bookings for insert
  with check (true);

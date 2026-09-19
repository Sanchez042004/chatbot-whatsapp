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

-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- Add embedding column to candidates table if it doesn't exist
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'candidates' and column_name = 'embedding') then
    alter table candidates add column embedding vector(1536);
  end if;
end $$;

-- Create a function to match candidates by embedding similarity
create or replace function match_candidates (
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    candidates.id,
    1 - (candidates.embedding <=> query_embedding) as similarity
  from candidates
  where 1 - (candidates.embedding <=> query_embedding) > match_threshold
  order by candidates.embedding <=> query_embedding
  limit match_count;
end;
$$;

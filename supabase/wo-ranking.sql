create table public.wo_scores (
  id text primary key check (char_length(id) between 8 and 100),
  name text not null check (char_length(name) between 1 and 20 and name = btrim(name) and name !~ '[[:cntrl:]]'),
  score integer not null check (score between 0 and 1000000),
  mode text not null check (mode in ('solo','versus')),
  character text not null check (character in ('angel','primitivo','peluche','tren','linares','gabriel','fernando')),
  created_at bigint not null default (extract(epoch from clock_timestamp()) * 1000)::bigint
);
create index wo_scores_ranking_order on public.wo_scores (score desc, created_at asc, id asc);
alter table public.wo_scores enable row level security;
revoke all on public.wo_scores from public, anon, authenticated;
grant select on public.wo_scores to anon;
grant insert (id,name,score,mode,character) on public.wo_scores to anon;
create policy wo_scores_public_read on public.wo_scores for select to anon using (true);
create policy wo_scores_submit on public.wo_scores for insert to anon with check (
  score between 0 and 1000000 and char_length(name) between 1 and 20
  and mode in ('solo','versus') and character in ('angel','primitivo','peluche','tren','linares','gabriel','fernando')
);
notify pgrst, 'reload schema';

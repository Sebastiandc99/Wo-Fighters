alter table public.wo_scores drop constraint wo_scores_character_check;
alter table public.wo_scores add constraint wo_scores_character_check
check (character in ('angel','primitivo','peluche','tren','linares','gabriel','fernando','german','matias'));
alter policy wo_scores_submit on public.wo_scores with check (
 score between 0 and 1000000 and char_length(name) between 1 and 20
 and mode in ('solo','versus') and character in ('angel','primitivo','peluche','tren','linares','gabriel','fernando','german','matias')
);
notify pgrst, 'reload schema';

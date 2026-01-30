alter table candidates add column if not exists file_hash text;

create unique index if not exists candidates_file_hash_uidx on candidates (file_hash)
where file_hash is not null;

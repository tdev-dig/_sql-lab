-- ============================================================
-- ÉTAPE SUPABASE — Fonction run_sql
-- À exécuter dans l'éditeur SQL de Supabase
-- Elle permet à l'API d'exécuter les requêtes des apprenants
-- ============================================================

create or replace function run_sql(query text)
returns json
language plpgsql
security definer
as $$
declare
  result json;
begin
  execute 'select json_agg(t) from (' || query || ') t' into result;
  return coalesce(result, '[]'::json);
exception when others then
  raise exception '%', sqlerrm;
end;
$$;

-- Donner accès à cette fonction via l'API Supabase
grant execute on function run_sql(text) to service_role;

-- ============================================================
-- IMPORTANT : RLS (Row Level Security)
-- Pour que l'API puisse lire/écrire librement avec service_role,
-- on désactive RLS sur les tables du labo.
-- Tu pourras l'activer plus tard avec des policies fines.
-- ============================================================

alter table classes     disable row level security;
alter table users       disable row level security;
alter table modules     disable row level security;
alter table exercises   disable row level security;
alter table submissions disable row level security;
alter table clients     disable row level security;
alter table produits    disable row level security;
alter table commandes   disable row level security;

begin;

create table public.product_units (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint product_units_name_not_blank check (length(btrim(name)) > 0)
);

create unique index product_units_name_key on public.product_units (name);

insert into public.product_units (name)
select distinct btrim(products.unit)
from public.products
where length(btrim(products.unit)) > 0
on conflict (name) do nothing;

insert into public.product_units (name)
values
    ('台斤'),
    ('公斤')
on conflict (name) do nothing;

alter table public.products drop constraint if exists products_unit_check;
alter table public.products add constraint products_unit_not_blank check (length(btrim(unit)) > 0);

create or replace function public.trg_products_validate_unit()
returns trigger
language plpgsql
as $$
begin
    new.unit = btrim(new.unit);

    if length(new.unit) = 0 then
        raise exception 'Product unit is required';
    end if;

    perform 1
    from public.product_units
    where name = new.unit;

    if not found then
        raise exception 'Product unit % not found', new.unit;
    end if;

    return new;
end;
$$;

update public.products
set unit = btrim(unit)
where unit <> btrim(unit);

create trigger trg_products_validate_unit
before insert or update of unit on public.products
for each row
execute function public.trg_products_validate_unit();

create trigger set_product_units_updated_at
before update on public.product_units
for each row
execute function public.set_updated_at();

alter table public.customers add column address text;

create table public.suppliers (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    phone text,
    address text,
    note text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint suppliers_name_not_blank check (length(btrim(name)) > 0)
);

create unique index suppliers_name_key on public.suppliers (name);
create index suppliers_phone_idx on public.suppliers (phone);

create trigger set_suppliers_updated_at
before update on public.suppliers
for each row
execute function public.set_updated_at();

alter table public.inbounds
add column supplier_id uuid references public.suppliers(id) on delete restrict;

create index inbounds_supplier_date_idx on public.inbounds (supplier_id, inbound_date desc);

alter table public.product_units enable row level security;
alter table public.suppliers enable row level security;

create policy product_units_select_staff
on public.product_units
for select
to authenticated
using ((select public.is_active_staff()));

create policy product_units_insert_staff
on public.product_units
for insert
to authenticated
with check ((select public.has_role(array['admin', 'operator']::public.app_role[])));

create policy suppliers_select_staff
on public.suppliers
for select
to authenticated
using ((select public.is_active_staff()));

create policy suppliers_insert_staff
on public.suppliers
for insert
to authenticated
with check ((select public.has_role(array['admin', 'operator']::public.app_role[])));

create policy suppliers_update_staff
on public.suppliers
for update
to authenticated
using ((select public.has_role(array['admin', 'operator']::public.app_role[])))
with check ((select public.has_role(array['admin', 'operator']::public.app_role[])));

create policy suppliers_delete_staff
on public.suppliers
for delete
to authenticated
using ((select public.has_role(array['admin', 'operator']::public.app_role[])));

grant select, insert on table public.product_units to authenticated;
grant select, insert, update, delete on table public.suppliers to authenticated;

drop function if exists public.create_inbound_record(uuid, numeric, numeric, timestamptz, text);

create or replace function public.create_inbound_record(
    p_product_id uuid,
    p_supplier_id uuid,
    p_quantity numeric(14, 3),
    p_unit_cost numeric(12, 2),
    p_inbound_date timestamptz default now(),
    p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    v_inbound_id uuid;
begin
    perform public.require_role(array['admin', 'operator']::public.app_role[]);

    if p_product_id is null then
        raise exception 'Product is required';
    end if;

    if p_supplier_id is null then
        raise exception 'Supplier is required';
    end if;

    if p_quantity is null or p_quantity <= 0 then
        raise exception 'Inbound quantity must be greater than 0';
    end if;

    if p_unit_cost is null or p_unit_cost < 0 then
        raise exception 'Inbound unit cost must be 0 or greater';
    end if;

    perform 1
    from public.products
    where id = p_product_id;

    if not found then
        raise exception 'Product % not found', p_product_id;
    end if;

    perform 1
    from public.suppliers
    where id = p_supplier_id;

    if not found then
        raise exception 'Supplier % not found', p_supplier_id;
    end if;

    insert into public.inbounds (
        product_id,
        supplier_id,
        quantity,
        unit_cost,
        inbound_date,
        note
    )
    values (
        p_product_id,
        p_supplier_id,
        p_quantity,
        p_unit_cost,
        coalesce(p_inbound_date, now()),
        nullif(btrim(coalesce(p_note, '')), '')
    )
    returning id into v_inbound_id;

    return v_inbound_id;
end;
$$;

revoke all on function public.create_inbound_record(uuid, uuid, numeric, numeric, timestamptz, text) from public;
grant execute on function public.create_inbound_record(uuid, uuid, numeric, numeric, timestamptz, text) to authenticated, service_role;

commit;
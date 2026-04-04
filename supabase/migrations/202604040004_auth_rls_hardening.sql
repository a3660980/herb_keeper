begin;

create type public.app_role as enum ('admin', 'operator', 'viewer');

create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    email text not null unique,
    full_name text,
    role public.app_role not null default 'operator',
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles (role);
create index profiles_is_active_idx on public.profiles (is_active);

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create or replace function public.trg_sync_profile_from_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_role public.app_role;
    v_email text;
    v_full_name text;
begin
    v_email := coalesce(new.email, concat(new.id::text, '@local.invalid'));
    v_full_name := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');

    if tg_op = 'INSERT' then
        v_role := case
            when exists (select 1 from public.profiles) then 'operator'
            else 'admin'
        end;

        insert into public.profiles (
            id,
            email,
            full_name,
            role
        )
        values (
            new.id,
            v_email,
            coalesce(v_full_name, split_part(v_email, '@', 1)),
            v_role
        )
        on conflict (id) do update
        set email = excluded.email,
            full_name = coalesce(excluded.full_name, public.profiles.full_name);

        return new;
    end if;

    update public.profiles
    set email = v_email,
        full_name = coalesce(v_full_name, public.profiles.full_name)
    where id = new.id;

    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.trg_sync_profile_from_auth_user();

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
after update of email, raw_user_meta_data on auth.users
for each row
execute function public.trg_sync_profile_from_auth_user();

create or replace function public.is_active_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select coalesce((
        select is_active
        from public.profiles
        where id = (select auth.uid())
    ), false);
$$;

create or replace function public.has_role(allowed_roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select coalesce((
        select is_active and role = any(allowed_roles)
        from public.profiles
        where id = (select auth.uid())
    ), false);
$$;

create or replace function public.current_profile_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
    select role
    from public.profiles
    where id = (select auth.uid())
      and is_active
    limit 1;
$$;

create or replace function public.require_role(allowed_roles public.app_role[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    if (select auth.uid()) is null then
        raise exception 'Authentication required';
    end if;

    if not (select public.has_role(allowed_roles)) then
        raise exception 'Insufficient privileges';
    end if;
end;
$$;

revoke all on function public.is_active_staff() from public;
grant execute on function public.is_active_staff() to authenticated, service_role;

revoke all on function public.has_role(public.app_role[]) from public;
grant execute on function public.has_role(public.app_role[]) to authenticated, service_role;

revoke all on function public.current_profile_role() from public;
grant execute on function public.current_profile_role() to authenticated, service_role;

revoke all on function public.require_role(public.app_role[]) from public;
grant execute on function public.require_role(public.app_role[]) to authenticated, service_role;

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.customers enable row level security;
alter table public.inbounds enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.shipments enable row level security;
alter table public.shipment_items enable row level security;
alter table public.direct_sales enable row level security;
alter table public.direct_sale_items enable row level security;
alter table public.inventory_ledger enable row level security;

create policy profiles_select_own
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy products_select_staff
on public.products
for select
to authenticated
using ((select public.is_active_staff()));

create policy products_insert_staff
on public.products
for insert
to authenticated
with check ((select public.has_role(array['admin', 'operator']::public.app_role[])));

create policy products_update_staff
on public.products
for update
to authenticated
using ((select public.has_role(array['admin', 'operator']::public.app_role[])))
with check ((select public.has_role(array['admin', 'operator']::public.app_role[])));

create policy products_delete_staff
on public.products
for delete
to authenticated
using ((select public.has_role(array['admin', 'operator']::public.app_role[])));

create policy customers_select_staff
on public.customers
for select
to authenticated
using ((select public.is_active_staff()));

create policy customers_insert_staff
on public.customers
for insert
to authenticated
with check ((select public.has_role(array['admin', 'operator']::public.app_role[])));

create policy customers_update_staff
on public.customers
for update
to authenticated
using ((select public.has_role(array['admin', 'operator']::public.app_role[])))
with check ((select public.has_role(array['admin', 'operator']::public.app_role[])));

create policy customers_delete_staff
on public.customers
for delete
to authenticated
using ((select public.has_role(array['admin', 'operator']::public.app_role[])));

create policy inbounds_select_staff
on public.inbounds
for select
to authenticated
using ((select public.is_active_staff()));

create policy orders_select_staff
on public.orders
for select
to authenticated
using ((select public.is_active_staff()));

create policy order_items_select_staff
on public.order_items
for select
to authenticated
using ((select public.is_active_staff()));

create policy shipments_select_staff
on public.shipments
for select
to authenticated
using ((select public.is_active_staff()));

create policy shipment_items_select_staff
on public.shipment_items
for select
to authenticated
using ((select public.is_active_staff()));

create policy direct_sales_select_staff
on public.direct_sales
for select
to authenticated
using ((select public.is_active_staff()));

create policy direct_sale_items_select_staff
on public.direct_sale_items
for select
to authenticated
using ((select public.is_active_staff()));

create policy inventory_ledger_select_staff
on public.inventory_ledger
for select
to authenticated
using ((select public.is_active_staff()));

grant usage on schema public to authenticated;

revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;

grant select on table public.profiles to authenticated;
grant select, insert, update, delete on table public.products, public.customers to authenticated;
grant select on table
    public.inbounds,
    public.orders,
    public.order_items,
    public.shipments,
    public.shipment_items,
    public.direct_sales,
    public.direct_sale_items,
    public.inventory_ledger
to authenticated;

grant select on table
    public.current_inventory_view,
    public.order_fulfillment_view,
    public.transaction_history_view,
    public.sales_summary_daily_view,
    public.sales_summary_monthly_view,
    public.top_selling_products_view
to authenticated;

alter view public.current_inventory_view set (security_invoker = true);
alter view public.order_fulfillment_view set (security_invoker = true);
alter view public.transaction_history_view set (security_invoker = true);
alter view public.sales_summary_daily_view set (security_invoker = true);
alter view public.sales_summary_monthly_view set (security_invoker = true);
alter view public.top_selling_products_view set (security_invoker = true);

create or replace function public.create_order_with_items(
    p_customer_id uuid,
    p_order_date timestamptz default now(),
    p_note text default null,
    p_items jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    v_order_id uuid;
    v_item jsonb;
    v_product_id uuid;
    v_ordered_quantity numeric(14, 3);
    v_final_unit_price numeric(12, 2);
    v_base_unit_price numeric(12, 2);
    v_discount_rate numeric(6, 4);
begin
    perform public.require_role(array['admin', 'operator']::public.app_role[]);

    if p_customer_id is null then
        raise exception 'Customer is required';
    end if;

    if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
        raise exception 'At least one order item is required';
    end if;

    if exists (
        select 1
        from (
            select item ->> 'product_id' as product_id, count(*)
            from jsonb_array_elements(p_items) item
            group by item ->> 'product_id'
            having count(*) > 1
        ) duplicated_items
    ) then
        raise exception 'Duplicate products are not allowed in one order';
    end if;

    select discount_rate
    into v_discount_rate
    from public.customers
    where id = p_customer_id;

    if v_discount_rate is null then
        raise exception 'Customer % not found', p_customer_id;
    end if;

    insert into public.orders (
        customer_id,
        order_date,
        note
    )
    values (
        p_customer_id,
        coalesce(p_order_date, now()),
        nullif(btrim(coalesce(p_note, '')), '')
    )
    returning id into v_order_id;

    for v_item in
        select * from jsonb_array_elements(p_items)
    loop
        v_product_id := nullif(v_item ->> 'product_id', '')::uuid;
        v_ordered_quantity := nullif(v_item ->> 'ordered_quantity', '')::numeric;
        v_final_unit_price := nullif(v_item ->> 'final_unit_price', '')::numeric;

        if v_product_id is null then
            raise exception 'Product is required for each order item';
        end if;

        if v_ordered_quantity is null or v_ordered_quantity <= 0 then
            raise exception 'Ordered quantity must be greater than 0';
        end if;

        if v_final_unit_price is null or v_final_unit_price < 0 then
            raise exception 'Final unit price must be 0 or greater';
        end if;

        select base_price
        into v_base_unit_price
        from public.products
        where id = v_product_id;

        if v_base_unit_price is null then
            raise exception 'Product % not found', v_product_id;
        end if;

        insert into public.order_items (
            order_id,
            product_id,
            ordered_quantity,
            base_unit_price,
            discount_rate_applied,
            final_unit_price
        )
        values (
            v_order_id,
            v_product_id,
            v_ordered_quantity,
            v_base_unit_price,
            v_discount_rate,
            v_final_unit_price
        );
    end loop;

    perform public.fn_refresh_order_status(v_order_id);

    return v_order_id;
end;
$$;

revoke all on function public.create_order_with_items(uuid, timestamptz, text, jsonb) from public;
grant execute on function public.create_order_with_items(uuid, timestamptz, text, jsonb) to authenticated, service_role;

create or replace function public.create_shipment_with_items(
    p_order_id uuid,
    p_shipment_date timestamptz default now(),
    p_note text default null,
    p_items jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    v_shipment_id uuid;
    v_item jsonb;
    v_order_item_id uuid;
    v_item_order_id uuid;
    v_shipped_quantity numeric(14, 3);
begin
    perform public.require_role(array['admin', 'operator']::public.app_role[]);

    if p_order_id is null then
        raise exception 'Order is required';
    end if;

    if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
        raise exception 'At least one shipment item quantity must be greater than 0';
    end if;

    if exists (
        select 1
        from (
            select item ->> 'order_item_id' as order_item_id, count(*)
            from jsonb_array_elements(p_items) item
            group by item ->> 'order_item_id'
            having count(*) > 1
        ) duplicated_items
    ) then
        raise exception 'Duplicate order items are not allowed in one shipment';
    end if;

    perform 1
    from public.orders
    where id = p_order_id;

    if not found then
        raise exception 'Order % not found', p_order_id;
    end if;

    insert into public.shipments (
        order_id,
        shipment_date,
        note
    )
    values (
        p_order_id,
        coalesce(p_shipment_date, now()),
        nullif(btrim(coalesce(p_note, '')), '')
    )
    returning id into v_shipment_id;

    for v_item in
        select * from jsonb_array_elements(p_items)
    loop
        v_order_item_id := nullif(v_item ->> 'order_item_id', '')::uuid;
        v_shipped_quantity := nullif(v_item ->> 'shipped_quantity', '')::numeric;

        if v_order_item_id is null then
            raise exception 'Order item is required for each shipment line';
        end if;

        if v_shipped_quantity is null or v_shipped_quantity <= 0 then
            continue;
        end if;

        select order_id
        into v_item_order_id
        from public.order_items
        where id = v_order_item_id;

        if v_item_order_id is null then
            raise exception 'Order item % not found', v_order_item_id;
        end if;

        if v_item_order_id <> p_order_id then
            raise exception 'Order item % does not belong to order %', v_order_item_id, p_order_id;
        end if;

        insert into public.shipment_items (
            shipment_id,
            order_item_id,
            shipped_quantity
        )
        values (
            v_shipment_id,
            v_order_item_id,
            v_shipped_quantity
        );
    end loop;

    if not exists (
        select 1
        from public.shipment_items
        where shipment_id = v_shipment_id
    ) then
        raise exception 'At least one shipment item quantity must be greater than 0';
    end if;

    return v_shipment_id;
end;
$$;

revoke all on function public.create_shipment_with_items(uuid, timestamptz, text, jsonb) from public;
grant execute on function public.create_shipment_with_items(uuid, timestamptz, text, jsonb) to authenticated, service_role;

create or replace function public.create_direct_sale_with_items(
    p_customer_id uuid,
    p_sale_date timestamptz default now(),
    p_note text default null,
    p_items jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    v_direct_sale_id uuid;
    v_item jsonb;
    v_product_id uuid;
    v_quantity numeric(14, 3);
    v_final_unit_price numeric(12, 2);
    v_base_unit_price numeric(12, 2);
    v_discount_rate numeric(6, 4);
begin
    perform public.require_role(array['admin', 'operator']::public.app_role[]);

    if p_customer_id is null then
        raise exception 'Customer is required';
    end if;

    if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
        raise exception 'At least one direct sale item is required';
    end if;

    if exists (
        select 1
        from (
            select item ->> 'product_id' as product_id, count(*)
            from jsonb_array_elements(p_items) item
            group by item ->> 'product_id'
            having count(*) > 1
        ) duplicated_items
    ) then
        raise exception 'Duplicate products are not allowed in one direct sale';
    end if;

    select discount_rate
    into v_discount_rate
    from public.customers
    where id = p_customer_id;

    if v_discount_rate is null then
        raise exception 'Customer % not found', p_customer_id;
    end if;

    insert into public.direct_sales (
        customer_id,
        sale_date,
        note
    )
    values (
        p_customer_id,
        coalesce(p_sale_date, now()),
        nullif(btrim(coalesce(p_note, '')), '')
    )
    returning id into v_direct_sale_id;

    for v_item in
        select * from jsonb_array_elements(p_items)
    loop
        v_product_id := nullif(v_item ->> 'product_id', '')::uuid;
        v_quantity := nullif(v_item ->> 'quantity', '')::numeric;
        v_final_unit_price := nullif(v_item ->> 'final_unit_price', '')::numeric;

        if v_product_id is null then
            raise exception 'Product is required for each direct sale item';
        end if;

        if v_quantity is null or v_quantity <= 0 then
            raise exception 'Direct sale quantity must be greater than 0';
        end if;

        if v_final_unit_price is null or v_final_unit_price < 0 then
            raise exception 'Final unit price must be 0 or greater';
        end if;

        select base_price
        into v_base_unit_price
        from public.products
        where id = v_product_id;

        if v_base_unit_price is null then
            raise exception 'Product % not found', v_product_id;
        end if;

        insert into public.direct_sale_items (
            direct_sale_id,
            product_id,
            quantity,
            base_unit_price,
            discount_rate_applied,
            final_unit_price
        )
        values (
            v_direct_sale_id,
            v_product_id,
            v_quantity,
            v_base_unit_price,
            v_discount_rate,
            v_final_unit_price
        );
    end loop;

    return v_direct_sale_id;
end;
$$;

revoke all on function public.create_direct_sale_with_items(uuid, timestamptz, text, jsonb) from public;
grant execute on function public.create_direct_sale_with_items(uuid, timestamptz, text, jsonb) to authenticated, service_role;

commit;
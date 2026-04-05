begin;

create type public.inventory_adjustment_reason as enum (
    'damage',
    'quality_return',
    'disaster',
    'other'
);

create table public.inventory_adjustments (
    id uuid primary key default gen_random_uuid(),
    product_id uuid not null references public.products(id) on delete restrict,
    quantity numeric(14, 3) not null check (quantity > 0),
    reason public.inventory_adjustment_reason not null,
    occurred_at timestamptz not null default now(),
    unit_cost_snapshot numeric(12, 2) not null check (unit_cost_snapshot >= 0),
    note text,
    created_at timestamptz not null default now()
);

create index inventory_adjustments_product_occurred_idx
    on public.inventory_adjustments (product_id, occurred_at desc);

create index inventory_adjustments_reason_occurred_idx
    on public.inventory_adjustments (reason, occurred_at desc);

create or replace function public.trg_inventory_adjustments_prepare()
returns trigger
language plpgsql
as $$
declare
    v_stock_quantity numeric(14, 3);
    v_avg_unit_cost numeric(12, 2);
begin
    new.note = nullif(btrim(coalesce(new.note, '')), '');

    if new.quantity is null or new.quantity <= 0 then
        raise exception 'Adjustment quantity must be greater than 0';
    end if;

    select stock_quantity, avg_unit_cost
    into v_stock_quantity, v_avg_unit_cost
    from public.products
    where id = new.product_id
    for update;

    if not found then
        raise exception 'Product % not found for inventory adjustment', new.product_id;
    end if;

    if v_stock_quantity < new.quantity then
        raise exception 'Insufficient stock for inventory adjustment. Available %, requested %', v_stock_quantity, new.quantity;
    end if;

    new.unit_cost_snapshot = coalesce(new.unit_cost_snapshot, v_avg_unit_cost, 0);

    return new;
end;
$$;

create or replace function public.trg_inventory_adjustments_write_ledger()
returns trigger
language plpgsql
as $$
declare
    v_reason_label text;
    v_note text;
begin
    v_reason_label = case new.reason
        when 'damage' then '品質毀損'
        when 'quality_return' then '品質退回'
        when 'disaster' then '天災損失'
        else '其他減損'
    end;

    v_note = case
        when new.note is null then concat('Inventory adjustment - ', v_reason_label)
        else concat('Inventory adjustment - ', v_reason_label, ': ', new.note)
    end;

    insert into public.inventory_ledger (
        product_id,
        change_quantity,
        source_type,
        source_id,
        unit_cost_snapshot,
        occurred_at,
        note
    )
    values (
        new.product_id,
        -new.quantity,
        'adjustment',
        new.id,
        new.unit_cost_snapshot,
        new.occurred_at,
        v_note
    );

    return new;
end;
$$;

create trigger inventory_adjustments_prepare
before insert on public.inventory_adjustments
for each row
execute function public.trg_inventory_adjustments_prepare();

create trigger inventory_adjustments_write_ledger
after insert on public.inventory_adjustments
for each row
execute function public.trg_inventory_adjustments_write_ledger();

create or replace function public.create_inventory_adjustment_record(
    p_product_id uuid,
    p_quantity numeric(14, 3),
    p_reason public.inventory_adjustment_reason,
    p_occurred_at timestamptz default now(),
    p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    v_adjustment_id uuid;
begin
    perform public.require_role(array['admin', 'operator']::public.app_role[]);

    if p_product_id is null then
        raise exception 'Product is required';
    end if;

    if p_reason is null then
        raise exception 'Adjustment reason is required';
    end if;

    if p_quantity is null or p_quantity <= 0 then
        raise exception 'Adjustment quantity must be greater than 0';
    end if;

    perform 1
    from public.products
    where id = p_product_id;

    if not found then
        raise exception 'Product % not found', p_product_id;
    end if;

    insert into public.inventory_adjustments (
        product_id,
        quantity,
        reason,
        occurred_at,
        note,
        unit_cost_snapshot
    )
    values (
        p_product_id,
        p_quantity,
        p_reason,
        coalesce(p_occurred_at, now()),
        nullif(btrim(coalesce(p_note, '')), ''),
        null
    )
    returning id into v_adjustment_id;

    return v_adjustment_id;
end;
$$;

revoke all on function public.create_inventory_adjustment_record(
    uuid,
    numeric,
    public.inventory_adjustment_reason,
    timestamptz,
    text
) from public;
grant execute on function public.create_inventory_adjustment_record(
    uuid,
    numeric,
    public.inventory_adjustment_reason,
    timestamptz,
    text
) to authenticated, service_role;

alter table public.inventory_adjustments enable row level security;

create policy inventory_adjustments_select_staff
on public.inventory_adjustments
for select
to authenticated
using ((select public.is_active_staff()));

commit;
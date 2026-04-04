begin;

create extension if not exists pgcrypto;

create type public.customer_type as enum ('general', 'vip', 'wholesale');
create type public.order_status as enum ('pending', 'partial', 'completed');
create type public.ledger_source_type as enum ('inbound', 'shipment', 'direct_sale', 'adjustment');

create table public.products (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    base_price numeric(12, 2) not null check (base_price >= 0),
    avg_unit_cost numeric(12, 2) not null default 0 check (avg_unit_cost >= 0),
    stock_quantity numeric(14, 3) not null default 0,
    unit text not null default 'g' check (unit = 'g'),
    low_stock_threshold numeric(14, 3) not null default 0 check (low_stock_threshold >= 0),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint products_name_not_blank check (length(btrim(name)) > 0)
);

create unique index products_name_key on public.products (name);

create table public.customers (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    phone text not null,
    type public.customer_type not null default 'general',
    discount_rate numeric(6, 4) not null default 1.0000 check (discount_rate > 0 and discount_rate <= 1.0000),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint customers_name_not_blank check (length(btrim(name)) > 0),
    constraint customers_phone_not_blank check (length(btrim(phone)) > 0)
);

create index customers_name_idx on public.customers (name);
create index customers_phone_idx on public.customers (phone);

create table public.inbounds (
    id uuid primary key default gen_random_uuid(),
    product_id uuid not null references public.products(id) on delete restrict,
    quantity numeric(14, 3) not null check (quantity > 0),
    unit_cost numeric(12, 2) not null check (unit_cost >= 0),
    inbound_date timestamptz not null default now(),
    note text,
    created_at timestamptz not null default now()
);

create index inbounds_product_date_idx on public.inbounds (product_id, inbound_date desc);

create table public.orders (
    id uuid primary key default gen_random_uuid(),
    customer_id uuid not null references public.customers(id) on delete restrict,
    order_date timestamptz not null default now(),
    status public.order_status not null default 'pending',
    note text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index orders_customer_date_idx on public.orders (customer_id, order_date desc);
create index orders_status_idx on public.orders (status);

create table public.order_items (
    id uuid primary key default gen_random_uuid(),
    order_id uuid not null references public.orders(id) on delete cascade,
    product_id uuid not null references public.products(id) on delete restrict,
    ordered_quantity numeric(14, 3) not null check (ordered_quantity > 0),
    shipped_quantity numeric(14, 3) not null default 0 check (shipped_quantity >= 0),
    base_unit_price numeric(12, 2) not null check (base_unit_price >= 0),
    discount_rate_applied numeric(6, 4) not null default 1.0000 check (discount_rate_applied > 0 and discount_rate_applied <= 1.0000),
    final_unit_price numeric(12, 2) not null check (final_unit_price >= 0),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint order_items_shipped_lte_ordered check (shipped_quantity <= ordered_quantity),
    constraint order_items_one_product_per_order unique (order_id, product_id)
);

create index order_items_order_idx on public.order_items (order_id);
create index order_items_product_idx on public.order_items (product_id);

create table public.shipments (
    id uuid primary key default gen_random_uuid(),
    order_id uuid not null references public.orders(id) on delete restrict,
    shipment_date timestamptz not null default now(),
    note text,
    created_at timestamptz not null default now()
);

create index shipments_order_date_idx on public.shipments (order_id, shipment_date desc);

create table public.shipment_items (
    id uuid primary key default gen_random_uuid(),
    shipment_id uuid not null references public.shipments(id) on delete cascade,
    order_item_id uuid not null references public.order_items(id) on delete restrict,
    shipped_quantity numeric(14, 3) not null check (shipped_quantity > 0),
    created_at timestamptz not null default now(),
    constraint shipment_items_one_line_per_shipment unique (shipment_id, order_item_id)
);

create index shipment_items_order_item_idx on public.shipment_items (order_item_id);

create table public.direct_sales (
    id uuid primary key default gen_random_uuid(),
    customer_id uuid not null references public.customers(id) on delete restrict,
    sale_date timestamptz not null default now(),
    note text,
    created_at timestamptz not null default now()
);

create index direct_sales_customer_date_idx on public.direct_sales (customer_id, sale_date desc);

create table public.direct_sale_items (
    id uuid primary key default gen_random_uuid(),
    direct_sale_id uuid not null references public.direct_sales(id) on delete cascade,
    product_id uuid not null references public.products(id) on delete restrict,
    quantity numeric(14, 3) not null check (quantity > 0),
    base_unit_price numeric(12, 2) not null check (base_unit_price >= 0),
    discount_rate_applied numeric(6, 4) not null default 1.0000 check (discount_rate_applied > 0 and discount_rate_applied <= 1.0000),
    final_unit_price numeric(12, 2) not null check (final_unit_price >= 0),
    line_total numeric(14, 2) generated always as (round(quantity * final_unit_price, 2)) stored,
    created_at timestamptz not null default now(),
    constraint direct_sale_items_one_product_per_sale unique (direct_sale_id, product_id)
);

create index direct_sale_items_product_idx on public.direct_sale_items (product_id);

create table public.inventory_ledger (
    id uuid primary key default gen_random_uuid(),
    product_id uuid not null references public.products(id) on delete restrict,
    change_quantity numeric(14, 3) not null check (change_quantity <> 0),
    source_type public.ledger_source_type not null,
    source_id uuid not null,
    source_item_id uuid,
    unit_cost_snapshot numeric(12, 2) check (unit_cost_snapshot is null or unit_cost_snapshot >= 0),
    unit_price_snapshot numeric(12, 2) check (unit_price_snapshot is null or unit_price_snapshot >= 0),
    occurred_at timestamptz not null default now(),
    note text,
    created_at timestamptz not null default now()
);

create index inventory_ledger_product_occurred_idx on public.inventory_ledger (product_id, occurred_at desc);
create index inventory_ledger_source_idx on public.inventory_ledger (source_type, source_id);
create unique index inventory_ledger_inbound_source_key
    on public.inventory_ledger (source_type, source_id)
    where source_type = 'inbound';
create unique index inventory_ledger_source_item_key
    on public.inventory_ledger (source_type, source_item_id)
    where source_item_id is not null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create or replace function public.fn_refresh_product_stock(p_product_id uuid)
returns void
language plpgsql
as $$
begin
    update public.products
    set stock_quantity = coalesce((
        select sum(change_quantity)
        from public.inventory_ledger
        where product_id = p_product_id
    ), 0)
    where id = p_product_id;
end;
$$;

create or replace function public.fn_refresh_order_status(p_order_id uuid)
returns void
language plpgsql
as $$
declare
    v_item_count integer;
    v_completed_count integer;
    v_started_count integer;
    v_status public.order_status;
begin
    select count(*),
           count(*) filter (where shipped_quantity >= ordered_quantity),
           count(*) filter (where shipped_quantity > 0)
    into v_item_count, v_completed_count, v_started_count
    from public.order_items
    where order_id = p_order_id;

    if v_item_count = 0 or v_started_count = 0 then
        v_status = 'pending';
    elsif v_completed_count = v_item_count then
        v_status = 'completed';
    else
        v_status = 'partial';
    end if;

    update public.orders
    set status = v_status
    where id = p_order_id;
end;
$$;

create or replace function public.trg_inventory_ledger_refresh_product_stock()
returns trigger
language plpgsql
as $$
begin
    if tg_op = 'DELETE' then
        perform public.fn_refresh_product_stock(old.product_id);
        return old;
    end if;

    perform public.fn_refresh_product_stock(new.product_id);

    if tg_op = 'UPDATE' and old.product_id is distinct from new.product_id then
        perform public.fn_refresh_product_stock(old.product_id);
    end if;

    return new;
end;
$$;

create or replace function public.trg_inbounds_write_ledger()
returns trigger
language plpgsql
as $$
declare
    v_stock_quantity numeric(14, 3);
    v_avg_unit_cost numeric(12, 2);
    v_new_avg numeric(12, 2);
begin
    select stock_quantity, avg_unit_cost
    into v_stock_quantity, v_avg_unit_cost
    from public.products
    where id = new.product_id
    for update;

    if not found then
        raise exception 'Product % not found for inbound', new.product_id;
    end if;

    if v_stock_quantity <= 0 then
        v_new_avg = new.unit_cost;
    else
        v_new_avg = round(
            ((v_stock_quantity * v_avg_unit_cost) + (new.quantity * new.unit_cost))
            / (v_stock_quantity + new.quantity),
            2
        );
    end if;

    update public.products
    set avg_unit_cost = v_new_avg
    where id = new.product_id;

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
        new.quantity,
        'inbound',
        new.id,
        new.unit_cost,
        new.inbound_date,
        new.note
    );

    return new;
end;
$$;

create or replace function public.trg_validate_shipment_item()
returns trigger
language plpgsql
as $$
declare
    v_order_item public.order_items%rowtype;
    v_order_id uuid;
    v_available_stock numeric(14, 3);
    v_remaining_quantity numeric(14, 3);
begin
    select *
    into v_order_item
    from public.order_items
    where id = new.order_item_id
    for update;

    if not found then
        raise exception 'Order item % not found', new.order_item_id;
    end if;

    select order_id
    into v_order_id
    from public.shipments
    where id = new.shipment_id;

    if v_order_id is null then
        raise exception 'Shipment % not found', new.shipment_id;
    end if;

    if v_order_id <> v_order_item.order_id then
        raise exception 'Shipment % does not belong to the same order as order item %', new.shipment_id, new.order_item_id;
    end if;

    v_remaining_quantity = v_order_item.ordered_quantity - v_order_item.shipped_quantity;

    if new.shipped_quantity > v_remaining_quantity then
        raise exception 'Shipment quantity % exceeds remaining quantity % for order item %', new.shipped_quantity, v_remaining_quantity, new.order_item_id;
    end if;

    select stock_quantity
    into v_available_stock
    from public.products
    where id = v_order_item.product_id
    for update;

    if v_available_stock is null then
        raise exception 'Product % not found for shipment item %', v_order_item.product_id, new.id;
    end if;

    if v_available_stock < new.shipped_quantity then
        raise exception 'Insufficient stock for product %. Available %, requested %', v_order_item.product_id, v_available_stock, new.shipped_quantity;
    end if;

    return new;
end;
$$;

create or replace function public.trg_shipment_items_apply_inventory()
returns trigger
language plpgsql
as $$
declare
    v_order_item public.order_items%rowtype;
    v_shipment_date timestamptz;
    v_avg_unit_cost numeric(12, 2);
begin
    select *
    into v_order_item
    from public.order_items
    where id = new.order_item_id;

    if not found then
        raise exception 'Order item % not found', new.order_item_id;
    end if;

    select shipment_date
    into v_shipment_date
    from public.shipments
    where id = new.shipment_id;

    if v_shipment_date is null then
        raise exception 'Shipment % not found', new.shipment_id;
    end if;

    select avg_unit_cost
    into v_avg_unit_cost
    from public.products
    where id = v_order_item.product_id;

    update public.order_items
    set shipped_quantity = shipped_quantity + new.shipped_quantity
    where id = new.order_item_id;

    insert into public.inventory_ledger (
        product_id,
        change_quantity,
        source_type,
        source_id,
        source_item_id,
        unit_cost_snapshot,
        unit_price_snapshot,
        occurred_at,
        note
    )
    values (
        v_order_item.product_id,
        -new.shipped_quantity,
        'shipment',
        new.shipment_id,
        new.id,
        v_avg_unit_cost,
        v_order_item.final_unit_price,
        v_shipment_date,
        'Order shipment'
    );

    perform public.fn_refresh_order_status(v_order_item.order_id);

    return new;
end;
$$;

create or replace function public.trg_validate_direct_sale_item()
returns trigger
language plpgsql
as $$
declare
    v_available_stock numeric(14, 3);
begin
    select stock_quantity
    into v_available_stock
    from public.products
    where id = new.product_id
    for update;

    if v_available_stock is null then
        raise exception 'Product % not found for direct sale', new.product_id;
    end if;

    if v_available_stock < new.quantity then
        raise exception 'Insufficient stock for product %. Available %, requested %', new.product_id, v_available_stock, new.quantity;
    end if;

    return new;
end;
$$;

create or replace function public.trg_direct_sale_items_apply_inventory()
returns trigger
language plpgsql
as $$
declare
    v_sale_date timestamptz;
    v_avg_unit_cost numeric(12, 2);
begin
    select sale_date
    into v_sale_date
    from public.direct_sales
    where id = new.direct_sale_id;

    if v_sale_date is null then
        raise exception 'Direct sale % not found', new.direct_sale_id;
    end if;

    select avg_unit_cost
    into v_avg_unit_cost
    from public.products
    where id = new.product_id;

    insert into public.inventory_ledger (
        product_id,
        change_quantity,
        source_type,
        source_id,
        source_item_id,
        unit_cost_snapshot,
        unit_price_snapshot,
        occurred_at,
        note
    )
    values (
        new.product_id,
        -new.quantity,
        'direct_sale',
        new.direct_sale_id,
        new.id,
        v_avg_unit_cost,
        new.final_unit_price,
        v_sale_date,
        'Direct sale'
    );

    return new;
end;
$$;

create trigger set_products_updated_at
before update on public.products
for each row
execute function public.set_updated_at();

create trigger set_customers_updated_at
before update on public.customers
for each row
execute function public.set_updated_at();

create trigger set_orders_updated_at
before update on public.orders
for each row
execute function public.set_updated_at();

create trigger set_order_items_updated_at
before update on public.order_items
for each row
execute function public.set_updated_at();

create trigger trg_inventory_ledger_refresh_product_stock
after insert or update or delete on public.inventory_ledger
for each row
execute function public.trg_inventory_ledger_refresh_product_stock();

create trigger trg_inbounds_write_ledger
after insert on public.inbounds
for each row
execute function public.trg_inbounds_write_ledger();

create trigger trg_validate_shipment_item
before insert on public.shipment_items
for each row
execute function public.trg_validate_shipment_item();

create trigger trg_shipment_items_apply_inventory
after insert on public.shipment_items
for each row
execute function public.trg_shipment_items_apply_inventory();

create trigger trg_validate_direct_sale_item
before insert on public.direct_sale_items
for each row
execute function public.trg_validate_direct_sale_item();

create trigger trg_direct_sale_items_apply_inventory
after insert on public.direct_sale_items
for each row
execute function public.trg_direct_sale_items_apply_inventory();

create or replace view public.current_inventory_view as
select
    p.id as product_id,
    p.name as product_name,
    p.unit,
    p.base_price,
    p.avg_unit_cost,
    p.low_stock_threshold,
    p.stock_quantity as cached_stock_quantity,
    coalesce(sum(il.change_quantity), 0) as ledger_stock_quantity,
    p.stock_quantity <= p.low_stock_threshold as is_low_stock,
    p.updated_at
from public.products p
left join public.inventory_ledger il on il.product_id = p.id
group by p.id;

create or replace view public.order_fulfillment_view as
select
    o.id as order_id,
    o.order_date,
    o.status as order_status,
    c.id as customer_id,
    c.name as customer_name,
    oi.id as order_item_id,
    p.id as product_id,
    p.name as product_name,
    p.unit,
    oi.ordered_quantity,
    oi.shipped_quantity,
    greatest(oi.ordered_quantity - oi.shipped_quantity, 0) as remaining_quantity,
    oi.final_unit_price,
    round(oi.shipped_quantity * oi.final_unit_price, 2) as shipped_revenue
from public.orders o
join public.customers c on c.id = o.customer_id
join public.order_items oi on oi.order_id = o.id
join public.products p on p.id = oi.product_id;

create or replace view public.transaction_history_view as
select
    'shipment'::text as transaction_type,
    s.id as transaction_id,
    si.id as transaction_item_id,
    s.shipment_date as transaction_date,
    o.id as order_id,
    s.id as shipment_id,
    null::uuid as direct_sale_id,
    c.id as customer_id,
    c.name as customer_name,
    p.id as product_id,
    p.name as product_name,
    p.unit,
    si.shipped_quantity as quantity,
    oi.final_unit_price,
    round(si.shipped_quantity * oi.final_unit_price, 2) as revenue,
    coalesce(il.unit_cost_snapshot, 0) as unit_cost_snapshot,
    round(si.shipped_quantity * coalesce(il.unit_cost_snapshot, 0), 2) as cost_total,
    round((si.shipped_quantity * oi.final_unit_price) - (si.shipped_quantity * coalesce(il.unit_cost_snapshot, 0)), 2) as profit_total
from public.shipment_items si
join public.shipments s on s.id = si.shipment_id
join public.order_items oi on oi.id = si.order_item_id
join public.orders o on o.id = oi.order_id
join public.customers c on c.id = o.customer_id
join public.products p on p.id = oi.product_id
left join public.inventory_ledger il
    on il.source_type = 'shipment'
   and il.source_item_id = si.id

union all

select
    'direct_sale'::text as transaction_type,
    ds.id as transaction_id,
    dsi.id as transaction_item_id,
    ds.sale_date as transaction_date,
    null::uuid as order_id,
    null::uuid as shipment_id,
    ds.id as direct_sale_id,
    c.id as customer_id,
    c.name as customer_name,
    p.id as product_id,
    p.name as product_name,
    p.unit,
    dsi.quantity,
    dsi.final_unit_price,
    dsi.line_total as revenue,
    coalesce(il.unit_cost_snapshot, 0) as unit_cost_snapshot,
    round(dsi.quantity * coalesce(il.unit_cost_snapshot, 0), 2) as cost_total,
    round(dsi.line_total - (dsi.quantity * coalesce(il.unit_cost_snapshot, 0)), 2) as profit_total
from public.direct_sale_items dsi
join public.direct_sales ds on ds.id = dsi.direct_sale_id
join public.customers c on c.id = ds.customer_id
join public.products p on p.id = dsi.product_id
left join public.inventory_ledger il
    on il.source_type = 'direct_sale'
   and il.source_item_id = dsi.id;

create or replace view public.sales_summary_daily_view as
select
    date_trunc('day', transaction_date)::date as sales_date,
    round(sum(revenue), 2) as total_revenue,
    round(sum(cost_total), 2) as total_cost,
    round(sum(profit_total), 2) as total_profit,
    count(distinct concat(transaction_type, ':', transaction_id::text)) as transaction_count
from public.transaction_history_view
group by 1
order by 1 desc;

create or replace view public.sales_summary_monthly_view as
select
    date_trunc('month', transaction_date)::date as sales_month,
    round(sum(revenue), 2) as total_revenue,
    round(sum(cost_total), 2) as total_cost,
    round(sum(profit_total), 2) as total_profit,
    count(distinct concat(transaction_type, ':', transaction_id::text)) as transaction_count
from public.transaction_history_view
group by 1
order by 1 desc;

create or replace view public.top_selling_products_view as
select
    product_id,
    product_name,
    unit,
    round(sum(quantity), 3) as total_quantity_sold,
    round(sum(revenue), 2) as total_revenue,
    round(sum(profit_total), 2) as total_profit
from public.transaction_history_view
group by product_id, product_name, unit
order by total_quantity_sold desc, total_revenue desc;

commit;
begin;

insert into public.customers (
    name,
    phone,
    type,
    discount_rate
)
select
    seed.name,
    seed.phone,
    seed.type,
    seed.discount_rate
from (
    values
        ('示範一般客戶', '0900-000-001', 'general'::public.customer_type, 1.0000::numeric),
        ('和生藥局', '0900-000-002', 'vip'::public.customer_type, 0.9200::numeric),
        ('永順批發', '0900-000-003', 'wholesale'::public.customer_type, 0.8500::numeric)
) as seed(name, phone, type, discount_rate)
where not exists (
    select 1
    from public.customers existing
    where existing.phone = seed.phone
);

insert into public.products (
    name,
    base_price,
    low_stock_threshold,
    unit
)
values
    ('當歸', 85.00, 300.000, 'g'),
    ('黃耆', 52.00, 400.000, 'g'),
    ('枸杞', 46.00, 350.000, 'g')
on conflict (name) do update
set base_price = excluded.base_price,
    low_stock_threshold = excluded.low_stock_threshold,
    unit = excluded.unit;

with inbound_seed(product_name, quantity, unit_cost, note) as (
    values
        ('當歸', 2400.000::numeric, 41.50::numeric, 'seed:minimal:當歸:initial'),
        ('黃耆', 3200.000::numeric, 24.80::numeric, 'seed:minimal:黃耆:initial'),
        ('枸杞', 2800.000::numeric, 19.60::numeric, 'seed:minimal:枸杞:initial')
)
insert into public.inbounds (
    product_id,
    quantity,
    unit_cost,
    inbound_date,
    note
)
select
    products.id,
    inbound_seed.quantity,
    inbound_seed.unit_cost,
    timezone('utc', now()),
    inbound_seed.note
from inbound_seed
join public.products on products.name = inbound_seed.product_name
where not exists (
    select 1
    from public.inbounds existing
    where existing.product_id = products.id
      and existing.note = inbound_seed.note
);

commit;
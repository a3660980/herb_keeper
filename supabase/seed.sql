begin;

insert into public.product_units (name)
values
    ('g'),
    ('公克'),
    ('克'),
    ('兩'),
    ('台兩'),
    ('台斤'),
    ('公斤')
on conflict (name) do nothing;

insert into public.suppliers (
    name,
    phone,
    address,
    note
)
select
    seed.name,
    seed.phone,
    seed.address,
    seed.note
from (
    values
        ('廣源藥材行', '02-2555-1001', '台北市大同區迪化街一段 112 號', '北部常備根莖類供應'),
        ('順安藥業', '04-2311-2002', '台中市西區公益路 88 號', '中部日常補貨與急件供應'),
        ('南北漢方原料行', '06-221-3399', '台南市中西區民權路二段 46 號', '南部切片藥材與參類來源'),
        ('富利蔘藥批發', '07-312-6688', '高雄市三民區十全一路 205 號', '大宗批發與節令需求補貨'),
        ('德昌中藥材供應社', '04-728-5177', '彰化縣彰化市中華路 156 號', '紅棗與飲片類穩定供應')
) as seed(name, phone, address, note)
where not exists (
    select 1
    from public.suppliers existing
    where existing.name = seed.name
);

insert into public.customers (
    name,
    phone,
    type,
    discount_rate,
    address
)
select
    seed.name,
    seed.phone,
    seed.type,
    seed.discount_rate,
    seed.address
from (
    values
        ('示範一般客戶', '0900-000-001', 'general'::public.customer_type, 1.0000::numeric, '台北市中山區林森北路 108 號'),
        ('和生藥局', '0900-000-002', 'vip'::public.customer_type, 0.9200::numeric, '新北市板橋區文化路一段 22 號'),
        ('永順批發', '0900-000-003', 'wholesale'::public.customer_type, 0.8500::numeric, '桃園市桃園區春日路 35 號'),
        ('仁安中醫診所', '0900-000-004', 'vip'::public.customer_type, 0.9000::numeric, '台中市北屯區崇德路二段 320 號'),
        ('同德蔘藥行', '0900-000-005', 'wholesale'::public.customer_type, 0.8300::numeric, '台南市北區成功路 71 號'),
        ('福康藥膳坊', '0900-000-006', 'general'::public.customer_type, 0.9700::numeric, '高雄市左營區自由二路 180 號'),
        ('吉祥養生館', '0900-000-007', 'general'::public.customer_type, 0.9500::numeric, '新竹市東區光復路一段 90 號')
) as seed(name, phone, type, discount_rate, address)
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
    ('枸杞', 46.00, 350.000, 'g'),
    ('川芎', 63.00, 250.000, 'g'),
    ('黨參', 74.00, 300.000, 'g'),
    ('茯苓', 30.00, 500.000, 'g'),
    ('甘草', 26.00, 600.000, 'g'),
    ('熟地黃', 780.00, 24.000, '台斤'),
    ('紅棗', 220.00, 32.000, '公斤'),
    ('白芍', 55.00, 40.000, '兩'),
    ('西洋參片', 360.00, 60.000, '台兩'),
    ('桂枝', 34.00, 150.000, 'g'),
    ('麥門冬', 58.00, 200.000, 'g'),
    ('陳皮', 42.00, 180.000, 'g')
on conflict (name) do update
set base_price = excluded.base_price,
    low_stock_threshold = excluded.low_stock_threshold,
    unit = excluded.unit;

with inbound_seed(note, product_name, supplier_name, quantity, unit_cost, inbound_date) as (
    values
        ('seed:inbound:20260301:當歸:廣源', '當歸', '廣源藥材行', 2400.000::numeric, 41.50::numeric, timestamptz '2026-03-01 09:10:00+08'),
        ('seed:inbound:20260402:當歸:南北', '當歸', '南北漢方原料行', 1800.000::numeric, 43.20::numeric, timestamptz '2026-04-02 10:20:00+08'),
        ('seed:inbound:20260303:黃耆:順安', '黃耆', '順安藥業', 3200.000::numeric, 24.80::numeric, timestamptz '2026-03-03 08:40:00+08'),
        ('seed:inbound:20260401:黃耆:富利', '黃耆', '富利蔘藥批發', 2600.000::numeric, 25.60::numeric, timestamptz '2026-04-01 13:15:00+08'),
        ('seed:inbound:20260305:枸杞:廣源', '枸杞', '廣源藥材行', 2800.000::numeric, 19.60::numeric, timestamptz '2026-03-05 11:00:00+08'),
        ('seed:inbound:20260404:枸杞:德昌', '枸杞', '德昌中藥材供應社', 1800.000::numeric, 20.20::numeric, timestamptz '2026-04-04 09:35:00+08'),
        ('seed:inbound:20260307:川芎:順安', '川芎', '順安藥業', 1600.000::numeric, 29.40::numeric, timestamptz '2026-03-07 14:00:00+08'),
        ('seed:inbound:20260406:川芎:南北', '川芎', '南北漢方原料行', 1200.000::numeric, 30.10::numeric, timestamptz '2026-04-06 10:45:00+08'),
        ('seed:inbound:20260308:黨參:南北', '黨參', '南北漢方原料行', 2200.000::numeric, 35.50::numeric, timestamptz '2026-03-08 15:10:00+08'),
        ('seed:inbound:20260403:黨參:富利', '黨參', '富利蔘藥批發', 1800.000::numeric, 36.20::numeric, timestamptz '2026-04-03 16:20:00+08'),
        ('seed:inbound:20260310:茯苓:廣源', '茯苓', '廣源藥材行', 3600.000::numeric, 12.20::numeric, timestamptz '2026-03-10 09:20:00+08'),
        ('seed:inbound:20260405:茯苓:順安', '茯苓', '順安藥業', 2400.000::numeric, 12.80::numeric, timestamptz '2026-04-05 11:10:00+08'),
        ('seed:inbound:20260312:甘草:廣源', '甘草', '廣源藥材行', 4800.000::numeric, 10.60::numeric, timestamptz '2026-03-12 13:00:00+08'),
        ('seed:inbound:20260406:甘草:順安', '甘草', '順安藥業', 3200.000::numeric, 11.10::numeric, timestamptz '2026-04-06 15:30:00+08'),
        ('seed:inbound:20260315:熟地黃:富利', '熟地黃', '富利蔘藥批發', 18.000::numeric, 420.00::numeric, timestamptz '2026-03-15 08:50:00+08'),
        ('seed:inbound:20260405:熟地黃:南北', '熟地黃', '南北漢方原料行', 12.000::numeric, 438.00::numeric, timestamptz '2026-04-05 09:05:00+08'),
        ('seed:inbound:20260318:紅棗:德昌', '紅棗', '德昌中藥材供應社', 24.000::numeric, 118.00::numeric, timestamptz '2026-03-18 10:10:00+08'),
        ('seed:inbound:20260407:紅棗:富利', '紅棗', '富利蔘藥批發', 18.000::numeric, 122.00::numeric, timestamptz '2026-04-07 14:10:00+08'),
        ('seed:inbound:20260320:白芍:順安', '白芍', '順安藥業', 180.000::numeric, 28.50::numeric, timestamptz '2026-03-20 09:00:00+08'),
        ('seed:inbound:20260408:白芍:廣源', '白芍', '廣源藥材行', 120.000::numeric, 29.20::numeric, timestamptz '2026-04-08 11:50:00+08'),
        ('seed:inbound:20260322:西洋參片:南北', '西洋參片', '南北漢方原料行', 40.000::numeric, 205.00::numeric, timestamptz '2026-03-22 15:40:00+08'),
        ('seed:inbound:20260409:西洋參片:富利', '西洋參片', '富利蔘藥批發', 28.000::numeric, 212.00::numeric, timestamptz '2026-04-09 10:25:00+08'),
        ('seed:inbound:20260316:桂枝:順安', '桂枝', '順安藥業', 320.000::numeric, 15.00::numeric, timestamptz '2026-03-16 10:30:00+08'),
        ('seed:inbound:20260407:桂枝:廣源', '桂枝', '廣源藥材行', 180.000::numeric, 15.60::numeric, timestamptz '2026-04-07 09:50:00+08'),
        ('seed:inbound:20260317:麥門冬:南北', '麥門冬', '南北漢方原料行', 380.000::numeric, 26.00::numeric, timestamptz '2026-03-17 13:20:00+08'),
        ('seed:inbound:20260408:麥門冬:富利', '麥門冬', '富利蔘藥批發', 240.000::numeric, 26.80::numeric, timestamptz '2026-04-08 16:10:00+08'),
        ('seed:inbound:20260319:陳皮:德昌', '陳皮', '德昌中藥材供應社', 900.000::numeric, 16.50::numeric, timestamptz '2026-03-19 09:40:00+08'),
        ('seed:inbound:20260410:陳皮:廣源', '陳皮', '廣源藥材行', 600.000::numeric, 17.00::numeric, timestamptz '2026-04-10 10:15:00+08')
)
insert into public.inbounds (
    product_id,
    supplier_id,
    quantity,
    unit_cost,
    inbound_date,
    note
)
select
    products.id,
    suppliers.id,
    inbound_seed.quantity,
    inbound_seed.unit_cost,
    inbound_seed.inbound_date,
    inbound_seed.note
from inbound_seed
join public.products on products.name = inbound_seed.product_name
join public.suppliers on suppliers.name = inbound_seed.supplier_name
where not exists (
    select 1
    from public.inbounds existing
    where existing.note = inbound_seed.note
);

with adjustment_seed(note, product_name, quantity, reason, occurred_at) as (
    values
        ('seed:adjustment:20260406:枸杞:damage', '枸杞', 120.000::numeric, 'damage'::public.inventory_adjustment_reason, timestamptz '2026-04-06 17:20:00+08'),
        ('seed:adjustment:20260409:川芎:quality_return', '川芎', 80.000::numeric, 'quality_return'::public.inventory_adjustment_reason, timestamptz '2026-04-09 12:00:00+08'),
    ('seed:adjustment:20260410:熟地黃:damage', '熟地黃', 1.000::numeric, 'damage'::public.inventory_adjustment_reason, timestamptz '2026-04-10 09:45:00+08'),
    ('seed:adjustment:20260410:麥門冬:disaster', '麥門冬', 70.000::numeric, 'disaster'::public.inventory_adjustment_reason, timestamptz '2026-04-10 11:10:00+08'),
    ('seed:adjustment:20260411:桂枝:other', '桂枝', 25.000::numeric, 'other'::public.inventory_adjustment_reason, timestamptz '2026-04-11 08:50:00+08'),
    ('seed:adjustment:20260411:陳皮:quality_return', '陳皮', 50.000::numeric, 'quality_return'::public.inventory_adjustment_reason, timestamptz '2026-04-11 14:40:00+08')
)
insert into public.inventory_adjustments (
    product_id,
    quantity,
    reason,
    occurred_at,
    unit_cost_snapshot,
    note
)
select
    products.id,
    adjustment_seed.quantity,
    adjustment_seed.reason,
    adjustment_seed.occurred_at,
    coalesce(products.avg_unit_cost, 0),
    adjustment_seed.note
from adjustment_seed
join public.products on products.name = adjustment_seed.product_name
where not exists (
    select 1
    from public.inventory_adjustments existing
    where existing.note = adjustment_seed.note
);

with order_seed(note, customer_phone, order_date) as (
    values
        ('seed:order:pending:藥膳備料', '0900-000-006', timestamptz '2026-04-07 10:15:00+08'),
        ('seed:order:partial:批發補貨', '0900-000-005', timestamptz '2026-04-08 11:30:00+08'),
        ('seed:order:completed:診所定方', '0900-000-004', timestamptz '2026-04-10 09:30:00+08'),
    ('seed:order:completed:節氣禮盒', '0900-000-003', timestamptz '2026-04-12 10:00:00+08'),
    ('seed:order:partial:養生館加購', '0900-000-007', timestamptz '2026-04-11 14:30:00+08'),
    ('seed:order:canceled:節前預留', '0900-000-002', timestamptz '2026-04-06 13:20:00+08')
)
insert into public.orders (
    customer_id,
    order_date,
    note
)
select
    customers.id,
    order_seed.order_date,
    order_seed.note
from order_seed
join public.customers on customers.phone = order_seed.customer_phone
where not exists (
    select 1
    from public.orders existing
    where existing.note = order_seed.note
);

with order_item_seed(order_note, product_name, ordered_quantity, final_unit_price) as (
    values
        ('seed:order:pending:藥膳備料', '黃耆', 600.000::numeric, 50.00::numeric),
        ('seed:order:pending:藥膳備料', '茯苓', 800.000::numeric, 29.10::numeric),
        ('seed:order:pending:藥膳備料', '甘草', 500.000::numeric, 25.20::numeric),
        ('seed:order:partial:批發補貨', '當歸', 1500.000::numeric, 70.55::numeric),
        ('seed:order:partial:批發補貨', '川芎', 900.000::numeric, 52.29::numeric),
        ('seed:order:partial:批發補貨', '黨參', 1000.000::numeric, 61.42::numeric),
        ('seed:order:completed:診所定方', '黃耆', 1000.000::numeric, 46.80::numeric),
        ('seed:order:completed:診所定方', '枸杞', 1200.000::numeric, 41.40::numeric),
        ('seed:order:completed:診所定方', '白芍', 24.000::numeric, 49.50::numeric),
        ('seed:order:completed:節氣禮盒', '熟地黃', 6.000::numeric, 663.00::numeric),
        ('seed:order:completed:節氣禮盒', '紅棗', 8.000::numeric, 187.00::numeric),
        ('seed:order:partial:養生館加購', '桂枝', 320.000::numeric, 32.30::numeric),
        ('seed:order:partial:養生館加購', '麥門冬', 250.000::numeric, 55.10::numeric),
        ('seed:order:canceled:節前預留', '陳皮', 300.000::numeric, 38.64::numeric),
        ('seed:order:canceled:節前預留', '桂枝', 120.000::numeric, 31.28::numeric)
)
insert into public.order_items (
    order_id,
    product_id,
    ordered_quantity,
    base_unit_price,
    discount_rate_applied,
    final_unit_price
)
select
    orders.id,
    products.id,
    order_item_seed.ordered_quantity,
    products.base_price,
    customers.discount_rate,
    order_item_seed.final_unit_price
from order_item_seed
join public.orders on orders.note = order_item_seed.order_note
join public.customers on customers.id = orders.customer_id
join public.products on products.name = order_item_seed.product_name
where not exists (
    select 1
    from public.order_items existing
    where existing.order_id = orders.id
      and existing.product_id = products.id
);

update public.orders
set status = 'canceled'
where note = 'seed:order:canceled:節前預留'
    and status <> 'canceled';

with shipment_seed(note, order_note, shipment_date) as (
    values
        ('seed:shipment:partial:first-batch', 'seed:order:partial:批發補貨', timestamptz '2026-04-09 15:00:00+08'),
        ('seed:shipment:completed:clinic:first', 'seed:order:completed:診所定方', timestamptz '2026-04-11 10:40:00+08'),
        ('seed:shipment:completed:clinic:second', 'seed:order:completed:診所定方', timestamptz '2026-04-12 09:20:00+08'),
                ('seed:shipment:completed:gift-box', 'seed:order:completed:節氣禮盒', timestamptz '2026-04-12 15:10:00+08'),
                ('seed:shipment:partial:wellness-first', 'seed:order:partial:養生館加購', timestamptz '2026-04-12 13:20:00+08'),
                ('seed:shipment:partial:wholesale-second', 'seed:order:partial:批發補貨', timestamptz '2026-04-12 14:30:00+08')
)
insert into public.shipments (
    order_id,
    shipment_date,
    note
)
select
    orders.id,
    shipment_seed.shipment_date,
    shipment_seed.note
from shipment_seed
join public.orders on orders.note = shipment_seed.order_note
where not exists (
    select 1
    from public.shipments existing
    where existing.note = shipment_seed.note
);

with shipment_item_seed(shipment_note, product_name, shipped_quantity) as (
    values
        ('seed:shipment:partial:first-batch', '當歸', 900.000::numeric),
        ('seed:shipment:partial:first-batch', '川芎', 500.000::numeric),
        ('seed:shipment:completed:clinic:first', '黃耆', 600.000::numeric),
        ('seed:shipment:completed:clinic:first', '枸杞', 700.000::numeric),
        ('seed:shipment:completed:clinic:second', '黃耆', 400.000::numeric),
        ('seed:shipment:completed:clinic:second', '枸杞', 500.000::numeric),
        ('seed:shipment:completed:clinic:second', '白芍', 24.000::numeric),
        ('seed:shipment:completed:gift-box', '熟地黃', 6.000::numeric),
        ('seed:shipment:completed:gift-box', '紅棗', 8.000::numeric),
        ('seed:shipment:partial:wellness-first', '桂枝', 260.000::numeric),
        ('seed:shipment:partial:wellness-first', '麥門冬', 250.000::numeric),
        ('seed:shipment:partial:wholesale-second', '黨參', 200.000::numeric)
)
insert into public.shipment_items (
    shipment_id,
    order_item_id,
    shipped_quantity
)
select
    shipments.id,
    order_items.id,
    shipment_item_seed.shipped_quantity
from shipment_item_seed
join public.shipments on shipments.note = shipment_item_seed.shipment_note
join public.orders on orders.id = shipments.order_id
join public.products on products.name = shipment_item_seed.product_name
join public.order_items on order_items.order_id = orders.id
                       and order_items.product_id = products.id
where not exists (
    select 1
    from public.shipment_items existing
    where existing.shipment_id = shipments.id
      and existing.order_item_id = order_items.id
);

with direct_sale_seed(note, customer_phone, sale_date) as (
    values
        ('seed:direct-sale:藥局門市補貨', '0900-000-002', timestamptz '2026-04-08 18:20:00+08'),
        ('seed:direct-sale:一般零售抓藥', '0900-000-001', timestamptz '2026-04-11 16:10:00+08'),
        ('seed:direct-sale:藥膳食材採買', '0900-000-006', timestamptz '2026-04-12 11:40:00+08'),
    ('seed:direct-sale:養生館高單價採購', '0900-000-007', timestamptz '2026-04-12 17:30:00+08'),
    ('seed:direct-sale:參片續購', '0900-000-007', timestamptz '2026-04-12 19:10:00+08'),
    ('seed:direct-sale:門市香料抓料', '0900-000-001', timestamptz '2026-04-12 19:40:00+08')
)
insert into public.direct_sales (
    customer_id,
    sale_date,
    note
)
select
    customers.id,
    direct_sale_seed.sale_date,
    direct_sale_seed.note
from direct_sale_seed
join public.customers on customers.phone = direct_sale_seed.customer_phone
where not exists (
    select 1
    from public.direct_sales existing
    where existing.note = direct_sale_seed.note
);

with direct_sale_item_seed(sale_note, product_name, quantity, final_unit_price) as (
    values
        ('seed:direct-sale:藥局門市補貨', '當歸', 200.000::numeric, 78.20::numeric),
        ('seed:direct-sale:藥局門市補貨', '甘草', 150.000::numeric, 23.92::numeric),
        ('seed:direct-sale:一般零售抓藥', '黃耆', 120.000::numeric, 52.00::numeric),
        ('seed:direct-sale:一般零售抓藥', '枸杞', 100.000::numeric, 46.00::numeric),
        ('seed:direct-sale:一般零售抓藥', '茯苓', 150.000::numeric, 30.00::numeric),
        ('seed:direct-sale:藥膳食材採買', '熟地黃', 2.000::numeric, 756.60::numeric),
        ('seed:direct-sale:藥膳食材採買', '紅棗', 3.000::numeric, 213.40::numeric),
        ('seed:direct-sale:養生館高單價採購', '白芍', 12.000::numeric, 52.25::numeric),
        ('seed:direct-sale:養生館高單價採購', '西洋參片', 4.000::numeric, 342.00::numeric),
        ('seed:direct-sale:參片續購', '西洋參片', 6.000::numeric, 336.00::numeric),
        ('seed:direct-sale:參片續購', '桂枝', 80.000::numeric, 32.30::numeric),
        ('seed:direct-sale:門市香料抓料', '陳皮', 120.000::numeric, 42.00::numeric),
        ('seed:direct-sale:門市香料抓料', '麥門冬', 110.000::numeric, 58.00::numeric)
)
insert into public.direct_sale_items (
    direct_sale_id,
    product_id,
    quantity,
    base_unit_price,
    discount_rate_applied,
    final_unit_price
)
select
    direct_sales.id,
    products.id,
    direct_sale_item_seed.quantity,
    products.base_price,
    customers.discount_rate,
    direct_sale_item_seed.final_unit_price
from direct_sale_item_seed
join public.direct_sales on direct_sales.note = direct_sale_item_seed.sale_note
join public.customers on customers.id = direct_sales.customer_id
join public.products on products.name = direct_sale_item_seed.product_name
where not exists (
    select 1
    from public.direct_sale_items existing
    where existing.direct_sale_id = direct_sales.id
      and existing.product_id = products.id
);

with ledger as (
    select
        p.id,
        p.name,
        coalesce(sum(il.change_quantity), 0) as ledger_stock_quantity
    from public.products p
    left join public.inventory_ledger il on il.product_id = p.id
    group by p.id, p.name
)
update public.products as products
set stock_quantity = case
        when ledger.name = '當歸' then greatest(ledger.ledger_stock_quantity - 75, 0)
        when ledger.name = '甘草' then ledger.ledger_stock_quantity + 25
        else ledger.ledger_stock_quantity
    end
from ledger
where products.id = ledger.id;

commit;
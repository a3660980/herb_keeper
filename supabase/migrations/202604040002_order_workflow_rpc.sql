begin;

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
grant execute on function public.create_order_with_items(uuid, timestamptz, text, jsonb) to anon, authenticated, service_role;

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
grant execute on function public.create_shipment_with_items(uuid, timestamptz, text, jsonb) to anon, authenticated, service_role;

commit;
begin;

create or replace function public.update_order_with_items(
    p_order_id uuid,
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
    v_item jsonb;
    v_product_id uuid;
    v_ordered_quantity numeric(14, 3);
    v_final_unit_price numeric(12, 2);
    v_base_unit_price numeric(12, 2);
    v_discount_rate numeric(6, 4);
begin
    perform public.require_role(array['admin', 'operator']::public.app_role[]);

    if p_order_id is null then
        raise exception 'Order is required';
    end if;

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

    perform 1
    from public.orders
    where id = p_order_id
    for update;

    if not found then
        raise exception 'Order % not found', p_order_id;
    end if;

    if exists (
        select 1
        from public.shipments
        where order_id = p_order_id
    ) or exists (
        select 1
        from public.order_items
        where order_id = p_order_id
          and shipped_quantity > 0
    ) then
        raise exception 'Only orders without shipment history can be updated';
    end if;

    select discount_rate
    into v_discount_rate
    from public.customers
    where id = p_customer_id;

    if v_discount_rate is null then
        raise exception 'Customer % not found', p_customer_id;
    end if;

    update public.orders
    set customer_id = p_customer_id,
        order_date = coalesce(p_order_date, now()),
        note = nullif(btrim(coalesce(p_note, '')), '')
    where id = p_order_id;

    delete from public.order_items
    where order_id = p_order_id;

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
            p_order_id,
            v_product_id,
            v_ordered_quantity,
            v_base_unit_price,
            v_discount_rate,
            v_final_unit_price
        );
    end loop;

    perform public.fn_refresh_order_status(p_order_id);

    return p_order_id;
end;
$$;

revoke all on function public.update_order_with_items(uuid, uuid, timestamptz, text, jsonb) from public;
grant execute on function public.update_order_with_items(uuid, uuid, timestamptz, text, jsonb) to anon, authenticated, service_role;

commit;
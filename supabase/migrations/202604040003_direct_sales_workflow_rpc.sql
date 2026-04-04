begin;

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
grant execute on function public.create_direct_sale_with_items(uuid, timestamptz, text, jsonb) to anon, authenticated, service_role;

commit;
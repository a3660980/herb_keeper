begin;

create or replace function public.create_inbound_batch_records(
    p_supplier_id uuid,
    p_inbound_date timestamptz default now(),
    p_note text default null,
    p_items jsonb default '[]'::jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
    v_item jsonb;
    v_created_count integer := 0;
    v_product_id uuid;
    v_quantity numeric(14, 3);
    v_unit_cost numeric(12, 2);
begin
    perform public.require_role(array['admin', 'operator']::public.app_role[]);

    if p_supplier_id is null then
        raise exception 'Supplier is required';
    end if;

    if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
        raise exception 'At least one inbound item is required';
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
        raise exception 'Duplicate products are not allowed in one inbound batch';
    end if;

    perform 1
    from public.suppliers
    where id = p_supplier_id;

    if not found then
        raise exception 'Supplier % not found', p_supplier_id;
    end if;

    for v_item in
        select * from jsonb_array_elements(p_items)
    loop
        v_product_id := nullif(v_item ->> 'product_id', '')::uuid;
        v_quantity := nullif(v_item ->> 'quantity', '')::numeric;
        v_unit_cost := nullif(v_item ->> 'unit_cost', '')::numeric;

        perform public.create_inbound_record(
            v_product_id,
            p_supplier_id,
            v_quantity,
            v_unit_cost,
            coalesce(p_inbound_date, now()),
            p_note
        );

        v_created_count := v_created_count + 1;
    end loop;

    return v_created_count;
end;
$$;

revoke all on function public.create_inbound_batch_records(uuid, timestamptz, text, jsonb) from public;
grant execute on function public.create_inbound_batch_records(uuid, timestamptz, text, jsonb) to authenticated, service_role;

commit;
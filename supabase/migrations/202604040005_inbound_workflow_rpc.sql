begin;

create or replace function public.create_inbound_record(
    p_product_id uuid,
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

    insert into public.inbounds (
        product_id,
        quantity,
        unit_cost,
        inbound_date,
        note
    )
    values (
        p_product_id,
        p_quantity,
        p_unit_cost,
        coalesce(p_inbound_date, now()),
        nullif(btrim(coalesce(p_note, '')), '')
    )
    returning id into v_inbound_id;

    return v_inbound_id;
end;
$$;

revoke all on function public.create_inbound_record(uuid, numeric, numeric, timestamptz, text) from public;
grant execute on function public.create_inbound_record(uuid, numeric, numeric, timestamptz, text) to authenticated, service_role;

commit;
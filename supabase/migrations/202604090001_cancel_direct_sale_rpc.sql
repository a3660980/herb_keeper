begin;

-- ---------------------------------------------------------------------------
-- cancel_direct_sale  –  reverses a completed direct-sale transaction.
--
-- Steps:
--   1. Remove all inventory_ledger entries for this sale  (restores stock via fn_refresh)
--   2. Refresh cached stock_quantity on each affected product
--   3. Delete the direct_sale row  (ON DELETE CASCADE removes items)
-- ---------------------------------------------------------------------------
create or replace function public.cancel_direct_sale(
    p_direct_sale_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    v_product_id uuid;
begin
    perform public.require_role(array['admin', 'operator']::public.app_role[]);

    if p_direct_sale_id is null then
        raise exception 'Direct sale ID is required';
    end if;

    if not exists (
        select 1
        from public.direct_sales
        where id = p_direct_sale_id
    ) then
        raise exception 'Direct sale % not found', p_direct_sale_id;
    end if;

    -- 1. Remove ledger entries and collect affected products
    for v_product_id in
        select distinct product_id
        from public.inventory_ledger
        where source_type = 'direct_sale'
          and source_id = p_direct_sale_id
    loop
        delete from public.inventory_ledger
        where source_type = 'direct_sale'
          and source_id = p_direct_sale_id
          and product_id = v_product_id;

        -- 2. Refresh cached stock
        perform public.fn_refresh_product_stock(v_product_id);
    end loop;

    -- 3. Delete the direct sale (items cascade)
    delete from public.direct_sales
    where id = p_direct_sale_id;

    return p_direct_sale_id;
end;
$$;

revoke all on function public.cancel_direct_sale(uuid) from public;
grant execute on function public.cancel_direct_sale(uuid) to authenticated, service_role;

commit;

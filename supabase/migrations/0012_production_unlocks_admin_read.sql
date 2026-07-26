-- Admin needs to see every producer's production_unlocks row (to manage
-- them in Admin -> Produção API), not just their own.
drop policy if exists "production_unlocks: producer reads own" on production_unlocks;

create policy "production_unlocks: producer/admin read" on production_unlocks
  for select using (producer_id = auth.uid() or is_admin());

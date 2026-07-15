alter table course_modules enable row level security;
alter table course_lessons enable row level security;
alter table lesson_progress enable row level security;
alter table lesson_comments enable row level security;

-- ---------- course_modules / course_lessons ----------
-- Managed directly by the owning producer via the regular authenticated
-- client (like products/coupons). Buyer-facing reads go through a server
-- action using the service-role client, after checking a paid order exists
-- — same pattern as product_files/downloads — so there is no buyer read
-- policy here on purpose.
create policy "course_modules: producer/admin manage" on course_modules
  for all using (
    exists (select 1 from products p where p.id = product_id and p.producer_id = auth.uid())
    or is_admin()
  );

create policy "course_lessons: producer/admin manage" on course_lessons
  for all using (
    exists (
      select 1 from course_modules m
      join products p on p.id = m.product_id
      where m.id = module_id and p.producer_id = auth.uid()
    )
    or is_admin()
  );

-- ---------- lesson_progress (buyer owns their own rows) ----------
create policy "lesson_progress: own or admin" on lesson_progress
  for all using (buyer_id = auth.uid() or is_admin());

-- ---------- lesson_comments ----------
-- Producers can read comments on their own lessons directly. Buyer reads/
-- writes happen via a server action using the service-role client, after
-- verifying a paid order for the parent product (consistent with the rest
-- of the buyer-facing checkout/download flow).
create policy "lesson_comments: producer/admin read" on lesson_comments
  for select using (
    exists (
      select 1 from course_lessons l
      join course_modules m on m.id = l.module_id
      join products p on p.id = m.product_id
      where l.id = lesson_id and p.producer_id = auth.uid()
    )
    or is_admin()
  );

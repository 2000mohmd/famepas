GRANT SELECT ON public.niches TO anon;
CREATE POLICY "Anyone can read active niches" ON public.niches FOR SELECT TO anon USING (is_active = true);
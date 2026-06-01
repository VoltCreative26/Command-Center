-- =====================================================================
-- One-time migration: remap legacy task categories to the new six.
-- Run once in the Supabase SQL editor.
--
-- New categories:
--   Admin · Design & Production · Web & Digital ·
--   Strategy & Planning · Marketing & R&D · Misc
-- =====================================================================
update tasks set category = 'Design & Production' where category = 'Creative';
update tasks set category = 'Web & Digital'        where category = 'Development';
update tasks set category = 'Strategy & Planning'  where category = 'Strategy';
update tasks set category = 'Strategy & Planning'  where category = 'Client work';
-- 'Admin' is unchanged.

-- Anything else (null or unrecognized) falls back to Misc.
update tasks
set category = 'Misc'
where category is null
   or category not in (
     'Admin', 'Design & Production', 'Web & Digital',
     'Strategy & Planning', 'Marketing & R&D', 'Misc'
   );

-- Lessons can now be a plain external link (e.g. Google Drive, a private
-- hosting page) instead of an embeddable video URL — the player opens/
-- redirects the buyer to it instead of trying to load it in an iframe.
alter table course_lessons add column if not exists is_external_link boolean not null default false;

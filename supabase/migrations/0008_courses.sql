-- Member area: modules/lessons for course-like products (Cursos, Mentorias),
-- plus per-buyer lesson progress and lesson comments.

create table course_modules (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  title text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index course_modules_product_idx on course_modules (product_id);

create table course_lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references course_modules(id) on delete cascade,
  title text not null,
  description text not null default '',
  video_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index course_lessons_module_idx on course_lessons (module_id);

create table lesson_progress (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references course_lessons(id) on delete cascade,
  buyer_id uuid not null references profiles(id) on delete cascade,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (lesson_id, buyer_id)
);

create table lesson_comments (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references course_lessons(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  comment text not null,
  created_at timestamptz not null default now()
);

create index lesson_comments_lesson_idx on lesson_comments (lesson_id);

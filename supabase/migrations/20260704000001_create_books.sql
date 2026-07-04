-- Migration: Create books table and migrate existing books' real data
-- Created: 2026-07-04

-- 1. Drop temporary helper function used for RLS research
DROP FUNCTION IF EXISTS public.temp_get_policies();

-- 2. Create the books table
CREATE TABLE IF NOT EXISTS public.books (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  subtitle text,
  cover_image text,
  authors jsonb,              -- array of {name, role}
  isbn text,
  isbn_ebook text,            -- nullable, for future separate ebook ISBN
  publication_date text,
  pages integer,
  language text,
  format text,
  price text,
  description text,
  long_description text,
  table_of_contents jsonb,    -- array of strings
  testimonials jsonb,         -- array of {quote, author, title}
  categories jsonb,           -- array of strings
  tags jsonb,                 -- array of strings
  status text DEFAULT 'Available Now',
  is_available boolean DEFAULT true,
  doi text,                   -- book-level DOI, added now even though not minted yet, for future use
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
-- Public select allowed on books (matching journals/articles)
CREATE POLICY "Allow public SELECT on books" ON public.books
    FOR SELECT USING (true);

-- Admins and editors full access on books (using get_user_role definer helper)
CREATE POLICY "Allow admins and editors ALL on books" ON public.books
    FOR ALL TO authenticated
    USING (
        get_user_role(auth.uid()) IN ('admin'::user_role, 'editor'::user_role)
    )
    WITH CHECK (
        get_user_role(auth.uid()) IN ('admin'::user_role, 'editor'::user_role)
    );

-- 5. Insert existing books' real data
INSERT INTO public.books (
  id,
  slug,
  title,
  subtitle,
  cover_image,
  authors,
  isbn,
  isbn_ebook,
  publication_date,
  pages,
  language,
  format,
  price,
  description,
  long_description,
  table_of_contents,
  testimonials,
  categories,
  tags,
  status,
  is_available,
  doi
) VALUES 
(
  'b8b5fa2b-8a8b-4c4f-9e7c-87d2ef1df9c1',
  'grace-timekeepers',
  'GRACE: Timekeepers of Ancient Cultural Legacy',
  'Preserving the World''s Ancient Cultural Traditions',
  '/books/grace-cover.jpg',
  '[{"name": "Francisca Oliviera", "role": "Lead Author"}, {"name": "Priyasa Banerjee", "role": "Author"}, {"name": "Sam Polkar", "role": "Author"}, {"name": "Chidinma Adebayo", "role": "Author"}, {"name": "Ayako Yokuba", "role": "Author"}]'::jsonb,
  '9798227366276',
  null,
  '2024',
  240,
  'English',
  'Paperback, E-book',
  '$25.99',
  'GRACE: Timekeepers of Ancient Cultural Legacy offers a profound exploration of the urgent need to preserve ancient cultures and traditions in the face of mounting global challenges.',
  'Through a richly detailed narrative, this book introduces GRACE''s founding mission and its growing influence on the global stage.',
  '["The Genesis of GRACE", "The Global Threat to Ancient Cultures", "GRACE''s Operational Structure", "Preservation and Documentation Techniques", "Research and Education Initiatives", "International Advocacy and Policy Work", "Technology Integration in Cultural Preservation", "Global Collaboration: A Key to Success", "Ethical Dimensions of Cultural Preservation", "The Future of Ancient Cultural Preservation"]'::jsonb,
  '[{"quote": "A landmark work in the field of cultural preservation. GRACE offers hope for safeguarding humanity''s shared heritage.", "author": "Dr. Rajendran Govender", "title": "Social Anthropologist, IBSA and Ford Fellow"}, {"quote": "A meticulously researched and beautifully presented volume that transcends the boundaries of mere historical documentation.", "author": "Dr. Mathieu Martin", "title": "Photographer, Anthropologist, Switzerland"}]'::jsonb,
  '["Cultural Heritage", "Preservation", "Technology", "Global Affairs"]'::jsonb,
  '["cultural preservation", "ancient heritage", "digital archiving", "global heritage"]'::jsonb,
  'Available Now',
  true,
  null
),
(
  'd74f26b5-0c7f-4428-98f9-4b2a6fcf1479',
  'echoes-of-the-himalayas',
  'Echoes of the Himalayas: Poems of Awe & Spiritual Discovery',
  'Poems of Awe and Spiritual Discovery',
  '/books/echoes-cover.jpg',
  '[{"name": "Verender Bangroo", "role": "Author"}]'::jsonb,
  '9798232056490',
  null,
  '2025',
  210,
  'English',
  'Paperback, E-book',
  '$21.99',
  'A remarkable fusion of cultural immersion, encounters, and recollections conveyed with lyrical gentleness.',
  'The poems offer readers a broad range of themes, from the resiliency of indigenous peoples to the holiness of the mountains.',
  '["Exalted Aspects - Himalayan Eco-Culture", "Family, Friends, and Kinship Values", "Displacement and Transmigration Woes", "Culinary Traditions Embedded in Socio-Cultural Matrix", "Occupational Undertakings and Traditions", "Pilgrims - A Journey into the Spiritual Realm", "Temples - Faith and Ritual Expressions"]'::jsonb,
  '[{"quote": "A superbly produced anthology that effectively conveys the deep relationship that exists between culture, nature, and the human soul.", "author": "Arindam Bhattacharya", "title": "Chairman, Advocacy Unified Network"}, {"quote": "Through Verender Bangroo''s moving poetry, discover the enchantment and charm of the Himalayas.", "author": "Hafizullah Mir", "title": "Writer, Srinagar"}]'::jsonb,
  '["Poetry", "Himalayas", "Spiritual", "Cultural Heritage"]'::jsonb,
  '["himalayas", "poetry", "spiritual discovery", "cultural heritage"]'::jsonb,
  'Available Now',
  true,
  null
),
(
  'f3a9712a-5793-4a1e-8e8e-c90a1cf6b7d2',
  'bhagavad-gita-ballot-box',
  'From the Bhagavad Gita to the Ballot Box',
  'Applying Krishna''s Teachings to Politics',
  '/books/bhagavad-cover.jpg',
  '[{"name": "Arindam Bhattacharya", "role": "Author"}]'::jsonb,
  '9798230447689',
  null,
  '2024',
  465,
  'English',
  'Paperback, E-book',
  '$65.99',
  'A timeless scripture meets modern governance in this thought-provoking book that reimagines the Bhagavad Gita''s wisdom.',
  'Through a compelling narrative, this book delves into the intersections of spirituality and statecraft.',
  '["From the Bhagavad Gita to the Ballot Box: An Introduction", "The Relevance of Ancient Wisdom in Modern Politics", "Unveiling the Teachings of Krishna in the Bhagavad Gita", "The Evolution of Political Systems", "Ethical Leadership: Lessons from Krishna''s Guidance", "Duty, Dharma, and the Responsibilities of Political Leaders", "The Quest for Wisdom: Applying Krishna''s Teachings to Decision-Making", "Governance for the Greater Good", "Pursuit of Justice and Equality in Politics", "Sustainable Policies and Environmental Stewardship"]'::jsonb,
  '[{"quote": "A groundbreaking work that bridges ancient wisdom with contemporary governance. Bhattacharya offers a transformative perspective on ethical leadership.", "author": "Prof. (Dr.) Richa Kamboj", "title": "Artist, Art Historian, Art Critic"}, {"quote": "An essential read for political thinkers, policymakers, and anyone interested in the fusion of wisdom and governance.", "author": "Dr. Abid Ahmad Bhat", "title": "Award-winning writer and translator"}]'::jsonb,
  '["Politics", "Philosophy", "Leadership", "Spirituality"]'::jsonb,
  '["bhagavad gita", "political leadership", "ethical governance", "karma"]'::jsonb,
  'Available Now',
  true,
  null
);

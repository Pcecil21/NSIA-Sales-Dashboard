-- ═══════════════════════════════════════════════════════════════════════════
-- NSIA Sales Dashboard — Supabase Schema
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard)
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Create the leads table
CREATE TABLE leads (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company       TEXT NOT NULL,
  category      TEXT NOT NULL DEFAULT 'Restaurant',
  contact       TEXT DEFAULT '',
  email         TEXT DEFAULT '',
  phone         TEXT DEFAULT '',
  city          TEXT DEFAULT '',
  proximity     REAL DEFAULT 5.0,
  size          TEXT DEFAULT 'Medium' CHECK (size IN ('Small', 'Medium', 'Large')),
  sponsor       TEXT DEFAULT 'Unknown' CHECK (sponsor IN ('Yes', 'No', 'Unknown')),
  status        TEXT DEFAULT 'New' CHECK (status IN (
                  'New', 'Contacted', 'Qualified', 'Proposal Sent',
                  'Negotiation', 'Closed Won', 'Closed Lost', 'On Hold')),
  package       TEXT DEFAULT '',
  deal_value    INTEGER DEFAULT 0,
  probability   INTEGER DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
  lead_score    INTEGER DEFAULT 0,
  notes         TEXT DEFAULT '',
  outreach_date TEXT DEFAULT '',
  follow_up     TEXT DEFAULT '',
  next_steps    TEXT DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Auto-update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_modified_column();

-- 3. Enable Row Level Security (required by Supabase)
--    For a small trusted team, we allow all operations with the anon key.
--    If you need per-user access later, add auth policies here.
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for anon" ON leads
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 4. Enable Realtime (so all team members see changes instantly)
ALTER PUBLICATION supabase_realtime ADD TABLE leads;

-- 5. Seed the initial prospect list
INSERT INTO leads (company, category, contact, email, phone, city, proximity, size, sponsor, status, lead_score, notes) VALUES
  ('Dick''s Sporting Goods — Edens Plaza', 'Sports Equipment', 'Store Manager', 'contact@dickssportinggoods.com', '(847) 329-0200', 'Wilmette', 1.5, 'Large', 'Yes', 'New', 100, 'Closest big-box sports store to arena'),
  ('Wintrust Bank — Wilmette', 'Financial Services', 'Branch Manager', 'wilmette@wintrust.com', '(847) 853-1880', 'Wilmette', 0.8, 'Large', 'Yes', 'New', 94, 'Community bank with strong local sponsorship track record'),
  ('Edward Jones — Wilmette', 'Financial Services', 'Financial Advisor', 'advisor@edwardjones.com', '(847) 256-1515', 'Wilmette', 1.5, 'Large', 'Yes', 'New', 94, 'National firm with community involvement programs'),
  ('NorthShore University HealthSystem', 'Healthcare', 'Marketing Director', 'marketing@northshore.org', '(847) 570-5000', 'Evanston', 5.0, 'Large', 'Yes', 'New', 92, 'Major regional health system, heavy community advertising'),
  ('Gunzo''s Sports', 'Sports Equipment', 'Store Manager', 'info@gunzos.com', '(847) 251-3838', 'Glenview', 3.5, 'Medium', 'Yes', 'New', 90, 'Popular local sports retailer, strong hockey section'),
  ('Pure Hockey (Total Hockey)', 'Sports Equipment', 'Regional Manager', 'partnerships@purehockey.com', '(847) 999-0000', 'Northbrook', 6.0, 'Large', 'Yes', 'New', 88, 'Major hockey retailer, natural sponsor fit'),
  ('Midwest Orthopaedics at Rush', 'Healthcare', 'Sponsorship Manager', 'sponsorships@rushortho.com', '(312) 432-2531', 'Chicago', 15.0, 'Large', 'Yes', 'New', 87, 'Leading orthopedic practice, sports injury specialists'),
  ('Lou Malnati''s — Wilmette', 'Restaurant', 'General Manager', 'wilmette@loumalnatis.com', '(847) 251-7575', 'Wilmette', 1.5, 'Large', 'Yes', 'New', 86, 'Chicago institution, already sponsors youth sports teams'),
  ('North Shore Pediatric Therapy', 'Healthcare', 'Marketing Coord', 'info@nspt4kids.com', '(847) 607-9780', 'Glenview', 4.0, 'Medium', 'Yes', 'New', 85, 'Pediatric therapy — directly serves hockey families'),
  ('Lifetime Fitness — Skokie', 'Fitness', 'General Manager', 'skokie@lifetimefitness.com', '(847) 418-5000', 'Skokie', 5.5, 'Large', 'Yes', 'New', 83, 'Premium health club with youth and family programs'),
  ('Lululemon — Plaza del Lago', 'Retail', 'Store Manager', 'plazadellago@lululemon.com', '(847) 920-0340', 'Wilmette', 1.5, 'Large', 'Yes', 'New', 81, 'Athletic apparel with community event sponsorship history'),
  ('Abt Electronics', 'Home Services', 'VP of Marketing', 'marketing@abt.com', '(847) 967-8830', 'Glenview', 4.0, 'Large', 'Yes', 'New', 80, 'Iconic Chicagoland retailer, major local advertiser'),
  ('Fields BMW — Northfield', 'Automotive', 'General Manager', 'info@fieldsbmw.com', '(847) 446-5100', 'Northfield', 3.0, 'Large', 'Yes', 'New', 80, 'Premium auto dealer serving North Shore clientele'),
  ('@properties Christie''s — Wilmette', 'Real Estate', 'Managing Broker', 'wilmette@atproperties.com', '(847) 853-4000', 'Wilmette', 0.5, 'Large', 'Yes', 'New', 80, 'Dominant North Shore real estate brokerage'),
  ('Portillo''s — Skokie', 'Restaurant', 'Marketing Dept', 'marketing@portillos.com', '(847) 673-1800', 'Skokie', 5.0, 'Large', 'Yes', 'New', 78, 'Major Chicago-area chain with sports sponsorship history'),
  ('Wintrust Bank — Wilmette', 'Financial Services', 'Branch Manager', 'wilmette@wintrust.com', '(847) 853-1880', 'Wilmette', 0.8, 'Large', 'Yes', 'New', 78, 'North Shore wealth management targeting affluent families'),
  ('Coldwell Banker — Winnetka', 'Real Estate', 'Office Manager', 'winnetka@coldwellbanker.com', '(847) 446-4000', 'Winnetka', 2.5, 'Large', 'Yes', 'New', 77, 'Major brokerage with North Shore relocation services'),
  ('Kumon — Wilmette', 'Education', 'Center Manager', 'wilmette@kumon.com', '(847) 256-3023', 'Wilmette', 1.0, 'Medium', 'No', 'New', 72, 'Academic tutoring center targeting families of school-age kids'),
  ('Fusion Academy — Evanston', 'Education', 'Head of School', 'evanston@fusionacademy.com', '(847) 905-0500', 'Evanston', 5.0, 'Medium', 'Unknown', 'New', 70, 'Private school offering flexible schedules for student-athletes'),
  ('Walker Bros. Pancake House', 'Restaurant', 'Owner/Manager', 'info@walkerbros.net', '(847) 251-6000', 'Wilmette', 1.0, 'Medium', 'No', 'New', 68, 'Iconic North Shore family restaurant, perfect post-game spot'),
  ('Pinstripes — Northbrook', 'Entertainment', 'Events Director', 'events@pinstripes.com', '(847) 480-2323', 'Northbrook', 6.0, 'Large', 'Yes', 'New', 67, 'Bowling/bocce/bistro — popular team party venue'),
  ('Airoom Architects & Builders', 'Home Services', 'Marketing Dir', 'info@airoom.com', '(847) 268-2199', 'Lincolnwood', 8.0, 'Medium', 'Yes', 'New', 67, 'High-end home remodeling for affluent homeowners'),
  ('CorePower Yoga — Wilmette', 'Fitness', 'Studio Manager', 'wilmette@corepoweryoga.com', '(847) 801-3800', 'Wilmette', 0.7, 'Medium', 'Unknown', 'New', 65, 'Popular yoga studio among hockey parents for cross-training'),
  ('Depot Nuevo', 'Restaurant', 'Owner', 'info@depotnuevo.com', '(847) 251-0101', 'Wilmette', 1.2, 'Small', 'No', 'New', 58, 'Popular family-friendly Mexican restaurant in downtown Wilmette'),
  ('Homer''s Ice Cream', 'Restaurant', 'Owner', 'info@homersicecream.com', '(847) 251-0477', 'Wilmette', 0.8, 'Small', 'No', 'New', 58, 'Beloved local ice cream shop, great post-game treat destination'),
  ('Wilmette Dental', 'Healthcare', 'Office Manager', 'info@wilmettedental.com', '(847) 256-2210', 'Wilmette', 1.0, 'Small', 'Unknown', 'New', 62, 'Well-established family dental practice'),
  ('State Farm — Mark Behrens Agency', 'Insurance', 'Agent', 'mark.behrens@statefarm.com', '(847) 256-2500', 'Wilmette', 0.5, 'Medium', 'Unknown', 'New', 55, 'Long-established Wilmette insurance agency'),
  ('North Shore Auto Werks', 'Automotive', 'Owner', 'info@nsautowerks.com', '(847) 432-0090', 'Winnetka', 2.0, 'Small', 'No', 'New', 52, 'Boutique European auto service trusted by local families'),
  ('Camp Bow Wow — Northbrook', 'Pet Services', 'Owner', 'northbrook@campbowwow.com', '(847) 205-1212', 'Northbrook', 6.0, 'Medium', 'Unknown', 'New', 52, 'Dog daycare/boarding — families with pets is a big overlap'),
  ('College Nannies + Sitters — Wilmette', 'Education', 'Owner', 'wilmette@collegenannies.com', '(847) 920-9100', 'Wilmette', 1.2, 'Small', 'Unknown', 'New', 60, 'Childcare and tutoring services for busy hockey families'),
  ('Wilmette Park District', 'Entertainment', 'Marketing Coordinator', 'info@wilmettepark.org', '(847) 256-6100', 'Wilmette', 0.5, 'Medium', 'Yes', 'New', 64, 'Community org — cross-promotion opportunity for youth programs'),
  ('Sky High Sports — Niles', 'Entertainment', 'Marketing Manager', 'niles@skyhighsports.com', '(847) 972-4200', 'Niles', 7.0, 'Medium', 'Unknown', 'New', 52, 'Trampoline park popular with hockey-age kids and families'),
  ('Computer Repair Doctor — Wilmette', 'Tech Services', 'Owner', 'info@crdrx.com', '(847) 250-2292', 'Wilmette', 0.8, 'Small', 'No', 'New', 43, 'Local tech repair shop trusted by families'),
  ('Schiller DuCanto & Fleck', 'Legal', 'Marketing Director', 'marketing@sdflaw.com', '(312) 641-5560', 'Chicago', 18.0, 'Large', 'Unknown', 'New', 47, 'Top family law firm, targets affluent North Shore clientele'),
  ('McGrath Lexus of Westmont', 'Automotive', 'Marketing Director', 'marketing@mcgrathlexus.com', '(630) 323-7000', 'Westmont', 25.0, 'Large', 'Yes', 'New', 65, 'Luxury dealer with extensive sports marketing budget');

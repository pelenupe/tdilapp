-- Initial seed data for tDIL production database
-- Seed: 001_initial_data

-- Insert initial admin user (password should be changed after first login)
-- Password: 'TempAdmin2024!' (bcrypt hash - this should be changed immediately)
INSERT INTO users (
    email, 
    password, 
    first_name, 
    last_name, 
    company, 
    job_title, 
    location, 
    user_type,
    is_verified,
    is_active
) VALUES 
('admin@tdil.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System', 'Administrator', 'tDIL', 'System Administrator', 'Indianapolis, IN', 'admin', TRUE, TRUE)
ON CONFLICT (email) DO NOTHING;

-- Insert sample reward categories and initial rewards
INSERT INTO rewards (
    title,
    description,
    points_cost,
    category,
    quantity,
    is_active
) VALUES
-- Gift Cards
('Starbucks Gift Card ($10)', '$10 Starbucks gift card for your morning coffee', 100, 'gift-cards', 50, TRUE),
('Amazon Gift Card ($25)', '$25 Amazon gift card for online shopping', 250, 'gift-cards', 30, TRUE),
('Local Restaurant Gift Card ($20)', '$20 gift card to popular local restaurants', 200, 'gift-cards', 25, TRUE),

-- Professional Development
('LinkedIn Premium (1 Month)', '1 month of LinkedIn Premium access', 200, 'professional', 25, TRUE),
('Professional Headshot Session', 'Professional headshot session with local photographer', 500, 'professional', 10, TRUE),
('Career Coaching Session (30 min)', '30-minute career coaching session with certified coach', 300, 'mentorship', 20, TRUE),
('Career Coaching Session (60 min)', '60-minute comprehensive career coaching session', 600, 'mentorship', 10, TRUE),

-- Events & Networking
('Tech Conference Ticket', 'Free ticket to local tech conference or meetup', 400, 'events', 15, TRUE),
('VIP Event Access', 'VIP access to exclusive tDIL networking events', 800, 'events', 5, TRUE),

-- Learning & Development  
('Online Course Credit ($50)', '$50 credit for online courses (Coursera, Udemy, etc.)', 500, 'learning', 20, TRUE),
('Technical Book Bundle', 'Bundle of 3 popular technical/professional books', 300, 'learning', 15, TRUE),
('Industry Report Access', 'Access to premium industry reports and insights', 150, 'learning', 25, TRUE),

-- Merchandise
('tDIL Branded Hoodie', 'High-quality tDIL branded hoodie', 400, 'merchandise', 20, TRUE),
('tDIL Water Bottle', 'Insulated tDIL branded water bottle', 150, 'merchandise', 30, TRUE),
('tDIL Laptop Sticker Pack', 'Pack of premium tDIL laptop stickers', 50, 'merchandise', 100, TRUE),

-- High-Value Rewards
('One-on-One Executive Mentorship', '90-minute mentorship session with C-level executive', 1200, 'mentorship', 5, TRUE),
('Professional Development Budget', '$200 budget for professional development of your choice', 2000, 'professional', 3, TRUE)

ON CONFLICT DO NOTHING;

-- Insert sample announcement categories and initial announcements
INSERT INTO announcements (
    title,
    content,
    category,
    is_featured,
    points,
    is_active,
    created_by
) VALUES
('Welcome to tDIL Career Platform', 
'Welcome to the tDIL Career Platform! Start earning points by participating in events, networking with other professionals, and engaging with our community. Check out the rewards section to see what you can earn!',
'Welcome',
TRUE,
0,
TRUE,
(SELECT id FROM users WHERE email = 'admin@tdil.com' LIMIT 1)),

('How to Earn Points', 
'There are many ways to earn points on the platform: attend events (+100-200 points), complete your profile (+50 points), refer new members (+25 points), and participate in community discussions. Points can be redeemed for rewards, gift cards, and exclusive experiences.',
'Guide',
FALSE,
0,
TRUE,
(SELECT id FROM users WHERE email = 'admin@tdil.com' LIMIT 1)),

('Community Guidelines',
'Please maintain professional behavior, respect all members, share meaningful content, and help create a positive environment for career growth and networking. Report any inappropriate behavior to administrators.',
'Guidelines', 
FALSE,
0,
TRUE,
(SELECT id FROM users WHERE email = 'admin@tdil.com' LIMIT 1))

ON CONFLICT DO NOTHING;

-- Insert some initial event categories for future events
-- (Actual events should be added by administrators)

-- Create initial points entry for admin user
INSERT INTO points_history (
    user_id,
    points,
    reason,
    type
) VALUES
((SELECT id FROM users WHERE email = 'admin@tdil.com' LIMIT 1), 1000, 'Initial admin points', 'bonus')
ON CONFLICT DO NOTHING;

-- Update admin user points
UPDATE users 
SET points = 1000, level = 10
WHERE email = 'admin@tdil.com';

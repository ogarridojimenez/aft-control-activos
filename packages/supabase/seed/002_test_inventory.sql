-- Create test inventory with correct user ID
INSERT INTO inventories (area_id, inventory_date, status, notes, created_by)
SELECT 
    (SELECT id FROM areas WHERE code = 'ADMIN'),
    CURRENT_DATE, 
    'completed', 
    'Test inventory for verification', 
    (SELECT id FROM users WHERE email = 'admin@ejemplo.com')
ON CONFLICT DO NOTHING;

-- Verify inventory was created
SELECT id, area_id, inventory_date, status FROM inventories;

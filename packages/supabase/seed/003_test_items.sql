-- Add inventory items (4 found, 1 missing)
INSERT INTO inventory_items (inventory_id, asset_id, quantity_expected, quantity_found, scanned_at, scanned_by)
SELECT 
    inv.id,
    a.id,
    1,
    CASE WHEN a.asset_id IN ('MB00001', 'MB00002', 'MB00003', 'MB00004') THEN 1 ELSE 0 END,
    CASE WHEN a.asset_id IN ('MB00001', 'MB00002', 'MB00003', 'MB00004') THEN NOW() ELSE NULL END,
    (SELECT id FROM users WHERE email = 'admin@ejemplo.com')
FROM inventories inv
CROSS JOIN assets a
WHERE inv.id = 'e923a4ed-cd19-4c1b-ab2a-0f8ecd629553'
AND a.area_id = inv.area_id
ON CONFLICT (inventory_id, asset_id) DO NOTHING;

-- Add reconciliation
INSERT INTO reconciliations (inventory_id, missing_assets, surplus_assets, summary, status)
SELECT 
    inv.id,
    jsonb_agg(jsonb_build_object('asset_id', a.asset_id, 'name', a.name, 'category', a.category, 'last_known_location', a.location)),
    '[{"asset_id":"MB99999","scanned_at":"2026-04-03T10:00:00Z","notes":"Activo encontrado fuera del area"}]'::jsonb,
    jsonb_build_object(
        'expected_count', 5,
        'found_count', 4,
        'missing_count', 1,
        'surplus_count', 1,
        'accuracy_percentage', 80
    ),
    'pending'
FROM inventories inv
CROSS JOIN assets a
WHERE inv.id = 'e923a4ed-cd19-4c1b-ab2a-0f8ecd629553'
AND a.area_id = inv.area_id
AND a.asset_id NOT IN ('MB00001', 'MB00002', 'MB00003', 'MB00004')
GROUP BY inv.id
ON CONFLICT (inventory_id) DO NOTHING;

-- Verify
SELECT 'items' AS tbl, COUNT(*) FROM inventory_items WHERE inventory_id = 'e923a4ed-cd19-4c1b-ab2a-0f8ecd629553'
UNION ALL
SELECT 'reconciliations', COUNT(*) FROM reconciliations WHERE inventory_id = 'e923a4ed-cd19-4c1b-ab2a-0f8ecd629553';

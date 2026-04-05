-- Seed data para AFT - PostgreSQL Local

-- Insertar areas
INSERT INTO areas (name, description, code, is_active) VALUES
    ('Oficinas Administrativas', 'Edificio principal - Piso 1 y 2', 'ADMIN', TRUE),
    ('Almacen Central', 'Bodega de almacenamiento principal', 'ALMACEN', TRUE),
    ('Planta de Produccion', 'Nave industrial - Lineas de produccion', 'PRODUCCION', TRUE),
    ('Laboratorio', 'Laboratorio de control de calidad', 'LAB', TRUE),
    ('Sala de Servidores', 'Datacenter y equipos de red', 'SERVERS', TRUE),
    ('Recepcion', 'Area de atencion al publico', 'RECEPCION', TRUE)
ON CONFLICT (code) DO NOTHING;

-- Insertar usuario admin (password: Admin123! - en produccion usar bcrypt)
INSERT INTO users (email, password_hash, full_name, role, area_id, is_active)
SELECT 
    'admin@ejemplo.com',
    'Admin123!',
    'Administrador Principal',
    'admin',
    id,
    TRUE
FROM areas WHERE code = 'ADMIN'
ON CONFLICT (email) DO NOTHING;

-- Insertar activos de prueba

-- Oficinas Administrativas
INSERT INTO assets (asset_id, name, description, category, brand, model, serial_number, purchase_date, purchase_value, current_value, location, area_id, status)
SELECT 'MB00001', 'Escritorio Ejecutivo', 'Escritorio en L de madera', 'Mobiliario', 'Herman Miller', 'Execute L-Desk', 'HM-2024-001', '2024-01-15', 1250.00, 1125.00, 'Oficina 101', id, 'active' FROM areas WHERE code = 'ADMIN' ON CONFLICT (asset_id) DO NOTHING;

INSERT INTO assets (asset_id, name, description, category, brand, model, serial_number, purchase_date, purchase_value, current_value, location, area_id, status)
SELECT 'MB00002', 'Silla Ergonomica', 'Silla de oficina con soporte lumbar', 'Mobiliario', 'Steelcase', 'Leap V2', 'SC-2024-002', '2024-01-15', 850.00, 765.00, 'Oficina 101', id, 'active' FROM areas WHERE code = 'ADMIN' ON CONFLICT (asset_id) DO NOTHING;

INSERT INTO assets (asset_id, name, description, category, brand, model, serial_number, purchase_date, purchase_value, current_value, location, area_id, status)
SELECT 'MB00003', 'Monitor 27 pulgadas', 'Monitor 4K USB-C', 'Electronico', 'Dell', 'U2723QE', 'DL-2024-003', '2024-02-20', 520.00, 468.00, 'Oficina 102', id, 'active' FROM areas WHERE code = 'ADMIN' ON CONFLICT (asset_id) DO NOTHING;

INSERT INTO assets (asset_id, name, description, category, brand, model, serial_number, purchase_date, purchase_value, current_value, location, area_id, status)
SELECT 'MB00004', 'Laptop Corporativa', 'Laptop para uso administrativo', 'Computadora', 'Lenovo', 'ThinkPad T14', 'LN-2024-004', '2024-03-10', 1350.00, 1215.00, 'Oficina 103', id, 'active' FROM areas WHERE code = 'ADMIN' ON CONFLICT (asset_id) DO NOTHING;

INSERT INTO assets (asset_id, name, description, category, brand, model, serial_number, purchase_date, purchase_value, current_value, location, area_id, status)
SELECT 'MB00005', 'Impresora Multifuncional', 'Impresora laser color red', 'Electronico', 'HP', 'Color LaserJet Pro', 'HP-2024-005', '2024-01-20', 450.00, 405.00, 'Sala de copias', id, 'active' FROM areas WHERE code = 'ADMIN' ON CONFLICT (asset_id) DO NOTHING;

-- Almacen Central
INSERT INTO assets (asset_id, name, description, category, brand, model, serial_number, purchase_date, purchase_value, current_value, location, area_id, status)
SELECT 'MB00010', 'Montacargas Electrico', 'Montacargas para pallets', 'Maquinaria', 'Toyota', '8FBN25', 'TY-2023-010', '2023-06-15', 25000.00, 20000.00, 'Zona A', id, 'active' FROM areas WHERE code = 'ALMACEN' ON CONFLICT (asset_id) DO NOTHING;

INSERT INTO assets (asset_id, name, description, category, brand, model, serial_number, purchase_date, purchase_value, current_value, location, area_id, status)
SELECT 'MB00011', 'Estanteria Industrial', 'Estanteria metalica 6 niveles', 'Mobiliario', 'Interlake', 'Mecalux-6', 'IL-2023-011', '2023-08-01', 3200.00, 2720.00, 'Pasillo 3', id, 'active' FROM areas WHERE code = 'ALMACEN' ON CONFLICT (asset_id) DO NOTHING;

INSERT INTO assets (asset_id, name, description, category, brand, model, serial_number, purchase_date, purchase_value, current_value, location, area_id, status)
SELECT 'MB00012', 'Scanner de Codigo de Barras', 'Scanner inalambrico para inventario', 'Electronico', 'Zebra', 'DS2278', 'ZB-2024-012', '2024-04-05', 380.00, 342.00, 'Estacion de control', id, 'active' FROM areas WHERE code = 'ALMACEN' ON CONFLICT (asset_id) DO NOTHING;

INSERT INTO assets (asset_id, name, description, category, brand, model, serial_number, purchase_date, purchase_value, current_value, location, area_id, status)
SELECT 'MB00013', 'Bascula Digital Industrial', 'Bascula plataforma 500kg', 'Instrumento', 'Ohaus', 'Defender 5000', 'OH-2023-013', '2023-11-20', 1800.00, 1530.00, 'Zona de recepcion', id, 'active' FROM areas WHERE code = 'ALMACEN' ON CONFLICT (asset_id) DO NOTHING;

-- Planta de Produccion
INSERT INTO assets (asset_id, name, description, category, brand, model, serial_number, purchase_date, purchase_value, current_value, location, area_id, status)
SELECT 'MB00020', 'CNC Router', 'Router CNC 3 ejes', 'Maquinaria', 'Haas', 'VF-2SS', 'HS-2022-020', '2022-09-10', 85000.00, 63750.00, 'Linea 1', id, 'active' FROM areas WHERE code = 'PRODUCCION' ON CONFLICT (asset_id) DO NOTHING;

INSERT INTO assets (asset_id, name, description, category, brand, model, serial_number, purchase_date, purchase_value, current_value, location, area_id, status)
SELECT 'MB00021', 'Compresor de Aire', 'Compresor de tornillo 20HP', 'Maquinaria', 'Atlas Copco', 'GA 15', 'AC-2023-021', '2023-03-15', 12000.00, 9600.00, 'Sala de maquinas', id, 'active' FROM areas WHERE code = 'PRODUCCION' ON CONFLICT (asset_id) DO NOTHING;

INSERT INTO assets (asset_id, name, description, category, brand, model, serial_number, purchase_date, purchase_value, current_value, location, area_id, status)
SELECT 'MB00022', 'Brazo Robotico', 'Brazo robotico para ensamblaje', 'Maquinaria', 'FANUC', 'M-20iA/25', 'FN-2023-022', '2023-07-01', 45000.00, 38250.00, 'Linea 2', id, 'active' FROM areas WHERE code = 'PRODUCCION' ON CONFLICT (asset_id) DO NOTHING;

INSERT INTO assets (asset_id, name, description, category, brand, model, serial_number, purchase_date, purchase_value, current_value, location, area_id, status)
SELECT 'MB00023', 'Banda Transportadora', 'Banda transportadora 10m', 'Maquinaria', 'Custom', 'BT-10M', 'CT-2023-023', '2023-05-20', 8500.00, 7225.00, 'Linea 1', id, 'active' FROM areas WHERE code = 'PRODUCCION' ON CONFLICT (asset_id) DO NOTHING;

-- Laboratorio
INSERT INTO assets (asset_id, name, description, category, brand, model, serial_number, purchase_date, purchase_value, current_value, location, area_id, status)
SELECT 'MB00030', 'Microscopio Digital', 'Microscopio con camara integrada', 'Instrumento', 'Olympus', 'CX23', 'OL-2024-030', '2024-01-10', 2800.00, 2520.00, 'Mesa 1', id, 'active' FROM areas WHERE code = 'LAB' ON CONFLICT (asset_id) DO NOTHING;

INSERT INTO assets (asset_id, name, description, category, brand, model, serial_number, purchase_date, purchase_value, current_value, location, area_id, status)
SELECT 'MB00031', 'Espectrofotometro', 'Espectrofotometro UV-Vis', 'Instrumento', 'Shimadzu', 'UV-1900', 'SH-2023-031', '2023-10-05', 15000.00, 12750.00, 'Mesa 2', id, 'active' FROM areas WHERE code = 'LAB' ON CONFLICT (asset_id) DO NOTHING;

INSERT INTO assets (asset_id, name, description, category, brand, model, serial_number, purchase_date, purchase_value, current_value, location, area_id, status)
SELECT 'MB00032', 'Balanza Analitica', 'Balanza de precision 0.1mg', 'Instrumento', 'Mettler Toledo', 'XPR205', 'MT-2024-032', '2024-02-15', 6500.00, 5850.00, 'Mesa 3', id, 'active' FROM areas WHERE code = 'LAB' ON CONFLICT (asset_id) DO NOTHING;

-- Sala de Servidores
INSERT INTO assets (asset_id, name, description, category, brand, model, serial_number, purchase_date, purchase_value, current_value, location, area_id, status)
SELECT 'MB00040', 'Servidor Principal', 'Servidor rack 2U - Produccion', 'Servidor', 'Dell', 'PowerEdge R750', 'DL-2023-040', '2023-04-01', 18000.00, 14400.00, 'Rack A1', id, 'active' FROM areas WHERE code = 'SERVERS' ON CONFLICT (asset_id) DO NOTHING;

INSERT INTO assets (asset_id, name, description, category, brand, model, serial_number, purchase_date, purchase_value, current_value, location, area_id, status)
SELECT 'MB00041', 'Switch de Red', 'Switch gestionable 48 puertos', 'Red', 'Cisco', 'Catalyst 9300', 'CS-2023-041', '2023-04-01', 5500.00, 4400.00, 'Rack B1', id, 'active' FROM areas WHERE code = 'SERVERS' ON CONFLICT (asset_id) DO NOTHING;

INSERT INTO assets (asset_id, name, description, category, brand, model, serial_number, purchase_date, purchase_value, current_value, location, area_id, status)
SELECT 'MB00042', 'UPS Industrial', 'UPS trifasico 30kVA', 'Energia', 'APC', 'Smart-UPS VT', 'AP-2023-042', '2023-04-01', 12000.00, 9600.00, 'Sala electrica', id, 'active' FROM areas WHERE code = 'SERVERS' ON CONFLICT (asset_id) DO NOTHING;

INSERT INTO assets (asset_id, name, description, category, brand, model, serial_number, purchase_date, purchase_value, current_value, location, area_id, status)
SELECT 'MB00043', 'Firewall', 'Firewall de proxima generacion', 'Red', 'Palo Alto', 'PA-3260', 'PA-2023-043', '2023-06-15', 8500.00, 6800.00, 'Rack B2', id, 'active' FROM areas WHERE code = 'SERVERS' ON CONFLICT (asset_id) DO NOTHING;

INSERT INTO assets (asset_id, name, description, category, brand, model, serial_number, purchase_date, purchase_value, current_value, location, area_id, status)
SELECT 'MB00044', 'Aire Acondicionado CRAC', 'Unidad de climatizacion para datacenter', 'Climatizacion', 'Liebert', 'CRAC 20T', 'LT-2022-044', '2022-11-01', 9500.00, 6650.00, 'Sala de servidores', id, 'maintenance' FROM areas WHERE code = 'SERVERS' ON CONFLICT (asset_id) DO NOTHING;

-- Verificacion
SELECT 'areas' AS tabla, COUNT(*) AS total FROM areas
UNION ALL
SELECT 'assets', COUNT(*) FROM assets
UNION ALL
SELECT 'users', COUNT(*) FROM users;

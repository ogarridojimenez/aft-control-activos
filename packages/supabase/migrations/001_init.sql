-- Sistema de Control de Activos Fijos Tangibles (AFT)
-- Esquema de Base de Datos para Supabase (PostgreSQL)

-- Extensión UUID para generación de IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla de áreas de inventario
CREATE TABLE areas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    code VARCHAR(20) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de activos fijos
CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id VARCHAR(20) UNIQUE NOT NULL CHECK (asset_id ~ '^MB[0-9]{5,}$'),  -- MB + 5+ dígitos
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    brand VARCHAR(100),
    model VARCHAR(100),
    serial_number VARCHAR(100),
    purchase_date DATE,
    purchase_value DECIMAL(15, 2),
    current_value DECIMAL(15, 2),
    location VARCHAR(200),
    area_id UUID REFERENCES areas(id),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'retired', 'lost')),
    qr_code TEXT,  -- Ruta o datos del QR
    image_url TEXT,  -- URL en Supabase Storage
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Tabla de usuarios (extiende auth.users de Supabase)
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    full_name VARCHAR(200) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'supervisor', 'operator', 'auditor')),
    area_id UUID REFERENCES areas(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de inventarios (sesiones de conteo)
CREATE TABLE inventories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    area_id UUID NOT NULL REFERENCES areas(id),
    inventory_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Tabla de conteos de activos en inventario
CREATE TABLE inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_id UUID NOT NULL REFERENCES inventories(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    quantity_expected INTEGER DEFAULT 1,
    quantity_found INTEGER DEFAULT 0,
    condition_notes TEXT,
    scanned_at TIMESTAMP WITH TIME ZONE,
    scanned_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(inventory_id, asset_id)
);

-- Tabla de conciliaciones (resultados de comparación)
CREATE TABLE reconciliations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_id UUID NOT NULL REFERENCES inventories(id) ON DELETE CASCADE UNIQUE,
    reconciliation_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    missing_assets JSONB DEFAULT '[]',  -- Array de asset_ids faltantes
    surplus_assets JSONB DEFAULT '[]',  -- Array de asset_ids sobrantes (no esperados)
    summary JSONB DEFAULT '{}',  -- Estadísticas de conciliación
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de sincronización offline (para tracking de cambios locales)
CREATE TABLE offline_sync (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL,  -- 'asset', 'inventory_item', etc.
    entity_id UUID NOT NULL,
    operation VARCHAR(10) NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    local_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    synced BOOLEAN DEFAULT FALSE,
    sync_attempts INTEGER DEFAULT 0,
    last_sync_attempt TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    device_id VARCHAR(100),  -- ID único del dispositivo móvil
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_assets_asset_id ON assets(asset_id);
CREATE INDEX idx_assets_area_id ON assets(area_id);
CREATE INDEX idx_inventory_items_inventory_id ON inventory_items(inventory_id);
CREATE INDEX idx_inventory_items_asset_id ON inventory_items(asset_id);
CREATE INDEX idx_inventory_items_scanned_at ON inventory_items(scanned_at);
CREATE INDEX idx_reconciliations_inventory_id ON reconciliations(inventory_id);
CREATE INDEX idx_offline_sync_entity ON offline_sync(entity_type, entity_id);
CREATE INDEX idx_offline_sync_synced ON offline_sync(synced) WHERE synced = FALSE;

-- Comentarios en tablas
COMMENT ON TABLE assets IS 'Tabla principal de activos fijos tangibles';
COMMENT ON COLUMN assets.asset_id IS 'Formato: MB seguido de 5 o más dígitos (ej: MB00001)';
COMMENT ON TABLE inventories IS 'Sesiones de conteo de inventario por área';
COMMENT ON TABLE inventory_items IS 'Detalle de conteo de cada activo en un inventario';
COMMENT ON TABLE reconciliations IS 'Resultados de comparación entre esperado y encontrado';
COMMENT ON TABLE offline_sync IS 'Tracking de cambios hechos en modo offline para sincronización posterior';
-- Habilitar Row Level Security (RLS) en todas las tablas
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventories ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE offline_sync ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para áreas
CREATE POLICY "Users can view active areas" ON areas
    FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Admins can manage areas" ON areas
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.id = auth.uid() AND up.role = 'admin'
        )
    );

-- Políticas RLS para activos
CREATE POLICY "Users can view assets in their area" ON assets
    FOR SELECT USING (
        area_id IN (
            SELECT area_id FROM user_profiles WHERE id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.id = auth.uid() AND up.role IN ('admin', 'auditor')
        )
    );

CREATE POLICY "Admins can manage assets" ON assets
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.id = auth.uid() AND up.role = 'admin'
        )
    );

-- Políticas RLS para perfiles de usuario
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles" ON user_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.id = auth.uid() AND up.role = 'admin'
        )
    );

-- Políticas RLS para inventarios
CREATE POLICY "Users can view inventories in their area" ON inventories
    FOR SELECT USING (
        area_id IN (
            SELECT area_id FROM user_profiles WHERE id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.id = auth.uid() AND up.role IN ('admin', 'auditor')
        )
    );

CREATE POLICY "Users can manage inventories in their area" ON inventories
    FOR ALL USING (
        area_id IN (
            SELECT area_id FROM user_profiles WHERE id = auth.uid()
        )
    );

-- Políticas RLS para items de inventario
CREATE POLICY "Users can view inventory items in their area" ON inventory_items
    FOR SELECT USING (
        inventory_id IN (
            SELECT id FROM inventories WHERE area_id IN (
                SELECT area_id FROM user_profiles WHERE id = auth.uid()
            )
        ) OR
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.id = auth.uid() AND up.role IN ('admin', 'auditor')
        )
    );

CREATE POLICY "Users can manage inventory items in their area" ON inventory_items
    FOR ALL USING (
        inventory_id IN (
            SELECT id FROM inventories WHERE area_id IN (
                SELECT area_id FROM user_profiles WHERE id = auth.uid()
            )
        )
    );

-- Políticas RLS para conciliaciones
CREATE POLICY "Users can view reconciliations in their area" ON reconciliations
    FOR SELECT USING (
        inventory_id IN (
            SELECT id FROM inventories WHERE area_id IN (
                SELECT area_id FROM user_profiles WHERE id = auth.uid()
            )
        ) OR
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.id = auth.uid() AND up.role IN ('admin', 'auditor')
        )
    );

CREATE POLICY "Users can manage reconciliations in their area" ON reconciliations
    FOR ALL USING (
        inventory_id IN (
            SELECT id FROM inventories WHERE area_id IN (
                SELECT area_id FROM user_profiles WHERE id = auth.uid()
            )
        )
    );

-- Políticas RLS para sincronización offline
CREATE POLICY "Users can view own offline sync records" ON offline_sync
    FOR SELECT USING (device_id = current_setting('app.current_device_id')::VARCHAR);

CREATE POLICY "Users can manage own offline sync records" ON offline_sync
    FOR ALL USING (device_id = current_setting('app.current_device_id')::VARCHAR);

-- Función para establecer el device_id en la sesión (para RLS)
CREATE OR REPLACE FUNCTION set_current_device_id(device_id VARCHAR)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_device_id', device_id, true);
END;
$$ LANGUAGE plpgsql;

-- Triggers para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_areas_updated_at BEFORE UPDATE ON areas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON assets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventories_updated_at BEFORE UPDATE ON inventories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON inventory_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reconciliations_updated_at BEFORE UPDATE ON reconciliations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_offline_sync_updated_at BEFORE UPDATE ON offline_sync
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
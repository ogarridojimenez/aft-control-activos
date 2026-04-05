// Tipos compartidos entre admin y mobile
export interface Asset {
  id: string;
  asset_id: string; // Formato: MB00001
  name: string;
  description?: string;
  category?: string;
  brand?: string;
  model?: string;
  serial_number?: string;
  purchase_date?: string; // ISO date string
  purchase_value?: number;
  current_value?: number;
  location?: string;
  area_id: string;
  status: 'active' | 'maintenance' | 'retired' | 'lost';
  qr_code?: string;
  image_url?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface Area {
  id: string;
  name: string;
  description?: string;
  code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  full_name: string;
  role: 'admin' | 'supervisor' | 'operator' | 'auditor';
  area_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Inventory {
  id: string;
  area_id: string;
  inventory_date: string; // ISO date string
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface InventoryItem {
  id: string;
  inventory_id: string;
  asset_id: string;
  quantity_expected: number;
  quantity_found: number;
  condition_notes?: string;
  scanned_at?: string; // ISO datetime string
  scanned_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Reconciliation {
  id: string;
  inventory_id: string;
  reconciliation_date: string; // ISO datetime string
  missing_assets: Array<{
    asset_id: string;
    name: string;
    category?: string;
    last_known_location?: string;
  }>;
  surplus_assets: Array<{
    asset_id: string;
    scanned_at: string;
    notes?: string;
  }>;
  summary: {
    expected_count: number;
    found_count: number;
    missing_count: number;
    surplus_count: number;
    accuracy_percentage: number;
  };
  status: 'pending' | 'reviewed' | 'approved' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface OfflineSync {
  id: string;
  entity_type: 'asset' | 'inventory_item' | 'inventory' | 'reconciliation';
  entity_id: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  local_timestamp: string; // ISO datetime string
  synced: boolean;
  sync_attempts: number;
  last_sync_attempt?: string;
  error_message?: string;
  device_id: string;
  created_at: string;
}

// Formato de ID de activo
export interface AssetIdFormat {
  value: string;
  isValid: boolean;
  error?: string;
}

// Filtros y paginación
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
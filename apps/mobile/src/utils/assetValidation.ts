// Funciones temporales de validación de assets
// Copiadas de @aft/shared para evitar problemas de dependencias

export const ASSET_ID_REGEX = /^MB\d{5,}$/;

export interface ValidationResult {
  valid: boolean;
  assetId: string;
  error?: string;
}

export function validateAssetId(assetId: string): boolean {
  return ASSET_ID_REGEX.test(assetId.trim());
}

export function sanitizeAssetId(input: string): string {
  const cleaned = input.trim().toUpperCase().replace(/\s+/g, '');
  if (!cleaned.startsWith('MB')) {
    return `MB${cleaned.replace(/^MB/i, '')}`;
  }
  return cleaned;
}

export function validateAssetIdDetailed(input: string): ValidationResult {
  const sanitized = sanitizeAssetId(input);
  
  if (!sanitized || sanitized.length < 7) {
    return { valid: false, assetId: sanitized, error: 'ID demasiado corto (mínimo MB + 5 dígitos)' };
  }
  
  if (!sanitized.startsWith('MB')) {
    return { valid: false, assetId: sanitized, error: 'Debe comenzar con MB' };
  }
  
  const digitsOnly = sanitized.substring(2);
  if (!/^\d+$/.test(digitsOnly)) {
    return { valid: false, assetId: sanitized, error: 'Después de MB solo se permiten dígitos' };
  }
  
  if (!ASSET_ID_REGEX.test(sanitized)) {
    return { valid: false, assetId: sanitized, error: 'Formato inválido: MB seguido de 5+ dígitos' };
  }
  
  return { valid: true, assetId: sanitized };
}
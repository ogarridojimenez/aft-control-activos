import { ASSET_ID_REGEX } from '../constants/assetId';

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

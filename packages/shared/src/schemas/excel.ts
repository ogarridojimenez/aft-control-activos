import { z } from 'zod';
import { ASSET_ID_REGEX } from '../constants/assetId';

const str = z.preprocess((v) => (v == null || v === '' ? undefined : String(v)), z.string());

export const excelRowSchema = z.object({
  asset_id: z.preprocess(
    (v) => (v == null ? '' : String(v).trim().toUpperCase()),
    z.string().regex(ASSET_ID_REGEX, {
      message: 'ID de activo debe seguir el formato MB seguido de 5 o más dígitos',
    })
  ),
  name: z.preprocess((v) => (v == null ? '' : String(v).trim()), z.string().min(1)),
  description: str.optional(),
  category: str.optional(),
  brand: str.optional(),
  model: str.optional(),
  serial_number: str.optional(),
  /** Excel puede enviar string, Date o número serial; normalización en el servidor */
  purchase_date: z.unknown().optional(),
  purchase_value: z.preprocess(
    (v) => (v === '' || v == null ? undefined : v),
    z.coerce.number().nonnegative().optional()
  ),
  location: str.optional(),
  area_code: z.preprocess((v) => (v == null ? '' : String(v).trim()), z.string().min(1)),
});

export type ExcelRowInput = z.infer<typeof excelRowSchema>;

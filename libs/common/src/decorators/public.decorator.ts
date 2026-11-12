import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a Gateway route as publicly accessible without a Supabase JWT.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

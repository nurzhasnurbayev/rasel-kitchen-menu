import type { ParamMatcher } from '@sveltejs/kit';
import { isLang, type Lang } from '$lib/i18n';

/** Only /kk and /ru are menu pages; anything else falls through to a 404. */
export const match = ((param: string): param is Lang => isLang(param)) satisfies ParamMatcher;

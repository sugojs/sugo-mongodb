import * as crypto from 'crypto';
import { IDynamicObject } from './Interfaces';

export const TRIM = (value: string, doc: IDynamicObject) => value.trim();
export const HASH = (options: { algorith: string; salt: string }) => (value: string, doc: IDynamicObject) =>
  crypto
    .createHmac(options.algorith, options.salt)
    .update(value)
    .digest('hex');
export const TO_LOWERCASE = (value: string) => value.toLowerCase();
export const TO_UPPERCASE = (value: string) => value.toUpperCase();

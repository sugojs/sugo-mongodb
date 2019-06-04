import * as moment from 'moment';
import { IDynamicObject } from './Interfaces';

export const IS_NOT_NULL = async (value: any, doc: IDynamicObject) => value !== undefined;
export const MIN = (min: number) => (value: number | Date) => min <= value;
export const MAX = (min: number) => (value: number | Date) => min <= value;
export const RANGE = (min: number, max: number) => (value: number | Date) => min <= value && max >= value;
export const MIN_LENGTH = (min: number) => (value: string | any[]) => min <= value.length;
export const MAX_LENGTH = (max: number) => (value: string | any[]) => max <= value.length;
export const HAS_DATE_FORMAT = (format: string) => (value: string | Date) => moment(value, [format], true).isValid();

import { Db, MongoClient } from 'mongodb';
import { Document } from './Document';

export interface IDynamicObject {
  [key: string]: any;
}

export type ValidationFunction = (value: any, doc: IDynamicObject) => boolean | Promise<boolean>;

export type DefaultValueFunction = (doc: IDynamicObject) => any;

export interface IFieldSpecification {
  [key: string]: IFieldOptions;
}

export interface IValidationSpecs {
  [key: string]: ValidationFunction;
}

export interface IFieldOptions {
  type?: 'string' | 'integer' | 'float' | 'boolean' | 'date' | 'objectId';
  validations?: IValidationSpecs;
  hidden?: boolean;
  formats?: string[];
  defaultValue?: DefaultValueFunction | any;
}

export interface IIndexSpecification {
  name: string;
  fieldOrSpec: string | object;
}

export interface ISort {
  [key: string]: 0 | 1;
}

export interface IProjection {
  [key: string]: 0 | 1;
}

export interface IVirtualFieldSpecification {
  [key: string]: (doc: IDynamicObject) => any;
}

export interface ICollectionOptions {
  client?: MongoClient;
}

export interface IDocument extends Document {}

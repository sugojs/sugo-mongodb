import { Db, MongoClient } from 'mongodb';
import { Document } from './Document';

export interface IDynamicObject {
  [key: string]: any;
}

export type ValidationFunction<T = any> = (value: any, doc: T) => boolean | Promise<boolean>;

export type DefaultValueFunction<T = any> = (doc: T) => any;

export interface IFieldSpecification<T = any> {
  [key: string]: IFieldOptions<T>;
}

export interface IValidationSpecs<T = any> {
  [key: string]: ValidationFunction<T>;
}

export type FieldType = 'string' | 'integer' | 'float' | 'boolean' | 'date' | 'objectId';

export interface IFieldOptions<T = any> {
  type?: FieldType;
  validations?: IValidationSpecs<T>;
  hidden?: boolean;
  formats?: string[];
  defaultValue?: DefaultValueFunction<T> | any;
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

export interface IDocumentInternals {
  client: MongoClient;
  collectionName: string;
  fields: IFieldSpecification;
  createdAtKey: string;
  updatedAtKey: string;
  deleted: boolean;
}

import * as dotObject from 'dot-object';
import * as moment from 'moment';
import {
  Collection as MongoCollection,
  Db,
  FindAndModifyWriteOpResultObject,
  MongoClient,
  ObjectId,
  WriteOpResult,
} from 'mongodb';
import { client } from './Client';
import { Document } from './Document';
import {
  ICollectionOptions,
  IDocument,
  IDynamicObject,
  IFieldSpecification,
  IIndexSpecification,
  IProjection,
  ISort,
} from './Interfaces';
import { getMongoCollection, processFindOneAndWriteResult } from './Mongodb';
export const DEFAULT_DATE_FORMAT = [
  moment.HTML5_FMT.DATETIME_LOCAL,
  moment.HTML5_FMT.DATETIME_LOCAL_SECONDS,
  moment.HTML5_FMT.DATETIME_LOCAL_MS,
  moment.HTML5_FMT.DATE,
];
export const FALSE_VALUES = ['false', 0, false];
export const TRUE_VALUES = ['true', 1, true];
export const FIELD_TYPES = {
  BOOLEAN: 'boolean',
  DATE: 'date',
  FLOAT: 'float',
  INTEGER: 'integer',
  OBJECT_ID: 'objectId',
  STRING: 'string',
};
export const CREATED_AT_KEY = 'createdAt';
export const UPDATED_AT_KEY = 'updatedAtKey';

export class Collection<T extends IDocument> {
  public name: string;
  public fields: IFieldSpecification<T>;
  public indexes: IIndexSpecification[] = [];
  public createdAtKey = CREATED_AT_KEY;
  public updatedAtKey = UPDATED_AT_KEY;
  public options: ICollectionOptions;
  public client: MongoClient;

  constructor(name: string, fields: IFieldSpecification<T> = {}, options: ICollectionOptions = {}) {
    this.name = name;
    this.fields = fields;
    this.options = options;
    this.client = options.client ? options.client : client;
  }

  public new(data: Partial<T>): T {
    const instance = new Document(data, this);
    instance.addDefaultValues();
    instance.parse();
    instance.addCreatedAt();
    return instance as T;
  }

  public async list(
    filter: IDynamicObject = {},
    projection?: IProjection,
    limit?: number,
    skip?: number,
    sort?: ISort,
  ): Promise<T[]> {
    const col = await getMongoCollection(this.client, this.name);
    const docs = await col.find(filter, { limit, skip, sort, projection }).toArray();
    const instances = docs.map(d => this.new(d));
    return instances;
  }

  public async count(filter: IDynamicObject = {}): Promise<number> {
    const col = await getMongoCollection(this.client, this.name);
    return await col.countDocuments(filter);
  }

  public async get(filter: IDynamicObject = {}, projection?: IProjection): Promise<T | null> {
    const collection = await getMongoCollection(this.client, this.name);
    const instance = await collection.findOne(filter, { projection });
    return instance ? this.new(instance) : null;
  }

  public async getById(id: string | ObjectId, projection?: IProjection): Promise<T | null> {
    const collection = await getMongoCollection(this.client, this.name);
    const instance = await collection.findOne({ _id: id }, { projection });
    return instance ? this.new(instance) : null;
  }

  public async create(data: Partial<T>): Promise<T | null> {
    const col = await getMongoCollection(this.client, this.name);
    const instance = this.new(data);
    await instance.validate();
    const { ops } = await col.insertOne(data);
    const [doc] = ops;
    return doc ? this.new(doc) : null;
  }

  public async patchById(id: ObjectId | string, data: Partial<T>): Promise<T | null> {
    const col = await getMongoCollection(this.client, this.name);
    const instance = await this.getById(id);
    if (!instance) {
      return null;
    }
    instance.merge(data);
    instance.addUpdatedAt();
    instance.parse();
    await instance.validate();
    const result = await col.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: instance.lean() },
      { returnOriginal: false },
    );
    const doc = processFindOneAndWriteResult(result);
    return this.new(doc);
  }

  public async deleteById(id: ObjectId | string): Promise<T | null> {
    const col = await getMongoCollection(this.client, this.name);
    const deleted = await col.findOneAndDelete({ _id: new ObjectId(id) });
    const doc = processFindOneAndWriteResult(deleted);
    return this.new(doc);
  }
}

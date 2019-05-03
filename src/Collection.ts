import * as dotObject from 'dot-object';
import * as moment from 'moment';
import {
  Collection as MongoCollection,
  Db,
  FindAndModifyWriteOpResultObject,
  MongoClient,
  MongoClientOptions,
  ObjectId,
  WriteOpResult,
} from 'mongodb';
import { Document } from './Document';
import { ParsingError, ValidationError } from './exceptions';
import {
  ICollectionOptions,
  IDynamicObject,
  IFieldSpecification,
  IIndexSpecification,
  IProjection,
  ISort,
  IVirtualFieldSpecification,
} from './Interfaces';
const defaultFormats = [
  moment.HTML5_FMT.DATETIME_LOCAL,
  moment.HTML5_FMT.DATETIME_LOCAL_SECONDS,
  moment.HTML5_FMT.DATETIME_LOCAL_MS,
  moment.HTML5_FMT.DATE,
];

export const DEFAULT_URI = 'mongodb://localhost:27017/test';
let client: MongoClient = new MongoClient(DEFAULT_URI);

export const connect = async (uri: string, options?: MongoClientOptions) =>
  (client = await new MongoClient(uri, options).connect());

export const disconnect = async () => client.close();

export class Collection<T extends Document> {
  public get Model() {
    return Object.getPrototypeOf(this).constructor;
  }
  public name: string;
  public fields: IFieldSpecification;
  public indexes: IIndexSpecification[] = [];
  public virtuals: IVirtualFieldSpecification;
  public createdAtKey = 'createdAt';
  public updatedAtKey = 'updatedAtKey';
  public options: ICollectionOptions;
  public client: MongoClient;

  constructor(name: string, fields: IFieldSpecification = {}, options: ICollectionOptions = {}) {
    this.name = name;
    this.fields = fields;
    this.options = options;
    this.client = options.client ? options.client : client;
    this.virtuals = options.virtuals ? options.virtuals : {};
  }

  public async getDb(): Promise<Db> {
    if (!client.isConnected()) {
      await client.connect();
    }
    return client.db();
  }

  public async getMongoCollection(): Promise<MongoCollection> {
    const db = await this.getDb();
    return db.collection(this.name);
  }

  public processCreateResult(res: WriteOpResult): T | null {
    if (res.ops && res.ops.length && res.ops.length > 0) {
      const [doc] = res.ops;
      return new Document(this, doc) as T;
    }
    return null;
  }

  public processFindOneAndWriteResult(res: FindAndModifyWriteOpResultObject) {
    return res.value ? (new Document(this, res.value) as T) : null;
  }

  public addCreatedAt(data: IDynamicObject) {
    Object.defineProperty(data, this.createdAtKey, { value: new Date() });
    return this;
  }

  public addUpdatedAt(data: IDynamicObject) {
    Object.defineProperty(data, this.updatedAtKey, { value: new Date() });
    return this;
  }

  public merge(obj: IDynamicObject) {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = dotObject.pick(key, obj);
        dotObject.set(key, value, obj, false);
      }
    }
    return this;
  }

  public addDefaultValues(data: IDynamicObject) {
    const fieldSpecs: IFieldSpecification = this.fields;
    for (const fieldKey in fieldSpecs) {
      if (fieldSpecs.hasOwnProperty(fieldKey)) {
        const currentValue = dotObject.pick(fieldKey, data, false);
        const defaultValue = fieldSpecs[fieldKey].defaultValue;
        if (currentValue === undefined && defaultValue) {
          dotObject.set(fieldKey, defaultValue, data, false);
        }
      }
    }
    return this;
  }

  public parse(data: IDynamicObject) {
    const fieldSpecs: IFieldSpecification = this.fields;
    for (const fieldKey in fieldSpecs) {
      if (fieldSpecs.hasOwnProperty(fieldKey)) {
        const currentValue = dotObject.pick(fieldKey, data, false);
        const valueType = fieldSpecs[fieldKey].type;
        let parsedValue;
        switch (valueType) {
          case 'boolean':
            if (['false', 0, false].includes(currentValue)) {
              parsedValue = false;
            } else if (['true', 1, true].includes(currentValue)) {
              parsedValue = true;
            } else {
              throw new ParsingError(fieldKey, currentValue, valueType);
            }
            break;
          case 'date':
            parsedValue = moment.utc(
              currentValue,
              fieldSpecs[fieldKey].formats.length > 0 ? fieldSpecs[fieldKey].formats : defaultFormats,
              true,
            );
            if (!parsedValue.isValid()) {
              throw new ParsingError(fieldKey, currentValue, valueType);
            }
            parsedValue = parsedValue.toDate();
            break;
          case 'float':
            if (isNaN(currentValue)) {
              throw new ParsingError(fieldKey, currentValue, valueType);
            }
            parsedValue = parseFloat(currentValue);
            break;
          case 'integer':
            if (isNaN(currentValue)) {
              throw new ParsingError(fieldKey, currentValue, valueType);
            }
            parsedValue = parseInt(currentValue, 10);
            break;
          case 'objectId':
            if (ObjectId.isValid(currentValue)) {
              throw new ParsingError(fieldKey, currentValue, valueType);
            }
            parsedValue = new ObjectId(currentValue);
            break;
          case 'string':
            parsedValue = typeof currentValue !== 'string' ? currentValue.toString() : currentValue;
            break;
          default:
            break;
        }
        dotObject.set(fieldKey, parsedValue, data, false);
      }
    }
    return data;
  }

  public async validate(data: IDynamicObject) {
    const fieldSpecs: IFieldSpecification = this.fields;
    for (const fieldKey in fieldSpecs) {
      if (fieldSpecs.hasOwnProperty(fieldKey)) {
        const currentValue = dotObject.pick(fieldKey, data, false);
        const validations = fieldSpecs[fieldKey].validations;
        for (const validationName in validations) {
          if (validations.hasOwnProperty(validationName)) {
            const valid = await validations[validationName](currentValue, data);
            if (!valid) {
              throw new ValidationError(fieldKey, validationName, currentValue);
            }
          }
        }
      }
    }
    return this;
  }

  public async list(
    filter: IDynamicObject = {},
    projection?: IProjection,
    limit?: number,
    skip?: number,
    sort?: ISort,
  ): Promise<T[]> {
    const col = await this.getMongoCollection();
    const docs = await col.find(filter, { limit, skip, sort, projection }).toArray();
    const instances = docs.map(d => new Document(this, d) as T);
    return instances;
  }

  public async count(filter: IDynamicObject = {}): Promise<number> {
    const col = await this.getMongoCollection();
    return await col.countDocuments(filter);
  }

  public async get(filter: IDynamicObject = {}, projection?: IProjection): Promise<T | null> {
    const collection = await this.getMongoCollection();
    const instance = await collection.findOne(filter, { projection });
    return instance ? (new Document(this, instance) as T) : null;
  }

  public async getById(id: string | ObjectId, projection?: IProjection): Promise<T | null> {
    const collection = await this.getMongoCollection();
    const instance = await collection.findOne({ _id: id }, { projection });
    return instance ? (new Document(this, instance) as T) : null;
  }

  public async create(data: IDynamicObject): Promise<T | null> {
    const col = await this.getMongoCollection();
    const instance = new Document(this, data) as T;
    instance.addCreatedAt();
    instance.parse();
    await instance.validate();
    const { ops } = await col.insertOne(data);
    const [doc] = ops;
    return doc ? (new Document(this, doc) as T) : null;
  }

  public async patchById(id: ObjectId | string, data: IDynamicObject): Promise<T | null> {
    const col = await this.getMongoCollection();
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
    return this.processFindOneAndWriteResult(result);
  }

  public async deleteById(id: ObjectId | string): Promise<T | null> {
    const col = await this.getMongoCollection();
    const deleted = await col.findOneAndDelete({ _id: new ObjectId(id) });
    return this.processFindOneAndWriteResult(deleted);
  }
}

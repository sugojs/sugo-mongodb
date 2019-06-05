import * as dotObject from 'dot-object';
import moment = require('moment');
import { Collection as MongoCollection, Db, MongoClient, ObjectId } from 'mongodb';
import { Collection, DEFAULT_DATE_FORMAT, FALSE_VALUES, FIELD_TYPES, TRUE_VALUES } from './Collection';
import { ParsingError, ValidationError } from './exceptions';
import DocumentNotPersistedError from './exceptions/DocumentNotPersistedError';
import { IDocumentInternals, IDynamicObject, IFieldSpecification } from './Interfaces';
import { getMongoCollection, processFindOneAndWriteResult } from './Mongodb';

export class Document implements IDynamicObject {
  [key: string]: any;
  public _id?: ObjectId;
  private $internals: IDocumentInternals;

  constructor(data: IDynamicObject, collection: Collection<any>) {
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        this[key] = data[key];
      }
    }
    this.$internals = {
      client: collection.client,
      collectionName: collection.name,
      createdAtKey: collection.createdAtKey,
      deleted: false,
      fields: collection.fields,
      updatedAtKey: collection.updatedAtKey,
    };
    Object.defineProperty(this, '$internals', {
      configurable: false,
      enumerable: false,
      value: this.$internals,
      writable: false,
    });
    this.addDefaultValues();
    this.parse();
  }

  public addCreatedAt() {
    this[this.$internals.createdAtKey] = new Date();
    return this;
  }

  public addUpdatedAt() {
    this[this.$internals.updatedAtKey] = new Date();
    return this;
  }

  public merge(data: IDynamicObject) {
    const dotData = dotObject.dot(data);
    for (const key in dotData) {
      if (dotData.hasOwnProperty(key)) {
        const value = dotObject.pick(key, dotData);
        dotObject.set(key, value, this, false);
      }
    }
    this.parse();
    return this;
  }

  public addDefaultValues() {
    const fieldSpecs: IFieldSpecification = this.$internals.fields;
    for (const fieldKey in fieldSpecs) {
      if (fieldSpecs.hasOwnProperty(fieldKey)) {
        const currentValue = dotObject.pick(fieldKey, this, false);
        const defaultValue = fieldSpecs[fieldKey].defaultValue;
        if (currentValue === undefined && defaultValue) {
          dotObject.set(fieldKey, typeof defaultValue === 'function' ? defaultValue(this) : defaultValue, this, false);
        }
      }
    }
    return this;
  }

  public parse() {
    const fieldSpecs: IFieldSpecification = this.$internals.fields;
    for (const fieldKey in fieldSpecs) {
      if (fieldSpecs.hasOwnProperty(fieldKey)) {
        const currentValue = dotObject.pick(fieldKey, this, false);
        const valueType = fieldSpecs[fieldKey].type;
        const dateFormats = fieldSpecs[fieldKey].formats;
        let parsedValue;
        switch (valueType) {
          case FIELD_TYPES.BOOLEAN:
            if (FALSE_VALUES.includes(currentValue)) {
              parsedValue = false;
            } else if (TRUE_VALUES.includes(currentValue)) {
              parsedValue = true;
            } else {
              throw new ParsingError(fieldKey, currentValue, valueType);
            }
            break;
          case FIELD_TYPES.DATE:
            parsedValue = moment.utc(
              currentValue,
              dateFormats && dateFormats.length > 0 ? dateFormats : DEFAULT_DATE_FORMAT,
              true,
            );
            if (!parsedValue.isValid()) {
              throw new ParsingError(fieldKey, currentValue, valueType);
            }
            parsedValue = parsedValue.toDate();
            break;
          case FIELD_TYPES.FLOAT:
            if (isNaN(currentValue)) {
              throw new ParsingError(fieldKey, currentValue, valueType);
            }
            parsedValue = parseFloat(currentValue);
            break;
          case FIELD_TYPES.INTEGER:
            if (isNaN(currentValue)) {
              throw new ParsingError(fieldKey, currentValue, valueType);
            }
            parsedValue = parseInt(currentValue, 10);
            break;
          case FIELD_TYPES.OBJECT_ID:
            if (ObjectId.isValid(currentValue)) {
              throw new ParsingError(fieldKey, currentValue, valueType);
            }
            parsedValue = new ObjectId(currentValue);
            break;
          case FIELD_TYPES.STRING:
            parsedValue = typeof currentValue !== FIELD_TYPES.STRING ? currentValue.toString() : currentValue;
            break;
          default:
            break;
        }
        dotObject.set(fieldKey, parsedValue, this, false);
      }
    }
    return this;
  }

  public async validate() {
    const fieldSpecs: IFieldSpecification = this.$internals.fields;
    for (const fieldKey in fieldSpecs) {
      if (fieldSpecs.hasOwnProperty(fieldKey)) {
        const currentValue = dotObject.pick(fieldKey, this, false);
        const validations = fieldSpecs[fieldKey].validations;
        for (const validationName in validations) {
          if (validations.hasOwnProperty(validationName)) {
            const valid = await validations[validationName](currentValue, this);
            if (!valid) {
              throw new ValidationError(fieldKey, validationName, currentValue);
            }
          }
        }
      }
    }
    return this;
  }

  public lean() {
    return this.toJSON();
  }

  public toJSON() {
    const json: IDynamicObject = {};
    const fieldSpecs: IFieldSpecification = this.$internals.fields;

    for (const key in this) {
      if (this.hasOwnProperty(key)) {
        json[key] = this[key];
      }
    }

    for (const fieldKey in fieldSpecs) {
      if (fieldSpecs.hasOwnProperty(fieldKey)) {
        const hidden = fieldSpecs[fieldKey].hidden;
        if (hidden) {
          dotObject.remove(fieldKey, json);
        }
      }
    }
    return json;
  }

  public async refresh() {
    if (this._id) {
      return this.collection.get(this._id, this);
    } else {
      throw new DocumentNotPersistedError(this);
    }
  }

  public async save() {
    await this.validate();
    const col = await getMongoCollection(this.$internals.client, this.$internals.collectionName);
    let doc;
    if (this._id) {
      this.addUpdatedAt();
      const result = await col.findOneAndUpdate(
        { _id: new ObjectId(this._id) },
        { $set: this.rawData() },
        { returnOriginal: false },
      );
      doc = processFindOneAndWriteResult(result);
    } else {
      this.addCreatedAt();
      const { ops } = await col.insertOne(this.rawData());
      doc = ops.pop();
    }
    this.merge(doc);
    return this;
  }

  private rawData() {
    const data: IDynamicObject = {};
    for (const key in this) {
      if (this.hasOwnProperty(key) && typeof this[key] !== 'function') {
        data[key] = this[key];
      }
    }
    return data;
  }
}

module.exports = { Document };

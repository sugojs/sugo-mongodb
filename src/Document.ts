import * as dotObject from 'dot-object';
import { ObjectId } from 'mongodb';
import { Collection } from './Collection';
import { ValidationError } from './exceptions';
import DocumentNotPersistedError from './exceptions/DocumentNotPersistedError';
import { IDynamicObject, IFieldSpecification } from './Interfaces';

export class Document implements IDynamicObject {
  public collection: Collection<Document>;
  public _id?: ObjectId;

  /**
   *
   * @param {Object} data
   */
  constructor(collection: Collection<Document>, data: IDynamicObject) {
    this.collection = collection;
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        Object.defineProperty(this, key, { configurable: true, enumerable: true, writable: true, value: data[key] });
      }
    }
    Object.defineProperty(this, 'collection', {
      configurable: false,
      enumerable: false,
      value: collection,
      writable: false,
    });
    this.addDefaultValues();
    this.parse();
  }

  public addCreatedAt() {
    this.collection.addCreatedAt(this);
  }

  public addUpdatedAt() {
    this.collection.addUpdatedAt(this);
  }

  public merge(data: IDynamicObject) {
    const dotData = dotObject.dot(data);
    for (const key in dotData) {
      if (dotData.hasOwnProperty(key)) {
        const value = dotObject.pick(key, dotData);
        dotObject.set(key, value, this, false);
      }
    }
    return this;
  }

  public addDefaultValues() {
    this.collection.addDefaultValues(this);
    return this;
  }

  public parse() {
    this.collection.parse(this);
    return this;
  }

  public async validate() {
    const fieldSpecs: IFieldSpecification = this.collection.fields;
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
    const fieldSpecs: IFieldSpecification = this.collection.fields;

    for (const key in this) {
      if (this.hasOwnProperty(key)) {
        json[key] = this[key];
      }
    }

    for (const virtualName in this.collection.virtuals) {
      if (this.collection.virtuals.hasOwnProperty(virtualName)) {
        const fn = this.collection.virtuals[virtualName];
        dotObject.set(virtualName, fn(this), this, false);
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
      return this.collection.patchById(this._id, this);
    } else {
      throw new DocumentNotPersistedError(this);
    }
  }

  public async save() {
    if (this._id) {
      return this.collection.patchById(this._id, this);
    } else {
      return this.collection.create(this);
    }
  }
}

module.exports = { Document };

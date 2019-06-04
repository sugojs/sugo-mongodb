# **@sugo/mongodb**

Lightweight ORM for MongoDB. This package's goal is to easily standarize CRUD operations for MongoDB and to add some common functionalities.

## **Requirements**

node version >= 8

## **How to install**

```shell
npm install --save @sugo/mongodb
```

## Defining Schemas/Collections

We define collections by creating instances of the Collection class. The constructor for this class needs the collections name in the database and can receive field definitions and options.

### Connection

Connection to the database is made using the connect and disconnect methods. THe connect methods receives an MongoDB URI and MongoClient options.

```typescript
import { connect } from '@sugo/mongodb';
const Cats = new Collection(COL_NAME);
connect(
  URI,
  { useNewUrlParser: true },
).then(() => Cats.list().then((cats: any[]) => console.log(cats)));
```

By default, this package uses an internal MongoClient instance. The developer can pass it's own MongoClient instance.

```typescript
const client = new MongoClient(URI, { useNewUrlParser: true });
import { connect } from '@sugo/mongodb';
const Cats = new Collection(COL_NAME, {}, { client });
connect(URI).then(() => Cats.list().then((cats: any[]) => console.log(cats)));
```

### Field definitions

Field definitions help set the behavior for each field. They include validation, default values and more. Field definitions do not limit the fields that will be stored (unlink Mongoose default behavior), they apply their options on the field if needed. Field definitions use dot-notation (using the [dot-object](https://www.npmjs.com/package/dot-object)). In case of arrays, use the **\*** wildcard.

```typescript
const SpecifiedCol = new Collection<ICat>(
  COL_NAME,
  {
    name: {
      defaultValue: 'default',
    },
  },
  { client },
);
```

### Default values

```typescript
const SpecifiedCol = new Collection<ICat>(
  COL_NAME,
  {
    name: {
      defaultValue: 'default',
    },
  },
  { client },
);
```

OR

```typescript
const SpecifiedCol = new Collection<ICat>(COL_NAME, {
  name: {
    defaultValue: (doc: IDynamicObject) => 'hello world',
  },
});
```

### Validation

This packages supports sanitization. This allows us to make validations to a field before storing it. To add a validation, we add the **validations** attribute with an object with **async methods**. This methods will receive the value of the field and the document and must return a boolean.

```typescript
const SpecifiedCol = new Collection(
  COL_NAME,
  {
    name: {
      validations: {
        TRIM: async (value: any, doc: IDynamicObject) => value !== undefined;
      },
    },
  },
);
```

#### Included

- IS_NOT_NULL
- MIN: Recieves a number.
- MAX: Recieves a number.
- RANGE: Recieves two numbers.
- MIN_LENGTH: Recieves a number.
- MAX_LENGTH: Recieves a number.
- HAS_DATE_FORMAT: Recieves a [momentjs](https://momentjs.com/docs/#/displaying/) format string

### Sanitization

This packages supports sanitization. This allows us to make modifications to a field before storing it. To add sanitization, we add the _sanitizations_ attribute with an object with async methods. This methods will receive the document and must return the sanitized value.

```typescript
const SpecifiedCol = new Collection(
  COL_NAME,
  {
    name: {
      sanitizations: {
        TRIM: (value: string, doc: IDynamicObject) => value.trim();
      },
    },
  },
);
```

#### Included

- TRIM
- HASH: Receives an options Object **{ algorith: string; salt: string }**
- TO_LOWERCASE
- TO_UPPERCASE

### Hidden fields

Some times we want to hide a confidential field like a password. The hidden specification removes the field when transforming the Document into json.

```typescript
const SpecifiedCol = new Collection<ICat>(COL_NAME, {
  name: {
    hidden: true,
  },
});
```

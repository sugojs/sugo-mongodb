import * as chai from 'chai';
import { Collection as MongoCollection, Db as MongoDb, MongoClient, ObjectId } from 'mongodb';
import { connect, disconnect } from '../Client';
import { Collection } from '../Collection';
import { Document } from '../Document';
import { IDocument, IDynamicObject } from '../Interfaces';
import { getDb } from '../Mongodb';

const COL_NAME = 'cats';
const URI = 'mongodb://localhost:27017/sugo-mongodb-test';
const DB_NAME = 'sugo-mongodb-test';
const cats = [
  { _id: new ObjectId(), name: 'One', pure: true },
  { _id: new ObjectId(), name: 'Two', pure: false },
  { _id: new ObjectId(), name: 'Three', pure: true },
  { _id: new ObjectId(), name: 'Four', pure: true },
  { _id: new ObjectId(), name: 'Five', pure: false },
];
const client = new MongoClient(URI, { useNewUrlParser: true });
const CatCol = new Collection<ICat>(COL_NAME, {}, { client });
let db: MongoDb;
let mCatCol: MongoCollection;

chai.should();

interface ICat extends IDocument {
  name: string;
  pure: boolean;
  nullable: null;
}

// Our parent block
describe('SuGo MongoDb - Collection', () => {
  before(async () => {
    await client.connect();
    db = client.db();
    mCatCol = db.collection(COL_NAME);
  });
  after(async () => {
    await client.close();
    await disconnect();
  });

  describe(`Constructor`, () => {
    it('should properly create the collection object with only the name', async () => {
      const Cats = new Collection(COL_NAME);
      Object.keys(Cats.fields).length.should.be.eql(0);
    });
  });

  describe('Connection', () => {
    it('it should connect to the default database', async () => {
      const Cats = new Collection(COL_NAME);
      const fn = () => Cats.list();
      fn.should.not.throw(Error);
      const catDb = await getDb(Cats.client);
      catDb.databaseName.should.be.eql('test');
    });

    it('should connect to the desired database in the URI', async () => {
      await connect(URI);
      const Cats = new Collection(COL_NAME);
      const fn = () => Cats.list();
      fn.should.not.throw(Error);
      db.databaseName.should.be.eql(DB_NAME);
    });

    it('should accept an external mongodb client', () => {
      const Cats = new Collection(COL_NAME, {}, { client });
      const fn = () => Cats.list();
      fn.should.not.throw(Error);
      db.databaseName.should.be.eql(DB_NAME);
    });
  });

  describe('Field Specification', () => {
    describe('Types', () => {});

    describe('Default Values', () => {
      it('should not set the value of the field if it is set', async () => {
        const SpecifiedCol = new Collection<ICat>(
          COL_NAME,
          {
            name: {
              defaultValue: 'default',
            },
          },
          { client },
        );
        const cat = await SpecifiedCol.create({ name: 'notDefault' });
        if (!cat) {
          chai.expect.fail();
        } else {
          cat.name.should.be.eql('notDefault');
        }
      });

      it('should not set the value of the field if it is set at null', async () => {
        const SpecifiedCol = new Collection<ICat>(
          COL_NAME,
          {
            name: {
              defaultValue: 'default',
            },
          },
          { client },
        );
        const cat = await SpecifiedCol.create({ nullable: null });
        if (!cat) {
          chai.expect.fail();
        } else {
          chai.expect(cat.nullable).to.be.null;
        }
      });

      it('should set the value to the field if it is undefined', async () => {
        const SpecifiedCol = new Collection<ICat>(
          COL_NAME,
          {
            name: {
              defaultValue: 'default',
            },
          },
          { client },
        );
        const cat = await SpecifiedCol.create({});
        if (!cat) {
          chai.expect.fail();
        } else {
          cat.name.should.be.eql('default');
        }
      });

      it('should set the value to the field if it is undefined', async () => {
        const SpecifiedCol = new Collection<ICat>(
          COL_NAME,
          {
            name: {
              defaultValue: (doc: IDynamicObject) => 'default',
            },
          },
          { client },
        );
        const cat = await SpecifiedCol.create({});
        if (!cat) {
          chai.expect.fail();
        } else {
          cat.name.should.be.eql('default');
        }
      });
    });

    describe('Hidden', () => {
      it('should hide the field when obtaining the json object', async () => {
        const SpecifiedCol = new Collection<ICat>(
          COL_NAME,
          {
            name: {
              hidden: true,
            },
          },
          { client },
        );
        const cat = await SpecifiedCol.create({ name: 'hidden' });
        cat;
        if (!cat) {
          chai.expect.fail();
        } else {
          chai.expect(cat.name).not.to.be.undefined;
          chai.expect(cat.lean().name).to.be.undefined;
        }
      });
    });

    describe('Validation', () => {
      it('should run the validations and save the object it does pass the validations', async () => {
        const SpecifiedCol = new Collection<ICat>(
          COL_NAME,
          {
            name: {
              validations: {
                IS_NOT_NULL: async (value: any, doc: ICat) => value !== null && value !== undefined,
              },
            },
          },
          { client },
        );
        const cat = await SpecifiedCol.create({ name: 'fluffy' });
        if (!cat) {
          chai.expect.fail();
        } else {
          cat.name.should.be.eql('fluffy');
        }
      });

      it('should run the validations and throw an Error because it did not pass the validations', async () => {
        const SpecifiedCol = new Collection(
          COL_NAME,
          {
            name: {
              validations: {
                IS_NOT_NULL: async (value, doc) => value !== null && value !== undefined,
              },
            },
          },
          { client },
        );
        try {
          await SpecifiedCol.create({});
          chai.expect.fail();
        } catch (error) {
          error.validation.should.be.eql('IS_NOT_NULL');
        }
      });
    });
  });

  describe('Database operations', () => {
    before(async () => {
      await connect(URI);
      await mCatCol.deleteMany({});
    });
    after(async () => {
      await mCatCol.deleteMany({});
      await disconnect();
    });

    describe('List', () => {
      beforeEach(async () => {
        await mCatCol.insertMany(cats);
      });

      afterEach(async () => {
        await mCatCol.deleteMany({});
      });

      it('should return all the documents', async () => {
        const docs = await CatCol.list();
        docs.length.should.be.eql(5);
      });

      it('should return only non pure cats', async () => {
        const docs = await CatCol.list({ pure: false });
        docs.length.should.be.eql(2);
      });

      it('should return only name attribute', async () => {
        const docs = await CatCol.list({}, { name: 1 });
        docs.length.should.be.eql(5);
        const [first] = docs;
        const containsPure = Object.keys(first).includes('pure').should.be.false;
        const containsName = Object.keys(first).includes('name').should.be.true;
      });

      it('should return only one', async () => {
        const docs = await CatCol.list({}, {}, 1);
        docs.length.should.be.eql(1);
      });

      it('should return only the second ', async () => {
        const docs: ICat[] = await CatCol.list({}, {}, 1, 1);
        docs.length.should.be.eql(1);
        const [second] = docs;
        second.name.should.be.eql('Two');
      });

      it('should sort the name ', async () => {
        const docs: ICat[] = await CatCol.list({}, {}, 99999, 0, { name: 1 });
        docs.length.should.be.eql(5);
        const [first] = docs;
        first.name.should.be.eql('Five');
      });
    });

    describe('Count', () => {
      beforeEach(async () => {
        await mCatCol.insertMany(cats);
      });

      afterEach(async () => {
        await mCatCol.deleteMany({});
      });

      it('should return all the documents', async () => {
        const count = await CatCol.count();
        count.should.be.eql(5);
      });

      it('should return only non pure cats', async () => {
        const count = await CatCol.count({ pure: false });
        count.should.be.eql(2);
      });
    });

    describe('Get', () => {
      beforeEach(async () => {
        await mCatCol.insertMany(cats);
      });

      afterEach(async () => {
        await mCatCol.deleteMany({});
      });

      it('should one cat', async () => {
        const doc = await CatCol.get({ name: 'One' });
      });

      it('should one cat with only name', async () => {
        const doc = await CatCol.get({ name: 'One' }, { name: 1 });
        if (!doc) {
          chai.expect.fail();
        } else {
          const containsPure = Object.keys(doc).includes('pure').should.be.false;
          const containsName = Object.keys(doc).includes('name').should.be.true;
        }
      });
    });

    describe('GetById', () => {
      beforeEach(async () => {
        await mCatCol.insertMany(cats);
      });

      afterEach(async () => {
        await mCatCol.deleteMany({});
      });

      it('should one cat', async () => {
        const doc = await CatCol.getById(cats[0]._id);
      });

      it('should one cat with only name', async () => {
        const doc = await CatCol.getById(cats[0]._id, { name: 1 });
        if (!doc) {
          chai.expect.fail();
        } else {
          const containsPure = Object.keys(doc).includes('pure').should.be.false;
          const containsName = Object.keys(doc).includes('name').should.be.true;
        }
      });
    });

    describe('create', () => {
      afterEach(async () => {
        await mCatCol.deleteMany({});
      });

      it('should create one cat', async () => {
        const doc = await CatCol.create(cats[0]);
        const count = await CatCol.count();
        count.should.be.eq(1);
      });
    });

    describe('patchById', () => {
      beforeEach(async () => {
        await mCatCol.insertMany(cats);
      });
      afterEach(async () => {
        await mCatCol.deleteMany({});
      });

      it('should patch one cat', async () => {
        const doc = await CatCol.patchById(cats[0]._id, { name: 'Hello' });
        if (!doc) {
          chai.expect.fail();
        } else {
          doc.name.should.be.eq('Hello');
        }
      });
    });

    describe('deleteById', () => {
      beforeEach(async () => {
        await mCatCol.insertMany(cats);
      });
      afterEach(async () => {
        await mCatCol.deleteMany({});
      });

      it('should patch one cat', async () => {
        const doc = await CatCol.deleteById(cats[0]._id);
        if (!doc) {
          chai.expect.fail();
        } else {
          doc.name.should.be.eq('One');
        }
      });
    });
  });
});

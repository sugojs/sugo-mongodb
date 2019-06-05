import { Collection, Db, FindAndModifyWriteOpResultObject, MongoClient, WriteOpResult } from 'mongodb';

export const processCreateResult = (res: WriteOpResult): any | null => {
  if (res.ops && res.ops.length && res.ops.length > 0) {
    const [doc] = res.ops;
    return doc;
  }
  return null;
};

export const processFindOneAndWriteResult = (res: FindAndModifyWriteOpResultObject) => {
  return res.value ? res.value : null;
};

export const getDb = async (client: MongoClient): Promise<Db> => {
  if (!client.isConnected()) {
    await client.connect();
  }
  return client.db();
};

export const getMongoCollection = async (client: MongoClient, name: string): Promise<Collection> => {
  const db = await getDb(client);
  return db.collection(name);
};

import {
  Collection,
  Db,
  FindAndModifyWriteOpResultObject,
  MongoClient,
  MongoClientOptions,
  WriteOpResult,
} from 'mongodb';

export const DEFAULT_URI = 'mongodb://localhost:27017/test';
export const DEFAULT_MONGO_CLIENT_OPTIONS = { useNewUrlParser: true };
let client: MongoClient = new MongoClient(DEFAULT_URI, DEFAULT_MONGO_CLIENT_OPTIONS);

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

export const getClient = () => client;

export const getDb = async (mongoClient: MongoClient): Promise<Db> => {
  if (!mongoClient.isConnected()) {
    await mongoClient.connect();
  }
  return mongoClient.db();
};

export const getMongoCollection = async (mongoClient: MongoClient, name: string): Promise<Collection> => {
  const db = await getDb(mongoClient);
  return db.collection(name);
};

export const connect = async (uri: string = DEFAULT_URI, options: MongoClientOptions = DEFAULT_MONGO_CLIENT_OPTIONS) =>
  (client = await new MongoClient(uri, options).connect());

export const disconnect = async () => client.close();

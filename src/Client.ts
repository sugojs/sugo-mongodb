import { MongoClient, MongoClientOptions } from 'mongodb';

export const DEFAULT_URI = 'mongodb://localhost:27017/test';
export const DEFAULT_MONGO_CLIENT_OPTIONS = { useNewUrlParser: true };
export let client: MongoClient = new MongoClient(DEFAULT_URI, DEFAULT_MONGO_CLIENT_OPTIONS);

export const connect = async (uri: string = DEFAULT_URI, options: MongoClientOptions = DEFAULT_MONGO_CLIENT_OPTIONS) =>
  (client = await new MongoClient(uri, options).connect());

export const disconnect = async () => client.close();

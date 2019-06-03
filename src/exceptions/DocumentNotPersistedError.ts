import { Document } from '../Document';
import { BaseError } from './BaseError';

export class DocumentNotPersistedError extends BaseError {
  public status: number = 422;
  public doc: Document;

  constructor(doc: Document) {
    super(`The document has not been persisted in the database. doc=${JSON.stringify(doc, null, 2)}`);
    this.doc = doc;
  }
}

export default DocumentNotPersistedError;

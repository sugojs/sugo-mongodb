import { BaseError } from './BaseError';

export class ParsingError extends BaseError {
  public status: number = 422;
  public field: string;
  public rawValue: any;
  public type: string;

  constructor(field: string, value: any, type: string) {
    super(`There has been an error parsing the "${field}" field as "${type}". Value=${value}`);
    this.field = field;
    this.rawValue = value;
    this.type = type;
  }
}

export default ParsingError;

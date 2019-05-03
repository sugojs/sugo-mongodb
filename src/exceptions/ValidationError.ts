import { BaseError } from './BaseError';

export class ValidationError extends BaseError {
  public status: number = 422;
  public field: string;
  public validation: string;
  public value: any;

  constructor(field: string, validation: string, value: string) {
    super(`The "${validation}" validation on the "${field}" field has failed. Value=${value}`);
    this.field = field;
    this.validation = validation;
    this.value = value;
  }
}

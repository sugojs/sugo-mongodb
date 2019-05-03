interface IDynamicError {
  [key: string]: any;
}

export class BaseError extends Error implements IDynamicError {
  public status: number = 500;

  constructor(message: string) {
    super(message);
  }

  public toJSON() {
    const json: IDynamicError = {
      message: this.message,
      name: this.name,
      stack: this.stack,
    };
    for (const key in this) {
      if (this.hasOwnProperty(key)) {
        json[key] = this[key];
      }
    }
  }
}

export default BaseError;

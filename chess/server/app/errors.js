import { ERRORS } from '../../shared/protocol/contract.js';

/** Lỗi nghiệp vụ mang `code` thuộc contract (ERRORS) để client hiểu được. */
export class ServiceError extends Error {
  constructor(code, message) {
    super(message ?? code);
    this.code = code;
  }
}

export { ERRORS };

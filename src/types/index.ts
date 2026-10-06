/**
 * Enumeration of all employee designations in the organization.
 */
export enum Designation {
  CEO = "CEO",
  Director = "Director",
  Manager = "Manager",
  Lead = "Lead",
  Engineer = "Engineer",
}

/**
 * Public interface representing an employee's data representation.
 */
export interface IEmployeeData {
  id: string;
  name: string;
  dateOfBirth: string;
  designation: Designation;
  reportsTo: string | null;
  reportees: string[];
}

/**
 * Base custom error for Organization Domain errors.
 */
export class OrganizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrganizationError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when validation rules (e.g. date format, empty fields) are violated.
 */
export class ValidationError extends OrganizationError {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Thrown when organizational hierarchy rules are violated.
 */
export class HierarchyError extends OrganizationError {
  constructor(message: string) {
    super(message);
    this.name = "HierarchyError";
  }
}

/**
 * Thrown when attempting to add an entity that already exists (e.g., duplicate ID, second CEO).
 */
export class ConflictError extends OrganizationError {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

/**
 * Thrown when requested entity is not found.
 */
export class NotFoundError extends OrganizationError {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

/**
 * Data transfer object for creating a new employee.
 */
export interface CreateEmployeeDTO {
  id: string;
  name: string;
  dateOfBirth: string;
  designation: Designation;
  reportsTo?: string | null;
}

/**
 * Data transfer object for updating an existing employee.
 */
export interface UpdateEmployeeDTO {
  name?: string;
  dateOfBirth?: string;
  reportsTo?: string | null;
}

/**
 * Options for deleting an employee.
 */
export interface DeleteEmployeeOptions {
  /**
   * If the employee has reportees, they can be reassigned to this supervisor ID.
   * If omitted and the employee has reportees, deletion is rejected.
   */
  reassignReporteesTo?: string;
}


import {
  Designation,
  CreateEmployeeDTO,
  UpdateEmployeeDTO,
  ValidationError,
  HierarchyError,
} from "../types";

/**
 * Validates that a string value is non-empty and non-whitespace.
 */
export function validateRequiredString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(`Field '${fieldName}' is required and cannot be empty.`);
  }
  return value.trim();
}

/**
 * Validates that a date string strictly follows the 'mm/dd/yyyy' format
 * and represents a valid past or present calendar date.
 */
export function validateDateFormat(dateStr: string): string {
  if (typeof dateStr !== "string" || dateStr.trim().length === 0) {
    throw new ValidationError("Date of birth is required and cannot be empty.");
  }

  const trimmed = dateStr.trim();
  const dateRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/(\d{4})$/;
  const match = trimmed.match(dateRegex);

  if (!match) {
    throw new ValidationError(
      `Invalid date format: '${dateStr}'. Expected mm/dd/yyyy format (e.g. 05/24/1990).`
    );
  }

  const month = parseInt(match[1], 10);
  const day = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);

  // Month days check
  const daysInMonths = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const maxDays = daysInMonths[month - 1];

  if (day > maxDays) {
    throw new ValidationError(
      `Invalid calendar date: '${dateStr}'. Month ${month.toString().padStart(2, "0")} only has ${maxDays} days in year ${year}.`
    );
  }

  // Ensure year is reasonable (between 1900 and current year)
  const parsedDate = new Date(year, month - 1, day);
  const now = new Date();

  if (year < 1900) {
    throw new ValidationError(`Invalid year in date '${dateStr}'. Year must be 1900 or later.`);
  }

  if (parsedDate > now) {
    throw new ValidationError(
      `Date of birth '${dateStr}' cannot be in the future.`
    );
  }

  return trimmed;
}

/**
 * Checks whether a given year is a leap year.
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Validates that a designation is one of the valid enum values.
 */
export function validateDesignation(designation: unknown): Designation {
  const validDesignations = Object.values(Designation);
  if (!validDesignations.includes(designation as Designation)) {
    throw new ValidationError(
      `Invalid designation: '${designation}'. Must be one of: ${validDesignations.join(", ")}.`
    );
  }
  return designation as Designation;
}

/**
 * Returns the mandatory supervisor role for a given role according to organizational rules.
 * Returns null for CEO (CEO reports to no one).
 */
export function getAllowedSupervisorRole(role: Designation): Designation | null {
  switch (role) {
    case Designation.CEO:
      return null;
    case Designation.Director:
      return Designation.CEO;
    case Designation.Manager:
      return Designation.Director;
    case Designation.Lead:
      return Designation.Manager;
    case Designation.Engineer:
      return Designation.Lead;
  }
}

/**
 * Returns the permitted reportee role for a given role according to organizational rules.
 * Returns null for Engineer (Engineer cannot have reportees).
 */
export function getAllowedReporteeRole(role: Designation): Designation | null {
  switch (role) {
    case Designation.CEO:
      return Designation.Director;
    case Designation.Director:
      return Designation.Manager;
    case Designation.Manager:
      return Designation.Lead;
    case Designation.Lead:
      return Designation.Engineer;
    case Designation.Engineer:
      return null;
  }
}

/**
 * Validates the reporting relationship between an employee's role and their supervisor's role.
 */
export function validateReportingHierarchy(
  employeeRole: Designation,
  supervisorRole: Designation | null
): void {
  const expectedSupervisorRole = getAllowedSupervisorRole(employeeRole);

  if (employeeRole === Designation.CEO) {
    if (supervisorRole !== null) {
      throw new HierarchyError(
        `A CEO cannot report to anyone. Found reportsTo supervisor of role '${supervisorRole}'.`
      );
    }
    return;
  }

  if (supervisorRole === null) {
    throw new HierarchyError(
      `A ${employeeRole} must report to a ${expectedSupervisorRole}, but no supervisor was provided.`
    );
  }

  if (supervisorRole !== expectedSupervisorRole) {
    throw new HierarchyError(
      `Invalid reporting hierarchy: A ${employeeRole} cannot report to a ${supervisorRole}. A ${employeeRole} must report to a ${expectedSupervisorRole}.`
    );
  }
}

/**
 * Validates the full payload for creating an employee.
 */
export function validateCreateEmployeeInput(input: CreateEmployeeDTO): void {
  validateRequiredString(input.id, "id");
  validateRequiredString(input.name, "name");
  validateDateFormat(input.dateOfBirth);
  validateDesignation(input.designation);

  if (input.designation === Designation.CEO) {
    if (input.reportsTo !== undefined && input.reportsTo !== null && input.reportsTo.trim() !== "") {
      throw new HierarchyError("A CEO cannot report to anyone.");
    }
  } else {
    if (!input.reportsTo || input.reportsTo.trim() === "") {
      const allowedSupervisor = getAllowedSupervisorRole(input.designation);
      throw new ValidationError(
        `Field 'reportsTo' is required for ${input.designation}. Must report to a ${allowedSupervisor}.`
      );
    }
  }
}

/**
 * Validates the payload for updating an employee.
 */
export function validateUpdateEmployeeInput(input: UpdateEmployeeDTO): void {
  if (input.name !== undefined) {
    validateRequiredString(input.name, "name");
  }
  if (input.dateOfBirth !== undefined) {
    validateDateFormat(input.dateOfBirth);
  }
  if (input.reportsTo !== undefined && input.reportsTo !== null) {
    validateRequiredString(input.reportsTo, "reportsTo");
  }
}

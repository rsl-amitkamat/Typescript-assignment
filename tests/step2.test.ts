import {
  validateRequiredString,
  validateDateFormat,
  validateDesignation,
  getAllowedSupervisorRole,
  getAllowedReporteeRole,
  validateReportingHierarchy,
  validateCreateEmployeeInput,
  validateUpdateEmployeeInput,
  isLeapYear,
} from "../src/utils/validator";
import { Designation, ValidationError, HierarchyError } from "../src/types";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertThrows(
  fn: () => void,
  expectedErrorType: new (...args: any[]) => Error,
  message: string
): void {
  let threw = false;
  try {
    fn();
  } catch (err: unknown) {
    threw = true;
    if (!(err instanceof expectedErrorType)) {
      const errName = err instanceof Error ? err.constructor.name : String(err);
      throw new Error(
        `Expected ${expectedErrorType.name} but got ${errName} for: ${message}`
      );
    }
  }
  if (!threw) {
    throw new Error(`Expected function to throw ${expectedErrorType.name} for: ${message}`);
  }
}

console.log("=== Running Step 2: Validation Engine & Hierarchy Tests ===");

// 1. Required String Validation
console.log("1. Testing validateRequiredString...");
assert(validateRequiredString("John Doe", "name") === "John Doe", "Valid string trimmed");
assert(validateRequiredString("  TrimMe  ", "name") === "TrimMe", "Whitespace trimmed");
assertThrows(() => validateRequiredString("", "name"), ValidationError, "Empty string rejected");
assertThrows(() => validateRequiredString("   ", "name"), ValidationError, "Whitespace only rejected");
assertThrows(() => validateRequiredString(null, "name"), ValidationError, "null rejected");
assertThrows(() => validateRequiredString(undefined, "name"), ValidationError, "undefined rejected");
assertThrows(() => validateRequiredString(123, "name"), ValidationError, "number rejected");

// 2. Date Format and Calendar Validation
console.log("2. Testing validateDateFormat...");
// Valid dates
assert(validateDateFormat("01/15/1990") === "01/15/1990", "Valid date accepted");
assert(validateDateFormat("12/31/2000") === "12/31/2000", "End of year accepted");
assert(validateDateFormat("02/29/2024") === "02/29/2024", "Leap year 2024 Feb 29 accepted");
assert(validateDateFormat("02/29/2000") === "02/29/2000", "Century leap year 2000 Feb 29 accepted");

// Invalid formats
assertThrows(() => validateDateFormat("1990-01-15"), ValidationError, "ISO format rejected");
assertThrows(() => validateDateFormat("1/5/1990"), ValidationError, "Missing leading zeros rejected");
assertThrows(() => validateDateFormat("15/01/1990"), ValidationError, "dd/mm/yyyy rejected (month 15)");
assertThrows(() => validateDateFormat("not-a-date"), ValidationError, "Text rejected");
assertThrows(() => validateDateFormat(""), ValidationError, "Empty date rejected");

// Calendar edge cases
assertThrows(() => validateDateFormat("04/31/2020"), ValidationError, "April 31st rejected (April has 30 days)");
assertThrows(() => validateDateFormat("06/31/2021"), ValidationError, "June 31st rejected (June has 30 days)");
assertThrows(() => validateDateFormat("09/31/2022"), ValidationError, "Sept 31st rejected (Sept has 30 days)");
assertThrows(() => validateDateFormat("11/31/2023"), ValidationError, "Nov 31st rejected (Nov has 30 days)");
assertThrows(() => validateDateFormat("02/29/2023"), ValidationError, "Feb 29 on non-leap year rejected");
assertThrows(() => validateDateFormat("02/29/1900"), ValidationError, "Feb 29 on non-leap century 1900 rejected");
assertThrows(() => validateDateFormat("02/30/2024"), ValidationError, "Feb 30 rejected");
assertThrows(() => validateDateFormat("12/31/2099"), ValidationError, "Future birth date rejected");
assertThrows(() => validateDateFormat("01/01/1850"), ValidationError, "Year < 1900 rejected");

// Leap year helper
assert(isLeapYear(2024) === true, "2024 is leap year");
assert(isLeapYear(2000) === true, "2000 is leap year");
assert(isLeapYear(2023) === false, "2023 is not leap year");
assert(isLeapYear(1900) === false, "1900 is not leap year");

// 3. Designation Validation
console.log("3. Testing validateDesignation...");
assert(validateDesignation("CEO") === Designation.CEO, "CEO is valid");
assert(validateDesignation("Director") === Designation.Director, "Director is valid");
assert(validateDesignation("Manager") === Designation.Manager, "Manager is valid");
assert(validateDesignation("Lead") === Designation.Lead, "Lead is valid");
assert(validateDesignation("Engineer") === Designation.Engineer, "Engineer is valid");
assertThrows(() => validateDesignation("VP"), ValidationError, "Invalid designation VP rejected");
assertThrows(() => validateDesignation(""), ValidationError, "Empty designation rejected");

// 4. Role Hierarchy Mapping
console.log("4. Testing hierarchy mappings...");
assert(getAllowedSupervisorRole(Designation.CEO) === null, "CEO supervisor role is null");
assert(getAllowedSupervisorRole(Designation.Director) === Designation.CEO, "Director supervisor is CEO");
assert(getAllowedSupervisorRole(Designation.Manager) === Designation.Director, "Manager supervisor is Director");
assert(getAllowedSupervisorRole(Designation.Lead) === Designation.Manager, "Lead supervisor is Manager");
assert(getAllowedSupervisorRole(Designation.Engineer) === Designation.Lead, "Engineer supervisor is Lead");

assert(getAllowedReporteeRole(Designation.CEO) === Designation.Director, "CEO reportee is Director");
assert(getAllowedReporteeRole(Designation.Director) === Designation.Manager, "Director reportee is Manager");
assert(getAllowedReporteeRole(Designation.Manager) === Designation.Lead, "Manager reportee is Lead");
assert(getAllowedReporteeRole(Designation.Lead) === Designation.Engineer, "Lead reportee is Engineer");
assert(getAllowedReporteeRole(Designation.Engineer) === null, "Engineer reportee is null");

// 5. Reporting Hierarchy Validation
console.log("5. Testing validateReportingHierarchy...");
// Valid pairings
validateReportingHierarchy(Designation.CEO, null);
validateReportingHierarchy(Designation.Director, Designation.CEO);
validateReportingHierarchy(Designation.Manager, Designation.Director);
validateReportingHierarchy(Designation.Lead, Designation.Manager);
validateReportingHierarchy(Designation.Engineer, Designation.Lead);

// Invalid pairings
assertThrows(
  () => validateReportingHierarchy(Designation.CEO, Designation.Director),
  HierarchyError,
  "CEO reporting to Director rejected"
);
assertThrows(
  () => validateReportingHierarchy(Designation.Director, Designation.Manager),
  HierarchyError,
  "Director reporting to Manager rejected"
);
assertThrows(
  () => validateReportingHierarchy(Designation.Engineer, Designation.Manager),
  HierarchyError,
  "Engineer reporting directly to Manager rejected (must report to Lead)"
);
assertThrows(
  () => validateReportingHierarchy(Designation.Engineer, Designation.CEO),
  HierarchyError,
  "Engineer reporting directly to CEO rejected"
);
assertThrows(
  () => validateReportingHierarchy(Designation.Lead, null),
  HierarchyError,
  "Lead reporting to null rejected"
);

// 6. CreateEmployeeDTO Validation
console.log("6. Testing validateCreateEmployeeInput...");
validateCreateEmployeeInput({
  id: "EMP-001",
  name: "Alice",
  dateOfBirth: "01/15/1980",
  designation: Designation.CEO,
});

validateCreateEmployeeInput({
  id: "ENG-001",
  name: "Bob",
  dateOfBirth: "05/20/1995",
  designation: Designation.Engineer,
  reportsTo: "LEAD-001",
});

// Missing ID
assertThrows(
  () =>
    validateCreateEmployeeInput({
      id: "",
      name: "Bob",
      dateOfBirth: "05/20/1995",
      designation: Designation.Engineer,
      reportsTo: "LEAD-001",
    }),
  ValidationError,
  "Empty ID rejected"
);

// CEO with non-null reportsTo
assertThrows(
  () =>
    validateCreateEmployeeInput({
      id: "CEO-002",
      name: "Alice",
      dateOfBirth: "01/15/1980",
      designation: Designation.CEO,
      reportsTo: "LEAD-001",
    }),
  HierarchyError,
  "CEO with reportsTo rejected"
);

// Engineer without reportsTo
assertThrows(
  () =>
    validateCreateEmployeeInput({
      id: "ENG-002",
      name: "Bob",
      dateOfBirth: "05/20/1995",
      designation: Designation.Engineer,
    }),
  ValidationError,
  "Engineer without reportsTo rejected"
);

// 7. UpdateEmployeeDTO Validation
console.log("7. Testing validateUpdateEmployeeInput...");
validateUpdateEmployeeInput({ name: "Updated Name" });
validateUpdateEmployeeInput({ dateOfBirth: "03/10/1992" });
assertThrows(
  () => validateUpdateEmployeeInput({ name: "   " }),
  ValidationError,
  "Update with blank name rejected"
);
assertThrows(
  () => validateUpdateEmployeeInput({ dateOfBirth: "invalid-dob" }),
  ValidationError,
  "Update with invalid DOB rejected"
);

console.log("✓ All Step 2 tests passed successfully!\n");

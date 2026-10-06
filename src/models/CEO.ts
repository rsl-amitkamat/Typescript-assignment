import { Employee } from "./Employee";
import { Designation, HierarchyError } from "../types";

/**
 * Concrete class representing the CEO of the organization.
 * The CEO is the root of the hierarchy and reports to no one.
 * Reportees can only be Directors.
 */
export class CEO extends Employee {
  constructor(
    id: string,
    name: string,
    dateOfBirth: string,
    reportsTo: string | null = null,
    reportees: string[] = []
  ) {
    if (reportsTo !== null) {
      throw new HierarchyError("CEO cannot report to anyone.");
    }
    super(id, name, dateOfBirth, Designation.CEO, null, reportees);
  }

  public override setReportsTo(supervisorId: string | null): void {
    if (supervisorId !== null) {
      throw new HierarchyError("CEO cannot report to anyone.");
    }
    super.setReportsTo(null);
  }

  public canHaveReportees(): boolean {
    return true;
  }

  public getAllowedSupervisorDesignation(): Designation | null {
    return null;
  }

  public getAllowedReporteeDesignation(): Designation | null {
    return Designation.Director;
  }
}

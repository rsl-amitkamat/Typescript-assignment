import { Employee } from "./Employee";
import { Designation, HierarchyError } from "../types";

/**
 * Concrete class representing an Engineer.
 * Reports to a Lead.
 * Engineers cannot have any reportees.
 */
export class Engineer extends Employee {
  constructor(
    id: string,
    name: string,
    dateOfBirth: string,
    reportsTo: string | null = null,
    reportees: string[] = []
  ) {
    if (reportees.length > 0) {
      throw new HierarchyError("An Engineer cannot have any reportees.");
    }
    super(id, name, dateOfBirth, Designation.Engineer, reportsTo, []);
  }

  public canHaveReportees(): boolean {
    return false;
  }

  public getAllowedSupervisorDesignation(): Designation | null {
    return Designation.Lead;
  }

  public getAllowedReporteeDesignation(): Designation | null {
    return null;
  }
}

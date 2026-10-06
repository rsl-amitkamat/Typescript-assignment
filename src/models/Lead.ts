import { Employee } from "./Employee";
import { Designation } from "../types";

/**
 * Concrete class representing a Lead.
 * Reports to a Manager.
 * Reportees can only be Engineers.
 */
export class Lead extends Employee {
  constructor(
    id: string,
    name: string,
    dateOfBirth: string,
    reportsTo: string | null = null,
    reportees: string[] = []
  ) {
    super(id, name, dateOfBirth, Designation.Lead, reportsTo, reportees);
  }

  public canHaveReportees(): boolean {
    return true;
  }

  public getAllowedSupervisorDesignation(): Designation | null {
    return Designation.Manager;
  }

  public getAllowedReporteeDesignation(): Designation | null {
    return Designation.Engineer;
  }
}

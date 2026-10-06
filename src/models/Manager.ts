import { Employee } from "./Employee";
import { Designation } from "../types";

/**
 * Concrete class representing a Manager.
 * Reports to a Director.
 * Reportees can only be Leads.
 */
export class Manager extends Employee {
  constructor(
    id: string,
    name: string,
    dateOfBirth: string,
    reportsTo: string | null = null,
    reportees: string[] = []
  ) {
    super(id, name, dateOfBirth, Designation.Manager, reportsTo, reportees);
  }

  public canHaveReportees(): boolean {
    return true;
  }

  public getAllowedSupervisorDesignation(): Designation | null {
    return Designation.Director;
  }

  public getAllowedReporteeDesignation(): Designation | null {
    return Designation.Lead;
  }
}

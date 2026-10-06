import { Employee } from "./Employee";
import { Designation } from "../types";

/**
 * Concrete class representing a Director.
 * Reports to the CEO.
 * Reportees can only be Managers.
 */
export class Director extends Employee {
  constructor(
    id: string,
    name: string,
    dateOfBirth: string,
    reportsTo: string | null = null,
    reportees: string[] = []
  ) {
    super(id, name, dateOfBirth, Designation.Director, reportsTo, reportees);
  }

  public canHaveReportees(): boolean {
    return true;
  }

  public getAllowedSupervisorDesignation(): Designation | null {
    return Designation.CEO;
  }

  public getAllowedReporteeDesignation(): Designation | null {
    return Designation.Manager;
  }
}

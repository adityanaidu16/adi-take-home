/**
 * Registered SharePoint lists. Registering a list is a code change, so it goes
 * through engineering review. Pointing an app at a registered list is config.
 */
import type { Field } from "../types";

export type RegisteredList = {
  name: string;
  siteId: string;
  listId: string;
  /** App field name -> SharePoint column name. */
  fieldMap: Record<string, string>;
  fields: Field[];
};

export const refundExceptionsList: RegisteredList = {
  name: "refund_exceptions",
  siteId: "fintech.sharepoint.com,11111111-1111-1111-1111-111111111111,22222222-2222-2222-2222-222222222222",
  listId: "33333333-3333-3333-3333-333333333333",
  fieldMap: {
    customer_name: "CustomerName",
    amount: "Amount",
    exception_reason: "ExceptionReason",
    requested_by: "RequestedBy",
    status: "Status",
    customer_iban: "CustomerIBAN",
  },
  fields: [
    { name: "customer_name", type: "string" },
    { name: "amount", type: "number" },
    { name: "exception_reason", type: "string" },
    { name: "requested_by", type: "string" },
    { name: "status", type: "string" },
    { name: "customer_iban", type: "string", sensitive: true },
  ],
};

export const registeredLists: RegisteredList[] = [refundExceptionsList];

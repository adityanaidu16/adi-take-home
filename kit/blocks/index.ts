import { featureFlags, toggleFlag } from "./flags";
import { refundExceptions, updateExceptionStatus } from "./graph";
import { issueRefund, refundRequests } from "./refunds";
import type { Action, DataSource } from "./types";

export const dataSources: Record<string, DataSource> = {
  [refundRequests.name]: refundRequests,
  [featureFlags.name]: featureFlags,
  [refundExceptions.name]: refundExceptions,
};

export const actions: Record<string, Action> = {
  [issueRefund.name]: issueRefund,
  [toggleFlag.name]: toggleFlag,
  [updateExceptionStatus.name]: updateExceptionStatus,
};

export function getDataSource(name: string): DataSource {
  const ds = dataSources[name];
  if (!ds) throw new Error(`Unknown data source: ${name}`);
  return ds;
}

export function getAction(name: string): Action {
  const action = actions[name];
  if (!action) throw new Error(`Unknown action: ${name}`);
  return action;
}

export * from "./types";

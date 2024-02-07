import { IRunnable } from "./runnable.interface";

type ProcessStatus = "happy" | "sad";

export interface IProcessStatus {
  status: ProcessStatus;
  lastStarted: Date;
}

export interface IProcess extends IRunnable {
  name: string;
  command: string[];
  getStatus(): Promise<IProcessStatus>;
}

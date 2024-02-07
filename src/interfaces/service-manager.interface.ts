import { IProcess } from "./process.interface";
import { IRunnable } from "./runnable.interface";

export type AttachOptions = {
  dependencies?: IRunnable[];
};
export interface IServiceManager extends IRunnable {
  attach(process: IProcess | IServiceManager, options?: AttachOptions): void;
}

import { IServiceManager } from "./service-manager.interface";

export type Capabilities = "CAP_SYS_ADMIN" | "CAP_NET_RAW";

export type RunnableOptions = {
  cwd?: string;
  user?: string;
  scale?: number;
  writablePaths?: string[];
  capabilities?: Capabilities[];
  dependencies?: IRunnable[];
};

export interface IRunnable {
  name: string;
  options: RunnableOptions;

  // This should prepare the services to be started.
  setup(): Promise<void>;

  start(): Promise<void>;
  restart(): Promise<void>;
  stop(): Promise<void>;

  parent?: IServiceManager;
  path(): string;
  fullName(): string;
}

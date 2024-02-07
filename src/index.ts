import { IProcess, RunnableOptions, IServiceManager } from "./interfaces";
import * as ServiceManager from "./implementations";

export function createProcess(
  type: "systemd" | "docker-compose",
  name: string,
  command: string[],
  options: RunnableOptions = {}
): IProcess {
  switch (type) {
    case "systemd":
      return new ServiceManager.SystemdProcessManager(name, command, options);
    // you can add more cases if there are other implementations of IProcess
    case "docker-compose":
      return new ServiceManager.DockerComposeProcessManager(name, command, options);
    default:
      throw new Error("Invalid process type");
  }
}

export function createServiceManager(
  type: "systemd" | "docker-compose",
  name: string,
  options?: RunnableOptions
): IServiceManager {
  switch (type) {
    case "systemd":
      return new ServiceManager.SystemdServiceManager(name, options);
    case "docker-compose":
      return new ServiceManager.DockerComposeServiceManager(name, options);
    default:
      throw new Error("Invalid service manager type");
  }
}

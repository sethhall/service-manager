import { mkdir, writeFile } from "node:fs/promises";
import { exec } from "node:child_process";

import { AttachOptions, IServiceManager } from "../interfaces/service-manager.interface";
import { IRunnable, RunnableOptions } from "../interfaces/runnable.interface";
import path from "node:path";

export class SystemdServiceManager implements IServiceManager {
  parent?: IServiceManager;

  private runnables: IRunnable[] = [];
  name: string;
  options: RunnableOptions = {};

  constructor(name: string, options?: RunnableOptions) {
    this.name = name;
    if (options) {
      this.options = options;
    }
  }

  path(): string {
    if (this.parent) {
      return this.parent.fullName();
    }
    return "";
  }

  fullName() {
    if (this.path() !== "") {
      return this.path() + "." + this.name;
    } else {
      return this.name;
    }
  }

  attach(process: IRunnable, attachOptions?: AttachOptions): void {
    process.parent = this;
    if (attachOptions) {
      process.options = { ...process.options, ...attachOptions };
    }

    this.runnables.push(process);
  }

  async start(): Promise<void> {
    for (const child of this.runnables) {
      await child.start();
    }
  }

  async restart(): Promise<void> {
    for (const child of this.runnables) {
      await child.restart();
    }
  }

  async stop(): Promise<void> {
    for (const child of this.runnables) {
      await child.stop();
    }
  }

  async setup(): Promise<void> {
    const partOf = this.parent ? `PartOf=${this.parent.fullName()}.service` : "";
    let wants = "";
    if (this.options?.dependencies) {
      for (const dependency of this.options.dependencies) {
        wants += `After=${dependency.fullName()}.service\n`;
        wants += `Wants=${dependency.fullName()}.service\n`;
      }
    }

    const serviceFileContent = `
[Unit]
Description=${this.name}
${partOf}
${wants}

[Service]
# The dummy program will exit
Type=oneshot
# Execute a dummy program
ExecStart=/bin/true
# This service shall be considered active after start
RemainAfterExit=yes

[Install]
# Components of this application should be started at boot time
WantedBy=multi-user.target
`;

    const serviceFile = path.join("/", "run", "systemd", "system", this.fullName() + ".service");

    console.log(`Writing service file ${serviceFile}`);
    await writeFile(serviceFile, serviceFileContent);

    await Promise.all(this.runnables.map((child) => child.setup()));

    // Only reload when we're the root.
    if (!this.parent) {
      console.log("Systemd unit reloading");
      await this.execCommand(`systemctl daemon-reload`);
    }
  }

  private execCommand(command: string): Promise<void> {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.warn(error);
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }
}

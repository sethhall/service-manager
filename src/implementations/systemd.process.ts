import { mkdir, writeFile } from "node:fs/promises";
import { exec } from "node:child_process";
import path from "node:path";
import os from "node:os";
import { mkdirSync } from "node:fs";

import { IProcess, IProcessStatus } from "../interfaces/process.interface";
import { IServiceManager } from "../interfaces/service-manager.interface";
import { RunnableOptions } from "../interfaces/runnable.interface";

export class SystemdProcessManager implements IProcess {
  name: string;
  command: string[];
  options: RunnableOptions;
  status: IProcessStatus;

  parent?: IServiceManager;

  constructor(name: string, command: string[], options: RunnableOptions = {}) {
    this.name = name;
    this.command = command;
    this.status = { status: "sad", lastStarted: new Date() };
    this.options = {
      user: "root",
      ...options,
    };
  }

  private async execCommand(command: string): Promise<void> {
    return new Promise((resolve, reject) => {
      exec(command, (error) => {
        if (error) {
          this.status = { status: "sad", lastStarted: new Date() };
          reject(error);
          return;
        }
        this.status = { status: "happy", lastStarted: new Date() };
        resolve();
      });
    });
  }

  async start(): Promise<void> {
    let services: string[] = [this.fullName()];
    if (this.options?.scale) {
      services = [];
      for (let i = 1; i <= this.options.scale; i++) {
        services.push(this.fullName() + "@" + i);
      }
    }
    await this.execCommand(`systemctl start ${services.join(" ")}`);
  }

  async restart(): Promise<void> {
    let services: string[] = [this.fullName()];
    if (this.options?.scale) {
      services = [];
      for (let i = 1; i <= this.options.scale; i++) {
        services.push(this.fullName() + "@" + i);
      }
    }
    await this.execCommand(`systemctl restart ${services.join(" ")}`);
  }

  async stop(): Promise<void> {
    let services: string[] = [this.fullName()];
    if (this.options?.scale) {
      services = [];
      for (let i = 1; i <= this.options.scale; i++) {
        services.push(this.fullName() + "@" + i);
      }
    }
    await this.execCommand(`systemctl stop ${services.join(" ")}`);
  }

  async getStatus(): Promise<IProcessStatus> {
    return this.status;
  }

  path() {
    if (this.parent) {
      return this.parent.fullName();
    } else {
      return "";
    }
  }

  fullName() {
    const p = this.path();
    if (p !== "") {
      return p + "." + this.name;
    } else {
      return this.name;
    }
  }

  async setup(): Promise<void> {
    if (this.options.cwd) mkdirSync(this.options.cwd, { recursive: true });

    const writablePaths = this.options.writablePaths ? `ReadWritePaths=${this.options.writablePaths.join(" ")}` : "";
    const capabilities = this.options.capabilities
      ? "CapabilityBoundingSet=" +
        this.options.capabilities.join(" ") +
        "\n" +
        "AmbientCapabilities=" +
        this.options.capabilities.join(" ")
      : "";

    let wants = "";
    if (this.options?.dependencies) {
      for (const dependency of this.options.dependencies) {
        wants += `After=${dependency.fullName()}.service\n`;
        wants += `Wants=${dependency.fullName()}.service\n`;
      }
    }

    const partOf = this.parent ? `PartOf=${this.parent.fullName()}.service` : "";

    const serviceFileContent = `
[Unit]
Description=${this.name}${this.options?.scale ? " instance %i" : ""}
${partOf}
${wants}

[Service]
ExecStart=${this.command.join(" ")}
User=${this.options.user}
Restart=on-failure
WorkingDirectory=${this.options.cwd ?? os.homedir()}
${writablePaths}
${capabilities}

[Install]
WantedBy=multi-user.target
`;

    const serviceFile = path.join(
      "/",
      "run",
      "systemd",
      "system",
      this.fullName() + (this.options?.scale ? "@" : "") + ".service"
    );

    console.log(`Writing service file ${serviceFile}`);
    await writeFile(serviceFile, serviceFileContent);

    if (!this.parent) {
      await this.execCommand("systemctl daemon-reload");
    }
  }
}

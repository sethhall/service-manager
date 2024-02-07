const processManager = "systemd";
const workerCount = 100;

import process from "process";
import { createProcess, createServiceManager } from "./index";

const sensorService = createServiceManager(processManager, "sensor");

const suricataProc = createProcess(processManager, "suricata", ["/bin/sleep", "10000"], {
  //writablePaths: ["/spool/suricata"],
});
sensorService.attach(suricataProc);

// Zeek Service
const zeekService = createServiceManager(processManager, "zeek", { dependencies: [suricataProc] });
{
  sensorService.attach(zeekService);
  const managerProc = createProcess(processManager, "manager", ["/bin/sleep", "10000"], {
    cwd: "/spool/manager",
    writablePaths: ["/spool/manager"],
  });
  const proxyProc = createProcess(processManager, "proxy-01", ["/bin/sleep", "10000"], {
    cwd: "/spool/proxy-01",
    writablePaths: ["/spool/proxy-01"],
  });
  const loggerProc = createProcess(processManager, "logger-01", ["/bin/sleep", "10000"], {
    cwd: "/spool/logger-01",
    writablePaths: ["/spool/logger-01"],
  });

  zeekService.attach(managerProc, { dependencies: [loggerProc, proxyProc] });
  zeekService.attach(loggerProc);
  zeekService.attach(proxyProc);

  for (let i = 1; i <= workerCount; i++) {
    const workerProc = createProcess(processManager, `worker-${i}`, ["/bin/sleep", "10000"], {
      cwd: `/spool/worker-${i}`,
      writablePaths: [`/spool/worker-${i}`],
    });
    zeekService.attach(workerProc, { dependencies: [managerProc, loggerProc, proxyProc] });
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
  await sensorService.setup();
  await sensorService.start();
  console.log("Done starting sensor service");

  process.on("SIGINT", async (code) => {
    await sensorService.stop();
    console.log("Done stopping sensor service");
    process.exit(0);
  });

  while (true) {
    await sleep(5000);
    console.log("Restarting sensor service");
    await sensorService.restart();
  }
})();

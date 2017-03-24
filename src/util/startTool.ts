import elevated from './elevated';
import {log} from './log';
import runElevatedCustomTool from './runElevatedCustomTool';
import StarterInfo from './StarterInfo';

import * as Promise from 'bluebird';
import { execFile } from 'child_process';
import ipc = require('node-ipc');
import * as path from 'path';
import { generate as shortid } from 'shortid';

export type DeployResult = 'auto' | 'yes' | 'skip' | 'cancel';

function runToolElevated(starter: StarterInfo,
                         onError: (message: string, details: string) => void) {
  let toolCWD = starter.workingDirectory !== undefined ?
    starter.workingDirectory : path.dirname(starter.exePath);
  let elevatedTool = {
    id: starter.id,
    toolPath: starter.exePath.replace(/\\/g, '\\\\'),
    parameters: starter.commandLine,
    toolCWD,
  };

  // the ipc path has to be different every time so that
  // the ipc lib doesn't report EADDRINUSE when the same tool
  // is started multiple times.
  // Also node-ipc has a bug and would crash the application
  // if that were to happen
  const ipcPath: string = 'tool_elevated_' + shortid();
  // communicate with the elevated process via ipc
  ipc.serve(ipcPath, () => {
    ipc.server.on('finished', (modPath: string) => {
      ipc.server.stop();
    });
    ipc.server.on('socket.disconnected', () => {
      log('info', 'disconnected');
    });
    ipc.server.on('log', (ipcData: any) => {
      log(ipcData.level, ipcData.message, ipcData.meta);
      onError(ipcData.message, ipcData.meta.err);
    });
    // run it
    elevated(ipcPath, runElevatedCustomTool,
      elevatedTool);
  });
  ipc.server.start();
}

function startDeploy(queryDeploy: () => Promise<DeployResult>): Promise<boolean> {
  return queryDeploy()
  .then(shouldDeploy => {
    if (shouldDeploy === 'yes') {
      return new Promise<boolean>((resolve, reject) => {
              this.context.api.events.emit('activate-mods', (err) => {
                if (err !== null) {
                  reject(err);
                } else {
                  resolve(true);
                }
              });
      });
    } else if (shouldDeploy === 'auto') {
      return new Promise<boolean>((resolve, reject) => {
        this.context.api.events.emit('await-activation', (err: Error) => {
          if (err !== null) {
            reject(err);
          } else {
            resolve(true);
          }
        });
      });
    } else if (shouldDeploy === 'cancel') {
      return Promise.resolve(false);
    } else { // skip
      return Promise.resolve(true);
    }
  });
}

function startTool(starter: StarterInfo,
                   queryElevate: (name: string) => Promise<boolean>,
                   queryDeploy: () => Promise<DeployResult>,
                   onShowError: (message: string, details?: string | Error) => void
                   ): Promise<void> {
  return startDeploy(queryDeploy)
    .then((doStart: boolean) => {
      if (doStart) {
        try {
          execFile(starter.exePath, {
            cwd: starter.workingDirectory,
            env: Object.assign({}, process.env, starter.environment),
        });
      } catch (err) {
        // TODO: as of the current electron version (1.4.14) the error isn't precise
        //   enough to determine if the error was actually lack of elevation but among
        //   the errors that report "UNKNOWN" this should be the most likely one.
        if (err.errno === 'UNKNOWN') {
          queryElevate(starter.name)
          .then(shouldElevate => {
            if (shouldElevate) {
              runToolElevated(starter, onShowError);
            }
          });
        } else {
          log('info', 'failed to run custom tool', { err: err.message });
        }
      }
    }
  });
}

export default startTool;
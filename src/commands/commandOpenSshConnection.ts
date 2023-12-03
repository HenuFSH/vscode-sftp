import * as vscode from 'vscode';
import { COMMAND_OPEN_CONNECTION_IN_TERMINAL } from '../constants';
import { getAllFileService } from '../modules/serviceManager';
import { ExplorerRoot } from '../modules/remoteExplorer';
import { interpolate } from '../utils';
import { checkCommand } from './abstract/createCommand';
import { handleCtxFromUri} from '../fileHandlers';
import  * as filehelper from '../helper'

const isWindows = process.platform === 'win32';

function shouldUseAgent(config) {
  return typeof config.agent === 'string' && config.agent.length > 0;
}

function shouldUseKey(config) {
  return typeof config.privateKeyPath === 'string' && config.privateKeyPath.length > 0;
}

function adaptPath(filepath) {
  if (isWindows) {
    return filepath.replace(/\\\\/g, '\\');
  }

  // convert to unix style
  return filepath.replace(/\\\\/g, '/').replace(/\\/g, '/');
}

function getSshCommand(
  config: { host: string; port: number; username: string; workingDir: string },
  extraOption?: string
) {
  let sshStr = `ssh -t ${config.username}@${config.host} -p ${config.port}`;
  if (extraOption) {
    sshStr += ` ${extraOption}`;
  }
  if(config.workingDir) {
    sshStr += ` "cd ${config.workingDir}; exec bash -l"`;
  }
  return sshStr;
}

export default checkCommand({
  id: COMMAND_OPEN_CONNECTION_IN_TERMINAL,

  async handleCommand(exploreItem?: ExplorerRoot) {    
    let remoteConfig;
    if (exploreItem && exploreItem.explorerContext) {
      remoteConfig = exploreItem.explorerContext.config;
      if (remoteConfig.protocol !== 'sftp') {
        return;
      }
    }
    else if (exploreItem && exploreItem instanceof vscode.Uri) {
      let uri = exploreItem as vscode.Uri;
      let handle_ctx = handleCtxFromUri(uri);
      if (handle_ctx.config.protocol !== 'sftp') {
        return;
      }
      remoteConfig = handle_ctx.config;
      let fileStat = filehelper.stat(uri)
      if(fileStat.isFile)
      {
        remoteConfig.workingDir = filehelper.dirname(handle_ctx.target.remoteFsPath);
      }
      else if(fileStat.isDirectory)
      {
        remoteConfig.workingDir = handle_ctx.target.remoteFsPath;
      }
    }

    if(!remoteConfig) {7
      const remoteItems = getAllFileService().reduce<
        { label: string; description: string; config: any }[]
      >((result, fileService) => {
        const config = fileService.getConfig();
        if (config.protocol === 'sftp') {
          result.push({
            label: config.name || config.remotePath,
            description: config.host,
            config,
          });
        }
        return result;
      }, []);
      if (remoteItems.length <= 0) {
        return;
      }
      

      const item = await vscode.window.showQuickPick(remoteItems, {
        placeHolder: 'Select a folder...',
      });
      if (item === undefined) {
        return;
      }

      remoteConfig = item.config;
    }

    const sshConfig = {
      host: remoteConfig.host,
      port: remoteConfig.port,
      username: remoteConfig.username,
      workingDir: remoteConfig.workingDir,
    };
    const terminal = vscode.window.createTerminal(remoteConfig.name);
    let sshCommand;
    if (shouldUseAgent(remoteConfig)) {
      sshCommand = getSshCommand(sshConfig);
    } else if (shouldUseKey(remoteConfig)) {
      sshCommand = getSshCommand(sshConfig, `-i "${adaptPath(remoteConfig.privateKeyPath)}"`);
    } else {
      sshCommand = getSshCommand(sshConfig);
    }

    if (remoteConfig.sshCustomParams) {
      sshCommand =
        sshCommand +
        ' ' +
        interpolate(remoteConfig.sshCustomParams, {
          remotePath: remoteConfig.remotePath,
        });
    }

    terminal.sendText(sshCommand);
    terminal.show();
  },
});

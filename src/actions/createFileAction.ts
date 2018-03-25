import * as path from 'path';
import { simplifyPath } from '../host';
import upath from '../modules/upath';
import { getHostInfo } from '../modules/config';
import localFs from '../modules/localFs';
import getRemoteFs from '../modules/remoteFs';
import Ignore from '../modules/Ignore';
import { FileTask } from '../modules/fileTransferTask';
import * as paths from '../helper/paths';
import * as output from '../modules/output';
import logger from '../logger';
import { disableWatcher, enableWatcher } from '../modules/fileWatcher';

function onProgress(error, task: FileTask) {
  if (error) {
    logger.error(error, `${task.type} ${task.file.fsPath}`);
  }

  logger.info(`${task.type} ${task.file.fsPath}`);
  output.status.msg({
    text: `${task.type} ${path.basename(task.file.fsPath)}`,
    tooltip: simplifyPath(task.file.fsPath),
  });
}

export default function createFileAction(
  actionName: string,
  func,
  { doNotTriggerWatcher = false } = {}
) {
  return async (localFilePath, config) => {
    const localContext = config.context;
    const remoteContext = config.remotePath;

    const ignore = Ignore.from(config.ignore);
    const ignoreFunc = fsPath => {
      // vscode will always return path with / as separator
      const normalizedPath = path.normalize(fsPath);
      let relativePath;
      if (normalizedPath.indexOf(localContext) === 0) {
        // local path
        relativePath = path.relative(localContext, fsPath);
      } else {
        // remote path
        relativePath = upath.relative(remoteContext, fsPath);
      }

      // skip root
      return relativePath !== '' && ignore.ignores(relativePath);
    };

    output.status.msg('connecting...', config.connectTimeout);
    const remoteFs = await getRemoteFs(getHostInfo(config));
    logger.info('connected');

    if (doNotTriggerWatcher) {
      disableWatcher(config);
    }

    output.status.msg({
      text: `${actionName} ${path.basename(localFilePath)}...`,
      tooltip: simplifyPath(localFilePath),
    });

    let retValue;
    try {
      retValue = await func(
        localFilePath,
        {
          ...config,
          concurrency: config.protocol === 'ftp' ? 1 : config.concurrency,
          remotePath: paths.toRemote(path.relative(localContext, localFilePath), remoteContext),
          ignore: ignoreFunc,
        },
        {
          localFs,
          remoteFs,
          onProgress,
        }
      );
    } catch (error) {
      throw error;
    } finally {
      if (doNotTriggerWatcher) {
        enableWatcher(config);
      }
    }

    return retValue;
  };
}

import { COMMAND_COPY_LINE_NO } from '../constants';
import logger from '../logger';
import { checkCommand } from './abstract/createCommand';
const { exec } = require('child_process');
import { posix } from 'path';

export default checkCommand({
  id: COMMAND_COPY_LINE_NO,

  async handleCommand(editor) {
    try {
        let filename = posix.basename(editor.document.uri.path);
        let linenumber = editor.selection.active.line + 1;
        exec('clip').stdin.end(filename + ":" + linenumber);
    } catch (error) {
        logger.error(error);
    }
  },
});
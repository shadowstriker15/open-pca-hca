import { ipcRenderer } from 'electron';
import { Session } from '@/utils/Session';

/**
* Compose response to send to main process, which will be relayed to another window
* @param command The command the receiver window needs to listen for
* @param payload The data to send to the receiver window
* @author: Austin Pearce
*/
function composeResponse(command: string, payload: any) {
    ipcRenderer.send('message-from-worker', {
        command: command, payload: payload
    })
}

ipcRenderer.on('message-from-main', async (event, arg) => {
    // Perform requested command from main process
    let payload = arg.payload;
    let command = arg.command;

    console.log(`Worker command ${command} has been requested`);
    switch (command) {
        case 'readImportDataframe': {
            const session = new Session(payload.passedSession);
            return composeResponse(command, { importObj: await session.readImportDataframe(payload.withClasses, payload.withDimensions) });
        }
        case 'readPredictMatrix': {
            const session = new Session(payload.passedSession);
            return composeResponse(command, { traces: await session.readPredictMatrix(payload.dimensions, payload.normalize_type) });
        }
        case 'readDistanceMatrix': {
            const session = new Session(payload.passedSession);
            return composeResponse(command, { matrix: await session.readDistanceMatrix(payload.matrix, payload.classes, payload.normalize_type) });
        }
        default:
            console.warn(`Worker received an unrecognizable command '${command}' from main'`);
            break;
    }
})
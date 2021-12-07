import { ipcRenderer } from 'electron';
import { Session } from '@/utils/Session';

let composeResponse = (command: string, payload: any) => {
    ipcRenderer.send('message-from-worker', {
        command: command, payload: payload
    })
}

ipcRenderer.on('message-from-main', async (event, arg) => {
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
            console.warn(`Worker received an unrecognizable command ${command}`);
            break;
    }
})
import { session } from "../@types/session";

export class Session {
    session: session

    constructor(session: session) {
        this.session = session
    }

    createSession() {
        const sessionStr = JSON.stringify(this.session);
        localStorage.setItem("session", sessionStr);

        window.session.createSessionDir(this.session.name).then((dir) => {
            // Store an info.json file in directory
            window.session.saveSessionFile(sessionStr, 'info.json');
        })
    }

    updateSession() {
        // Update info.json file
        const sessionStr = JSON.stringify(this.session);
        localStorage.setItem("session", sessionStr);
        window.session.saveSessionFile(sessionStr, 'info.json');
    }

    getSessionDir() {
        return window.store.getDirectory(['session', this.session.name]);
    }
}
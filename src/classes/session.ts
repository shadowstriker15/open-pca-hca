import { session } from "../@types/session";

export class Session {
    session: session

    constructor(session: session) {
        this.session = session
    }

    createSession() {
        localStorage.setItem("session", JSON.stringify(this.session););

        window.session.createSessionDir(this.session).then((dir) => {
            // Store an info.json file in directory
            window.session.saveSessionFile(this.session, 'info.json');
        })
    }

    updateSession() {
        // Update info.json file
        localStorage.setItem("session", JSON.stringify(this.session));
        window.session.saveSessionFile(this.session, 'info.json');
    }

    getSessionDir() {
        return window.system.getDirectory(['session', this.session.name]);
    }
}
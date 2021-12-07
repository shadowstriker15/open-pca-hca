import { session } from "../@types/session";

export class ProgramSession {
    session: session

    constructor(session: session | null = null) {
        if (session) {
            this.session = session;
            this.session.predict_normalize = 'center';
            this.session.distance_normalize = 'none';
        }
        else {
            const sessionStr = localStorage.getItem("currentSession");
            if (sessionStr) this.session = JSON.parse(sessionStr) as session;
            else this.session = {} as session;
        }
    }

    /**
    * Handle the process of session creation
    * @author: Austin Pearce
    */
    createSession(): void {
        localStorage.setItem("currentSession", JSON.stringify(this.session));

        window.session.createSessionDir(this.session).then((dir) => {
            // Save session to info.json file
            window.session.saveInfo(this.session, 'session', this.session);
        })
    }

    /**
    * Handle the process of session deletion
    * @returns Promise of deletion
    * @author: Austin Pearce
    */
    deleteSession(): Promise<void> {
        return window.session.deleteSession(this.session);
    }

    /**
    * Handle the process of updating session
    * @author: Austin Pearce
    */
    updateSession() {
        localStorage.setItem("currentSession", JSON.stringify(this.session));
        window.session.saveInfo(this.session, 'session', this.session);
    }
}
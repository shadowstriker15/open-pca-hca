import { session } from "@/@types/session";
import { Session } from "./Session";
import { System } from "./System";

export class Export {
    Session: Session;
    System: System;

    constructor(session: Session) {
        this.Session = session;
        this.System = new System();
    }
}
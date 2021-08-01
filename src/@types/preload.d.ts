import { api } from '../preload'

declare global {
    interface Window {
        Main: typeof api
    }
}
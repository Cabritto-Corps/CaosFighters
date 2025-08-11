// TODO: Implement proper logging system
// TODO: Add log levels (debug, info, warn, error)
// TODO: Add log persistence and remote logging
// TODO: Add log formatting and timestamps

export const logger = {
    debug: (message: string, ...args: any[]) => {
        if (__DEV__) {
            console.log(`[DEBUG] ${message}`, ...args)
        }
    },

    info: (message: string, ...args: any[]) => {
        console.log(`[INFO] ${message}`, ...args)
    },

    warn: (message: string, ...args: any[]) => {
        console.warn(`[WARN] ${message}`, ...args)
    },

    error: (message: string, ...args: any[]) => {
        console.error(`[ERROR] ${message}`, ...args)
    },
}

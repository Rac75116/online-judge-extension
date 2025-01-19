export class PythonNotInstalledError extends Error {
    static {
        this.prototype.name = "PythonNotInstalledError";
    }
}

export class EnvironmentError extends Error {
    static {
        this.prototype.name = "EnvironmentError";
    }
}

export class KnownError extends Error {
    static {
        this.prototype.name = "KnownError";
    }
}

export class UnknownError extends Error {
    static {
        this.prototype.name = "UnknownError";
    }
}

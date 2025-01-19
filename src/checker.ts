import { EnvironmentError, KnownError, PythonNotInstalledError } from "./error";
import { async_exec } from "./global";

const py_version = [3, 8];
const oj_version = [12, 0, 0];
const oj_api_version = [10, 10, 1];
const oj_verify_version = [5, 6, 0];

function satisfy_version(requested_version: number[], current_version: number[]) {
    const length = requested_version.length;
    for (let i = 0; i < length; ++i) {
        if (requested_version[i] < current_version[i]) {
            return true;
        }
        if (requested_version[i] > current_version[i]) {
            return false;
        }
    }
    return true;
}

let checked_py_version = false;
export async function check_py_version() {
    if (checked_py_version) {
        return;
    }
    const { error, stdout, stderr } = await async_exec("pip3 --version", true);
    if (error) {
        throw new PythonNotInstalledError("Python is not installed.");
    }
    const version = stdout
        .match(/python (\d+)\.(\d+)/)
        ?.slice(1)
        .map(Number);
    if (py_version.length !== version?.length) {
        throw new KnownError("Failed to extract a version of Python.");
    }
    if (!satisfy_version(py_version, version)) {
        throw new PythonNotInstalledError(`oj-ext requires python ${py_version[0]}.${py_version[1]} or higher.`);
    }
    checked_py_version = true;
}

let checked_oj_version = false;
export async function check_oj_version() {
    if (checked_oj_version) {
        return;
    }
    const { error, stdout, stderr } = await async_exec("pip3 show online-judge-tools", true);
    if (error) {
        throw new EnvironmentError("online-judge-tools is not installed.");
    }
    const version = stdout
        .match(/Version: (\d+)\.(\d+)\.(\d+)/)
        ?.slice(1)
        .map(Number);
    if (oj_version.length !== version?.length) {
        throw new KnownError("Failed to extract a version of online-judge-tools.");
    }
    if (!satisfy_version(oj_version, version)) {
        throw new EnvironmentError(`oj-ext requires online-judge-tools ${oj_version[0]}.${oj_version[1]}.${oj_version[2]} or higher.`);
    }
    checked_oj_version = true;
}

let checked_oj_api_version = false;
export async function check_oj_api_version() {
    if (checked_oj_api_version) {
        return;
    }
    const { error, stdout, stderr } = await async_exec("pip3 show online-judge-api-client", true);
    if (error) {
        throw new EnvironmentError("online-judge-api-client is not installed.");
    }
    const version = stdout
        .match(/Version: (\d+)\.(\d+)\.(\d+)/)
        ?.slice(1)
        .map(Number);
    if (oj_api_version.length !== version?.length) {
        throw new KnownError("Failed to extract a version of online-judge-api-client.");
    }
    if (!satisfy_version(oj_api_version, version)) {
        throw new EnvironmentError(`oj-ext requires online-judge-api-client ${oj_api_version[0]}.${oj_api_version[1]}.${oj_api_version[2]} or higher.`);
    }
    checked_oj_api_version = true;
}

let checked_oj_verify_version = false;
export async function check_oj_verify_version() {
    if (checked_oj_verify_version) {
        return;
    }
    const { error, stdout, stderr } = await async_exec("pip3 show online-judge-verify-helper", true);
    if (error) {
        throw new EnvironmentError("online-judge-verify-helper is not installed.");
    }
    const version = stdout
        .match(/Version: (\d+)\.(\d+)\.(\d+)/)
        ?.slice(1)
        .map(Number);
    if (oj_verify_version.length !== version?.length) {
        console.log(stdout.replace(/.*Version: (\d+)\.(\d+)\.(\d+).*/, "$1 $2 $3"));
        throw new KnownError("Failed to extract a version of online-judge-verify-helper.");
    }
    if (!satisfy_version(oj_verify_version, version)) {
        throw new EnvironmentError(`oj-ext requires online-judge-verify-helper ${oj_verify_version[0]}.${oj_verify_version[1]}.${oj_verify_version[2]} or higher.`);
    }
    checked_oj_verify_version = true;
}

let checked_has_selenium = false;
export async function has_selenium() {
    if (checked_has_selenium) {
        return true;
    }
    const { error, stdout, stderr } = await async_exec("pip3 show selenium", true);
    if (error) {
        return false;
    }
    checked_has_selenium = true;
    return true;
}

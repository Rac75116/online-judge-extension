import { async_exec } from "./global";

const py_version = [3, 8];
const oj_version = [12, 0, 0];
const oj_api_version = [10, 10, 1];
const oj_verify_version = [5, 6, 0];

function satisfy_version(requested_version: number[], current_version: number[]) {
    if (requested_version.length !== current_version.length) {
        throw Error("Invalid Arguments");
    }
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
    const { error, stdout, stderr } = await async_exec("pip3 --version");
    if (stdout !== "") {
        console.log(stdout);
    }
    if (stderr !== "") {
        console.error(stderr);
    }
    if (error) {
        throw new Error("Please install Python.");
    }
    const version = stdout
        .replace(/.*python (\d+)\.(\d+)\)/, "$1 $2")
        .split(" ")
        .map(Number);
    if (satisfy_version(py_version, version)) {
        throw new Error(`"Online Judge Extension" requires python ${py_version[0]}.${py_version[1]} or higher.`);
    }
    checked_py_version = true;
}

let checked_oj_version = false;
export async function check_oj_version() {
    if (checked_oj_version) {
        return;
    }
    const { error, stdout, stderr } = await async_exec("pip3 show online-judge-tools");
    if (stdout !== "") {
        console.log(stdout);
    }
    if (stderr !== "") {
        console.error(stderr);
    }
    if (error) {
        throw new Error("Please install online-judge-tools.");
    }
    const version = stdout
        .replace(/.*Version: (\d+)\.(\d+)\.(\d+).*/, "$1 $2 $3")
        .split(" ")
        .map(Number);
    if (!satisfy_version(oj_version, version)) {
        throw new Error(`This extension requires online-judge-tools ${oj_version[0]}.${oj_version[1]}.${oj_version[2]} or higher.`);
    }
    checked_oj_version = true;
}

let checked_oj_api_version = false;
export async function check_oj_api_version() {
    if (checked_oj_api_version) {
        return;
    }
    const { error, stdout, stderr } = await async_exec("pip3 show online-judge-api-client");
    if (stdout !== "") {
        console.log(stdout);
    }
    if (stderr !== "") {
        console.error(stderr);
    }
    if (error) {
        throw new Error("Please install online-judge-api-client.");
    }
    const version = stdout
        .replace(/.*Version: (\d+)\.(\d+)\.(\d+).*/, "$1 $2 $3")
        .split(" ")
        .map(Number);
    if (!satisfy_version(oj_api_version, version)) {
        throw new Error(`This extension requires online-judge-api-client ${oj_api_version[0]}.${oj_api_version[1]}.${oj_api_version[2]} or higher.`);
    }
    checked_oj_api_version = true;
}

let checked_oj_verify_version = false;
export async function check_oj_verify_version() {
    if (checked_oj_verify_version) {
        return;
    }
    const { error, stdout, stderr } = await async_exec("pip3 show online-judge-verify-helper");
    if (stdout !== "") {
        console.log(stdout);
    }
    if (stderr !== "") {
        console.error(stderr);
    }
    if (error) {
        throw new Error("Please install online-judge-verify-helper.");
    }
    const version = stdout
        .replace(/.*Version: (\d+)\.(\d+)\.(\d+).*/, "$1 $2 $3")
        .split(" ")
        .map(Number);
    if (!satisfy_version(oj_verify_version, version)) {
        throw new Error(`This extension requires online-judge-verify-helper ${oj_verify_version[0]}.${oj_verify_version[1]}.${oj_verify_version[2]} or higher.`);
    }
    checked_oj_verify_version = true;
}

let checked_has_selenium = false;
export async function has_selenium() {
    if (checked_has_selenium) {
        return true;
    }
    const { error, stdout, stderr } = await async_exec("pip3 show selenium");
    if (stdout !== "") {
        console.log(stdout);
    }
    if (stderr !== "") {
        console.error(stderr);
    }
    if (error) {
        return false;
    }
    checked_has_selenium = true;
    return true;
}

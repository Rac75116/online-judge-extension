import * as vscode from "vscode";
import * as child_process from "node:child_process";

const py_version = [3, 12];
const oj_version = [11, 5, 1];
const oj_api_version = [10, 10, 1];
const oj_verify_version = [5, 6, 0];
export function check_py_version() {
    return new Promise((resolve) => {
        child_process.exec("pip3 --version", (error, stdout, stderr) => {
            if (stdout !== "") console.log(stdout);
            if (stderr !== "") console.error(stderr);
            if (error) {
                vscode.window.showErrorMessage("Please install python.");
                resolve(false);
                return;
            }
            const version = stdout
                .toString()
                .replace(/.*python (\d+)\.(\d+)\)/, "$1 $2")
                .split(" ")
                .map(Number);
            if (py_version > version) {
                vscode.window.showErrorMessage(`This extension requires python ${py_version[0]}.${py_version[1]} or higher.`);
                resolve(false);
                return;
            }
            resolve(true);
        });
    });
}
export function check_oj_version() {
    return new Promise((resolve) => {
        child_process.exec("pip3 show online-judge-tools", (error, stdout, stderr) => {
            if (stdout !== "") console.log(stdout);
            if (stderr !== "") console.error(stderr);
            if (error) {
                vscode.window.showErrorMessage("Please install online-judge-tools.");
                resolve(false);
                return;
            }
            const version = stdout
                .match(/Version: (\d+)\.(\d+)\.(\d+).*/)
                ?.at(0)
                ?.replace(/Version: (\d+)\.(\d+)\.(\d+).*/, "$1 $2 $3")
                ?.split(" ")
                ?.map(Number);
            if (version === undefined) {
                vscode.window.showErrorMessage("Failed to extract version information.");
                resolve(false);
                return;
            }
            if (oj_version > version) {
                vscode.window.showErrorMessage(`This extension requires online-judge-tools ${oj_version[0]}.${oj_version[1]}.${oj_version[2]} or higher.`);
                resolve(false);
                return;
            }
            resolve(true);
        });
    });
}
export function check_oj_api_version() {
    return new Promise((resolve) => {
        child_process.exec("pip3 show online-judge-api-client", (error, stdout, stderr) => {
            if (stdout !== "") console.log(stdout);
            if (stderr !== "") console.error(stderr);
            if (error) {
                vscode.window.showErrorMessage("Please install online-judge-tools.");
                resolve(false);
                return;
            }
            const version = stdout
                .match(/Version: (\d+)\.(\d+)\.(\d+).*/)
                ?.at(0)
                ?.replace(/Version: (\d+)\.(\d+)\.(\d+).*/, "$1 $2 $3")
                ?.split(" ")
                ?.map(Number);
            if (version === undefined) {
                vscode.window.showErrorMessage("Failed to extract version information.");
                resolve(false);
                return;
            }
            if (oj_api_version > version) {
                vscode.window.showErrorMessage(`This extension requires online-judge-api-client ${oj_api_version[0]}.${oj_api_version[1]}.${oj_api_version[2]} or higher.`);
                resolve(false);
                return;
            }
            resolve(true);
        });
    });
}
export function check_oj_verify_version() {
    return new Promise((resolve) => {
        child_process.exec("pip3 show online-judge-verify-helper", (error, stdout, stderr) => {
            if (stdout !== "") console.log(stdout);
            if (stderr !== "") console.error(stderr);
            if (error) {
                vscode.window.showErrorMessage("Please install online-judge-verify-helper.");
                resolve(false);
                return;
            }
            const version = stdout
                .match(/Version: (\d+)\.(\d+)\.(\d+).*/)
                ?.at(0)
                ?.replace(/Version: (\d+)\.(\d+)\.(\d+).*/, "$1 $2 $3")
                ?.split(" ")
                ?.map(Number);
            if (version === undefined) {
                vscode.window.showErrorMessage("Failed to extract version information.");
                resolve(false);
                return;
            }
            if (oj_verify_version > version) {
                vscode.window.showErrorMessage(`This extension requires online-judge-verify-helper ${oj_verify_version[0]}.${oj_verify_version[1]}.${oj_verify_version[2]} or higher.`);
                resolve(false);
                return;
            }
            resolve(true);
        });
    });
}
export function has_selenium() {
    return new Promise((resolve) => {
        child_process.exec("pip3 show selenium", (error, stdout, stderr) => {
            if (stdout !== "") console.log(stdout);
            if (stderr !== "") console.error(stderr);
            resolve(!error);
        });
    });
}

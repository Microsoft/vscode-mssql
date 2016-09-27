import assert = require('assert');
import vscode = require('vscode');

suite('Telemetry Tests', () => {
    test('Correct version of applicationInsights is installed', () => {
        // Find the path of our extension
        let ext = vscode.extensions.getExtension('microsoft.vscode-mssql');

        // Open the applicationInsights node module package.json
        const appInsightsPackage: any = require(ext.extensionPath + '/node_modules/vscode-extension-telemetry/node_modules/applicationinsights/package.json');
        assert.ok(appInsightsPackage);

        // Verify that it is at least version 0.15.19
        const versionString: string = appInsightsPackage.version;
        assert.ok(versionString);
        const version: number[] = versionString.split('.').map(str => parseInt(str, 10));
        assert.ok(version);

        let versionOk: boolean = false;
        if (version[0] >= 1) {
            versionOk = true; // 1.x.x
        } else if (version[1] >= 16) {
            versionOk = true; // 0.16.x
        } else if (version[2] >= 19) {
            versionOk = true; // 0.15.x (x >= 19)
        }
        assert.ok(versionOk, 'Version of applicationInsights must be greater than or equal to 0.15.19. Detected version was ' + versionString);
    });
});

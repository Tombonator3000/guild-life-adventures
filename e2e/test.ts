import { expect, test as base } from '@playwright/test';

export const test = base.extend<{ browserDiagnostics: void }>({
  browserDiagnostics: [
    async ({ page }, use, testInfo) => {
      const diagnostics: string[] = [];

      page.on('console', message => {
        diagnostics.push(`[console:${message.type()}] ${message.text()}`);
      });
      page.on('pageerror', error => {
        diagnostics.push(`[pageerror] ${error.stack ?? error.message}`);
      });
      page.on('requestfailed', request => {
        diagnostics.push(
          `[requestfailed] ${request.method()} ${request.url()} — ${request.failure()?.errorText ?? 'unknown error'}`,
        );
      });

      await use();

      await testInfo.attach('browser-console', {
        body: diagnostics.join('\n') || '(no console, page, or request failures)',
        contentType: 'text/plain',
      });
    },
    { auto: true },
  ],
});

export { expect };

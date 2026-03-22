/**
 * E2E Test Specifications for Chat ↔ API Integration
 *
 * These tests require both the FastAPI backend (port 8000) and
 * Angular dev server (port 4200) to be running.
 *
 * Run with Playwright:
 *   npx playwright test e2e/chat.e2e-spec.ts
 *
 * Prerequisites:
 *   - Backend: make backend/run
 *   - Frontend: make frontend/start (or ng serve with proxy)
 *   - Install Playwright: npx playwright install
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'http://localhost:4200';

test.describe('Chat Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/chat`);
    await page.waitForSelector('.chat-layout');
  });

  test('should render empty state with suggestions', async ({ page }) => {
    await expect(page.locator('.empty-state h3')).toHaveText('Start a Knowledge Graph');
    const chips = page.locator('.chip');
    await expect(chips).toHaveCount(4);
  });

  test('should send a message and receive streaming response', async ({ page }) => {
    const input = page.locator('textarea');
    await input.fill('Map AI research to cognitive science');
    await page.locator('.send-btn').click();

    // User message should appear
    await expect(page.locator('.user-message')).toBeVisible();
    await expect(page.locator('.user-message .msg-content-text')).toContainText(
      'Map AI research',
    );

    // Streaming indicator should appear
    await expect(page.locator('.streaming-indicator')).toBeVisible({ timeout: 5000 });

    // Wait for assistant response to complete
    await expect(page.locator('.assistant-message')).toBeVisible({ timeout: 30000 });

    // Streaming indicator should disappear
    await expect(page.locator('.streaming-indicator')).not.toBeVisible({ timeout: 60000 });

    // Assistant message should have content
    const assistantContent = page.locator('.assistant-message .msg-content-text');
    await expect(assistantContent).not.toBeEmpty();
  });

  test('should show agent pipeline steps during streaming', async ({ page }) => {
    const input = page.locator('textarea');
    await input.fill('Explore renewable energy supply chains');
    await page.locator('.send-btn').click();

    // Agent steps card should appear in assistant message
    await expect(page.locator('.agent-steps-card')).toBeVisible({ timeout: 30000 });

    // Should have step rows
    const steps = page.locator('.step-row');
    await expect(steps.first()).toBeVisible();
  });

  test('should disable send button while streaming', async ({ page }) => {
    const input = page.locator('textarea');
    await input.fill('test query');
    await page.locator('.send-btn').click();

    // Send button should be disabled during streaming
    await expect(page.locator('.send-btn')).toBeDisabled({ timeout: 2000 });
  });

  test('should allow cancelling a stream', async ({ page }) => {
    const input = page.locator('textarea');
    await input.fill('Long running query');
    await page.locator('.send-btn').click();

    // Wait for streaming indicator
    await expect(page.locator('.streaming-indicator')).toBeVisible({ timeout: 5000 });

    // Click cancel
    await page.locator('.cancel-btn').click();

    // Streaming should stop
    await expect(page.locator('.streaming-indicator')).not.toBeVisible();
    await expect(page.locator('.send-btn')).not.toBeDisabled();
  });

  test('should start a new conversation', async ({ page }) => {
    // Send a message first
    const input = page.locator('textarea');
    await input.fill('hello');
    await page.locator('.send-btn').click();
    await expect(page.locator('.user-message')).toBeVisible();

    // Click new chat
    await page.locator('.new-chat-btn').click();

    // Messages should be cleared, empty state returns
    await expect(page.locator('.empty-state')).toBeVisible();
    await expect(page.locator('.user-message')).not.toBeVisible();
  });

  test('should update agent state panel during streaming', async ({ page }) => {
    // Ensure state panel is open
    const panel = page.locator('.state-panel');
    if (!(await panel.isVisible())) {
      await page.locator('.btn-icon-sm.active-toggle, .topbar-right .btn-icon-sm').first().click();
    }

    const input = page.locator('textarea');
    await input.fill('Build a graph about quantum computing');
    await page.locator('.send-btn').click();

    // Pipeline section should update
    await expect(page.locator('.pipeline-list .agent-row').first()).toBeVisible({
      timeout: 10000,
    });
  });

  test('should show error banner on backend failure', async ({ page }) => {
    // Intercept the session creation to simulate failure
    await page.route('**/api/v1/chat/sessions', (route) =>
      route.fulfill({ status: 500, body: 'Internal Server Error' }),
    );

    const input = page.locator('textarea');
    await input.fill('test');
    await page.locator('.send-btn').click();

    // Error banner should appear
    await expect(page.locator('.error-banner')).toBeVisible({ timeout: 5000 });
  });

  test('should use suggestion chip to populate input', async ({ page }) => {
    await page.locator('.chip').first().click();

    const input = page.locator('textarea');
    await expect(input).toHaveValue(/Map AI research/);
  });
});

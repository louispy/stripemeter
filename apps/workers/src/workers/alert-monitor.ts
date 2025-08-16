/**
 * Alert Monitor Worker - Monitors usage and triggers alerts
 */

import { db, redis, schema } from '@stripemeter/database';
import { eq, and, gte, sql } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { getCurrentPeriod } from '@stripemeter/core';

interface AlertAction {
  type: 'email' | 'webhook' | 'slack' | 'hard_cap' | 'soft_cap';
  config: Record<string, any>;
}

export class AlertMonitorWorker {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  async start() {
    const intervalMs = 60000; // Check every minute
    
    // Run immediately on start
    this.checkAlerts();
    
    // Then run on interval
    this.intervalId = setInterval(() => {
      if (!this.isRunning) {
        this.checkAlerts();
      }
    }, intervalMs);

    logger.info(`Alert monitor started (interval: ${intervalMs}ms)`);
  }

  async stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    // Wait for current run to complete
    while (this.isRunning) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    logger.info('Alert monitor stopped');
  }

  private async checkAlerts() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    
    try {
      // Get current period
      const { start: periodStart } = getCurrentPeriod();
      
      // Get all enabled alert configs
      const alertConfigs = await db
        .select()
        .from(schema.alertConfigs)
        .where(eq(schema.alertConfigs.enabled, true));

      logger.debug(`Checking ${alertConfigs.length} alert configurations`);

      for (const config of alertConfigs) {
        try {
          await this.checkAlertConfig(config, periodStart);
        } catch (error) {
          logger.error(`Failed to check alert config ${config.id}:`, error);
        }
      }

    } catch (error) {
      logger.error('Alert check failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  private async checkAlertConfig(
    config: typeof schema.alertConfigs.$inferSelect,
    periodStart: string
  ) {
    const { tenantId, customerRef, metric, type, threshold, action } = config;

    // Get relevant counters based on alert scope
    let query = db
      .select()
      .from(schema.counters)
      .where(
        and(
          eq(schema.counters.tenantId, tenantId),
          eq(schema.counters.periodStart, periodStart),
          ...(customerRef ? [eq(schema.counters.customerRef, customerRef)] : []),
          ...(metric ? [eq(schema.counters.metric, metric)] : [])
        )
      );

    const counters = await query;

    // Calculate current value based on alert type
    let currentValue = 0;
    let shouldTrigger = false;

    switch (type) {
      case 'threshold':
        // Sum of all matching counters
        currentValue = counters.reduce((sum, c) => sum + parseFloat(c.aggSum), 0);
        shouldTrigger = currentValue >= threshold;
        break;

      case 'spike':
        // Check for sudden increase (compare with previous period)
        const previousPeriod = await this.getPreviousPeriodValue(
          tenantId,
          customerRef,
          metric,
          periodStart
        );
        currentValue = counters.reduce((sum, c) => sum + parseFloat(c.aggSum), 0);
        const spikeRatio = previousPeriod > 0 ? currentValue / previousPeriod : 0;
        shouldTrigger = spikeRatio >= threshold;
        break;

      case 'budget':
        // Check against budget limit
        currentValue = counters.reduce((sum, c) => sum + parseFloat(c.aggSum), 0);
        shouldTrigger = currentValue >= threshold;
        break;
    }

    if (shouldTrigger) {
      // Check if alert was already triggered recently
      const recentAlertKey = `alert:triggered:${config.id}:${periodStart}`;
      const recentAlert = await redis.get(recentAlertKey);
      
      if (!recentAlert) {
        await this.triggerAlert(config, currentValue, periodStart);
        
        // Mark as triggered to prevent duplicate alerts
        await redis.setex(recentAlertKey, 3600, '1'); // 1 hour cooldown
      }
    }
  }

  private async triggerAlert(
    config: typeof schema.alertConfigs.$inferSelect,
    currentValue: number,
    periodStart: string
  ) {
    logger.warn(`Alert triggered: ${config.id}, value=${currentValue}, threshold=${config.threshold}`);

    // Record alert in history
    await db.insert(schema.alertHistory).values({
      alertConfigId: config.id,
      tenantId: config.tenantId,
      customerRef: config.customerRef,
      metric: config.metric,
      value: currentValue.toString(),
      threshold: config.threshold,
      action: config.action,
      status: 'triggered' as const,
      metadata: {
        periodStart,
        configType: config.type,
      },
      triggeredAt: new Date(),
    });

    // Execute alert action
    switch (config.action) {
      case 'email':
        await this.sendEmailAlert(config, currentValue);
        break;
      
      case 'webhook':
        await this.sendWebhookAlert(config, currentValue);
        break;
      
      case 'slack':
        await this.sendSlackAlert(config, currentValue);
        break;
      
      case 'hard_cap':
        await this.enforceHardCap(config);
        break;
      
      case 'soft_cap':
        await this.enforceSoftCap(config);
        break;
    }
  }

  private async getPreviousPeriodValue(
    tenantId: string,
    customerRef: string | null,
    metric: string | null,
    currentPeriodStart: string
  ): Promise<number> {
    // Calculate previous period start
    const currentDate = new Date(currentPeriodStart);
    currentDate.setMonth(currentDate.getMonth() - 1);
    const previousPeriodStart = currentDate.toISOString().split('T')[0];

    const counters = await db
      .select()
      .from(schema.counters)
      .where(
        and(
          eq(schema.counters.tenantId, tenantId),
          eq(schema.counters.periodStart, previousPeriodStart),
          ...(customerRef ? [eq(schema.counters.customerRef, customerRef)] : []),
          ...(metric ? [eq(schema.counters.metric, metric)] : [])
        )
      );

    return counters.reduce((sum, c) => sum + parseFloat(c.aggSum), 0);
  }

  private async sendEmailAlert(config: typeof schema.alertConfigs.$inferSelect, value: number) {
    // TODO: Implement email sending (e.g., using SendGrid, AWS SES, etc.)
    logger.info(`Would send email alert to ${config.config.email}: Usage at ${value}, threshold ${config.threshold}`);
    
    // Store in Redis for email queue processing
    await redis.lpush(
      'email:queue',
      JSON.stringify({
        to: config.config.email,
        subject: `Usage Alert: ${config.type} threshold exceeded`,
        template: 'usage_alert',
        data: {
          type: config.type,
          value,
          threshold: config.threshold,
          metric: config.metric,
          customerRef: config.customerRef,
        },
      })
    );
  }

  private async sendWebhookAlert(config: typeof schema.alertConfigs.$inferSelect, value: number) {
    const webhookUrl = config.config.url;
    if (!webhookUrl) {
      logger.error(`No webhook URL configured for alert ${config.id}`);
      return;
    }

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.config.headers || {}),
        },
        body: JSON.stringify({
          alertId: config.id,
          type: config.type,
          metric: config.metric,
          customerRef: config.customerRef,
          currentValue: value,
          threshold: config.threshold,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Webhook returned ${response.status}`);
      }

      logger.info(`Webhook alert sent to ${webhookUrl}`);
    } catch (error) {
      logger.error(`Failed to send webhook alert:`, error);
    }
  }

  private async sendSlackAlert(config: typeof schema.alertConfigs.$inferSelect, value: number) {
    const slackWebhook = config.config.webhook;
    if (!slackWebhook) {
      logger.error(`No Slack webhook configured for alert ${config.id}`);
      return;
    }

    try {
      const response = await fetch(slackWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🚨 Usage Alert`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Alert Type:* ${config.type}\n*Metric:* ${config.metric || 'All'}\n*Customer:* ${config.customerRef || 'All'}\n*Current Value:* ${value}\n*Threshold:* ${config.threshold}`,
              },
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Slack webhook returned ${response.status}`);
      }

      logger.info(`Slack alert sent`);
    } catch (error) {
      logger.error(`Failed to send Slack alert:`, error);
    }
  }

  private async enforceHardCap(config: typeof schema.alertConfigs.$inferSelect) {
    // Set hard cap flag in Redis - API will reject new events
    const capKey = `cap:hard:${config.tenantId}:${config.customerRef || 'all'}:${config.metric || 'all'}`;
    await redis.set(capKey, '1');
    
    logger.warn(`Hard cap enforced for ${capKey}`);
    
    // Notify customer
    if (config.config.notifyCustomer) {
      await this.sendEmailAlert(config, parseFloat(config.threshold));
    }
  }

  private async enforceSoftCap(config: typeof schema.alertConfigs.$inferSelect) {
    // Set soft cap flag in Redis - API will warn but still accept events
    const capKey = `cap:soft:${config.tenantId}:${config.customerRef || 'all'}:${config.metric || 'all'}`;
    await redis.set(capKey, '1');
    
    logger.info(`Soft cap enforced for ${capKey}`);
    
    // Notify customer
    if (config.config.notifyCustomer) {
      await this.sendEmailAlert(config, parseFloat(config.threshold));
    }
  }
}

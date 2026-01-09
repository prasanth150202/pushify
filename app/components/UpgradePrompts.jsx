import { Banner, Link, Button, InlineStack, Text } from '@shopify/polaris';

/**
 * Reusable component to show upgrade prompts for locked features
 * @param {Object} props
 * @param {string} props.featureName - Display name of the feature
 * @param {string} props.requiredPlan - Minimum plan required
 * @param {string} props.currentPlan - User's current plan
 * @param {string} props.tone - Banner tone (default: 'info')
 * @param {boolean} props.showButton - Show upgrade button (default: true)
 */
export function UpgradeBanner({
    featureName,
    requiredPlan,
    currentPlan,
    tone = 'info',
    showButton = true
}) {
    const upgradeUrl = `/app/upgrade?plan=${requiredPlan.toUpperCase()}_PLAN`;

    return (
        <Banner tone={tone}>
            <InlineStack gap="200" blockAlign="center" wrap={false}>
                <div style={{ flex: 1 }}>
                    <Text as="p" fontWeight="semibold">
                        {featureName} requires {requiredPlan} plan or higher
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                        You're currently on the {currentPlan} plan.
                    </Text>
                </div>
                {showButton && (
                    <Button url="/app/plan" variant="primary">
                        View Plans
                    </Button>
                )}
            </InlineStack>
        </Banner>
    );
}

/**
 * Inline upgrade prompt for disabled features
 */
export function InlineUpgradePrompt({ featureName, requiredPlan }) {
    return (
        <div style={{
            padding: '12px',
            background: 'var(--p-color-bg-surface-secondary)',
            borderRadius: 'var(--p-border-radius-200)',
            border: '1px solid var(--p-color-border-secondary)'
        }}>
            <InlineStack gap="200" blockAlign="center">
                <Text as="span" variant="bodyMd" tone="subdued">
                    🔒 {featureName}
                </Text>
                <Text as="span" variant="bodySm" tone="subdued">
                    ({requiredPlan}+ only)
                </Text>
                <Link url="/app/plan" removeUnderline>
                    Upgrade
                </Link>
            </InlineStack>
        </div>
    );
}

/**
 * Quota warning banner
 */
export function QuotaBanner({ quotaData }) {
    if (!quotaData) return null;

    const percentage = (quotaData.sent_today / quotaData.limit) * 100;

    if (percentage >= 100) {
        return (
            <Banner tone="critical">
                <Text as="p" fontWeight="semibold">
                    Daily push limit reached
                </Text>
                <Text as="p" variant="bodySm">
                    You've sent {quotaData.sent_today} of {quotaData.limit} pushes today.
                    Upgrade your plan for higher limits.
                </Text>
                <div style={{ marginTop: '8px' }}>
                    <Button url="/app/plan" variant="primary">
                        Upgrade Plan
                    </Button>
                </div>
            </Banner>
        );
    }

    if (percentage >= 80) {
        return (
            <Banner tone="warning">
                <Text as="p" fontWeight="semibold">
                    Approaching daily limit
                </Text>
                <Text as="p" variant="bodySm">
                    You've used {quotaData.sent_today} of {quotaData.limit} pushes today
                    ({Math.round(percentage)}%). {quotaData.remaining} remaining.
                </Text>
            </Banner>
        );
    }

    return null;
}

/**
 * Feature lock overlay for disabled sections
 */
export function FeatureLockOverlay({ featureName, requiredPlan, children }) {
    return (
        <div style={{ position: 'relative' }}>
            <div style={{
                opacity: 0.5,
                pointerEvents: 'none',
                filter: 'grayscale(50%)'
            }}>
                {children}
            </div>
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 10,
                background: 'var(--p-color-bg-surface)',
                padding: '16px 24px',
                borderRadius: 'var(--p-border-radius-300)',
                boxShadow: 'var(--p-shadow-400)',
                textAlign: 'center',
                minWidth: '200px'
            }}>
                <Text as="p" variant="headingMd" fontWeight="semibold">
                    🔒 {featureName}
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                    Available on {requiredPlan} plan
                </Text>
                <div style={{ marginTop: '12px' }}>
                    <Button url="/app/plan" variant="primary" size="slim">
                        Upgrade to {requiredPlan}
                    </Button>
                </div>
            </div>
        </div>
    );
}

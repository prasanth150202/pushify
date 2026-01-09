import { useState, useEffect } from 'react';
import { useOutletContext } from '@remix-run/react';

/**
 * Custom hook to check plan features and enforce access control
 * @returns {Object} Plan data and helper functions
 */
export function usePlanFeatures() {
    const [planData, setPlanData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { shop: contextShop } = useOutletContext() || {};

    useEffect(() => {
        const fetchPlanFeatures = async () => {
            try {
                // Get shop from context or URL params
                const urlParams = new URLSearchParams(window.location.search);
                const shop = contextShop || urlParams.get('shop');

                if (!shop) {
                    console.warn('No shop parameter found in context or URL');
                    setLoading(false);
                    return;
                }

                const response = await fetch(
                    `https://int.pushnova.app/check_plan_feature.php?shop=${encodeURIComponent(shop)}&action=features`
                );

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();

                if (data.success) {
                    setPlanData(data);
                } else {
                    setError(data.error || 'Failed to fetch plan features');
                }
            } catch (err) {
                console.error('Error fetching plan features:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchPlanFeatures();
    }, [contextShop]);

    /**
     * Check if the current plan has a specific feature
     * @param {string} featureName - Name of the feature to check
     * @returns {boolean} True if feature is available
     */
    const hasFeature = (featureName) => {
        if (!planData || !planData.features) return false;
        return planData.features[featureName] === true;
    };

    /**
     * Get the minimum plan required for a feature
     * @param {string} featureName - Name of the feature
     * @returns {string} Plan name (e.g., "Starter", "Growth", "Pro")
     */
    const getRequiredPlan = (featureName) => {
        const featurePlanMap = {
            // Starter+ features
            'custom_segments': 'Starter',
            'scheduled_campaigns': 'Starter',
            'enhanced_analytics': 'Starter',

            // Growth+ features
            'advanced_segmentation': 'Growth',
            'ai_content': 'Growth',
            'event_triggers': 'Growth',
            'api_access': 'Growth',
            'priority_delivery': 'Growth',
            'growth_analytics': 'Growth',

            // Pro+ features
            'ai_suite_full': 'Pro',
            'webhooks': 'Pro',
            'deep_analytics': 'Pro',
            'behavior_tracking': 'Pro',
            'multi_layer_workflows': 'Pro',
            'dedicated_support': 'Pro',
        };

        return featurePlanMap[featureName] || 'Free';
    };

    /**
     * Check if user can access a feature, returns object with access info
     * @param {string} featureName - Name of the feature
     * @returns {Object} { allowed: boolean, requiredPlan: string, currentPlan: string }
     */
    const checkFeatureAccess = (featureName) => {
        const allowed = hasFeature(featureName);
        const requiredPlan = getRequiredPlan(featureName);
        const currentPlan = planData?.plan_name || 'Free';

        return {
            allowed,
            requiredPlan,
            currentPlan,
            needsUpgrade: !allowed,
        };
    };

    /**
     * Get plan tier level for comparison
     * @param {string} planName - Plan name
     * @returns {number} Tier level (0-4)
     */
    const getPlanTier = (planName) => {
        const tiers = {
            'Free': 0,
            'Starter': 1,
            'Starter Plan': 1,
            'Growth': 2,
            'Growth Plan': 2,
            'Pro': 3,
            'Pro Plan': 3,
            'Enterprise': 4,
            'Enterprise Plan': 4,
        };
        return tiers[planName] || 0;
    };

    /**
     * Check if current plan is at least the specified tier
     * @param {string} minimumPlan - Minimum required plan name
     * @returns {boolean} True if current plan meets or exceeds requirement
     */
    const meetsMinimumPlan = (minimumPlan) => {
        const currentTier = getPlanTier(planData?.plan_name || 'Free');
        const requiredTier = getPlanTier(minimumPlan);
        return currentTier >= requiredTier;
    };

    return {
        // State
        planData,
        loading,
        error,

        // Plan info
        planId: planData?.plan_id || 'FREE_PLAN',
        planName: planData?.plan_name || 'Free',
        features: planData?.features || {},

        // Helper functions
        hasFeature,
        getRequiredPlan,
        checkFeatureAccess,
        meetsMinimumPlan,
        getPlanTier,
    };
}

/**
 * Hook to fetch and monitor quota usage
 * @returns {Object} Quota data and helper functions
 */
export function useQuotaUsage() {
    const [quotaData, setQuotaData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { shop: contextShop } = useOutletContext() || {};

    const fetchQuota = async () => {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const shop = contextShop || urlParams.get('shop');

            if (!shop) {
                setLoading(false);
                return;
            }

            const response = await fetch(
                `https://int.pushnova.app/check_plan_feature.php?shop=${encodeURIComponent(shop)}&action=usage`
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                setQuotaData(data.usage);
            } else {
                setError(data.error || 'Failed to fetch quota');
            }
        } catch (err) {
            console.error('Error fetching quota:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQuota();

        // Refresh quota every 5 minutes
        const interval = setInterval(fetchQuota, 5 * 60 * 1000);

        return () => clearInterval(interval);
    }, [contextShop]);

    const getUsagePercentage = () => {
        if (!quotaData) return 0;
        return (quotaData.sent_today / quotaData.limit) * 100;
    };

    const isNearLimit = () => {
        return getUsagePercentage() >= 80;
    };

    const isAtLimit = () => {
        return !quotaData?.can_send;
    };

    return {
        quotaData,
        loading,
        error,
        refresh: fetchQuota,
        getUsagePercentage,
        isNearLimit,
        isAtLimit,
    };
}

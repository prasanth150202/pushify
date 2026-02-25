import React, { createContext, useContext, useState, useEffect } from 'react';

const PlanFeaturesContext = createContext();

export function PlanFeaturesProvider({ children }) {
  const [planData, setPlanData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const shop = urlParams.get('shop');
    if (!shop) {
      setLoading(false);
      return;
    }
    fetch(`https://int.pushnova.app/check_plan_feature.php?shop=${encodeURIComponent(shop)}&action=features`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setPlanData(data);
        else setError(data.error || 'Failed to fetch plan features');
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PlanFeaturesContext.Provider value={{ planData, loading, error }}>
      {children}
    </PlanFeaturesContext.Provider>
  );
}

export function usePlanFeaturesContext() {
  return useContext(PlanFeaturesContext);
}

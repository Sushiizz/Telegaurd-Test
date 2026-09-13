import { useEffect, useState } from "react";
import { simulateOffer } from "../api/client.js";

const DEBOUNCE_MS = 350;

export function useSimulator(customerId) {
  const [discountPct, setDiscountPct] = useState(0);
  const [addTechSupport, setAddTechSupport] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Switching customers resets the simulator rather than carrying over
  // slider positions that were meaningful for a different account.
  useEffect(() => {
    setDiscountPct(0);
    setAddTechSupport(false);
    setResult(null);
    setError(null);
  }, [customerId]);

  useEffect(() => {
    if (!customerId) return;

    // A 0% discount with no tech support add-on isn't an offer — mirror
    // the backend's own "do nothing isn't an offer" stance and skip the
    // call, resetting to the neutral "adjust the sliders" state.
    if (discountPct === 0 && !addTechSupport) {
      setResult(null);
      setError(null);
      return;
    }

    const handle = setTimeout(() => {
      setLoading(true);
      setError(null);
      simulateOffer({ customerId, discountPct, addTechSupport })
        .then(setResult)
        .catch((e) => setError(e.message || "Simulation failed."))
        .finally(() => setLoading(false));
    }, DEBOUNCE_MS);

    return () => clearTimeout(handle);
  }, [customerId, discountPct, addTechSupport]);

  return { discountPct, setDiscountPct, addTechSupport, setAddTechSupport, result, loading, error };
}

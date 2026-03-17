import os
import json
from rate_limiter import RateLimiter

class FallbackHandler:
    """
    FallbackHandler manages the safety mechanisms for the AI Auditor.
    If APIs fail or budget is blown, we automatically revert to Standard Mode (Regex-only).
    """
    def __init__(self, env_path="../.env"):
        self.rate_limiter = RateLimiter()
        self.env_path = env_path
        self.manual_tests = []
        
    def evaluate_system_health(self, api_response_ok=True):
        """
        Evaluates token limits and API health. 
        If dangerous, modifies the .env file to force auditor.js into fallback.
        """
        budget_blown = self.rate_limiter.is_budget_exceeded()
        
        if not api_response_ok or budget_blown:
            print("[CRITICAL] Azure API Failed OR Budget Exceeded. Engaging Fallback Protcols.")
            self._force_standard_mode()
            return True # Fallback engaged
        return False

    def _force_standard_mode(self):
        """
        Switches auditor.js to 'Standard Mode' by disabling the AI keys in the environment.
        This forces the Node.js backend to use regex-only link checking.
        """
        if os.path.exists(self.env_path):
            with open(self.env_path, 'r') as f:
                lines = f.readlines()
            
            with open(self.env_path, 'w') as f:
                for line in lines:
                    # Comment out API keys to disable AI inference in backend
                    if line.startswith("AZURE_AI_KEY") or line.startswith("ANTHROPIC_API_KEY"):
                        f.write(f"# FORCED_FALLBACK: {line}")
                    else:
                        f.write(line)
            print("[SYSTEM] Successfully switched to Regex-Only Standard Mode.")

    def log_manual_test_result(self, true_pos, false_pos, false_neg):
        """
        Logs results from manual verification tests.
        """
        self.manual_tests.append({
            "tp": true_pos,
            "fp": false_pos,
            "fn": false_neg
        })
        
        # Calculate real-time F1-Score every 10 manual tests
        if len(self.manual_tests) > 0 and len(self.manual_tests) % 10 == 0:
            f1 = self.calculate_f1_score()
            print(f"--- STREAMLIT METRICS UPDATE ---")
            print(f"Total Tests: {len(self.manual_tests)} | Real-Time F1-Score: {f1:.3f}")
            return f1
        return None

    def calculate_f1_score(self):
        """Calculates F1 Score based on exact Precision and Recall."""
        total_tp = sum(t["tp"] for t in self.manual_tests)
        total_fp = sum(t["fp"] for t in self.manual_tests)
        total_fn = sum(t["fn"] for t in self.manual_tests)
        
        if total_tp == 0:
            return 0.0
            
        precision = total_tp / (total_tp + total_fp) if (total_tp + total_fp) > 0 else 0
        recall = total_tp / (total_tp + total_fn) if (total_tp + total_fn) > 0 else 0
        
        if precision + recall == 0:
            return 0.0
            
        return 2 * (precision * recall) / (precision + recall)

import os
import json
from datetime import datetime

class RateLimiter:
    """
    Production-grade RateLimiter for tracking Token Consumption.
    Logs usage per request to a local JSON file to persist history.
    """
    def __init__(self, log_file="token_usage.json"):
        self.log_file = log_file
        # Enforce hard $100 limit, max budget defaults to $95
        self.max_budget = float(os.getenv("MAX_MONTHLY_BUDGET", 95.0))
        # Approximate blended cost per 1k tokens for GPT-4o / Claude 3.5 Sonnet
        self.cost_per_1k_tokens = 0.005 
        self._ensure_log_file()
        
    def _ensure_log_file(self):
        if not os.path.exists(self.log_file):
            with open(self.log_file, 'w') as f:
                json.dump({"total_tokens": 0, "total_cost_usd": 0.0, "history": []}, f)
                
    def log_request(self, tokens_used):
        """Logs tokens and calculates real-time cost."""
        with open(self.log_file, 'r') as f:
            data = json.load(f)
            
        cost = (tokens_used / 1000.0) * self.cost_per_1k_tokens
        data["total_tokens"] += tokens_used
        data["total_cost_usd"] += cost
        
        # Keep detailed history of each request
        data["history"].append({
            "timestamp": datetime.now().isoformat(),
            "tokens": tokens_used,
            "cost_usd": cost
        })
        
        with open(self.log_file, 'w') as f:
            json.dump(data, f, indent=4)
            
        return data["total_cost_usd"]

    def is_budget_exceeded(self):
        """Checks if we've hit the strict billing firewall."""
        with open(self.log_file, 'r') as f:
            data = json.load(f)
        return data["total_cost_usd"] >= self.max_budget

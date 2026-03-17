import streamlit as st
import pandas as pd
import json
import os
from rate_limiter import RateLimiter
from fallback_logic import FallbackHandler

st.set_page_config(page_title="JAIN SSR Auditor Dashboard", layout="wide")

st.title("🛡️ JAIN Lead DVV Auditor")
st.subheader("System Health & Safety Dashboard")

limiter = RateLimiter()
fallback = FallbackHandler()

# 1. System Health & Budget
st.header("1. System Health & Budget Firewall")

try:
    with open(limiter.log_file, 'r') as f:
        usage_data = json.load(f)
except FileNotFoundError:
    usage_data = {"total_tokens": 0, "total_cost_usd": 0.0, "history": []}

col1, col2, col3 = st.columns(3)
with col1:
    st.metric(label="Total Tokens Consumed", value=f"{usage_data['total_tokens']:,}")
with col2:
    st.metric(label="Total Cost (USD)", value=f"${usage_data['total_cost_usd']:.4f}", delta=f"Max: ${limiter.max_budget}", delta_color="inverse")
with col3:
    budget_blown = limiter.is_budget_exceeded()
    st.metric(label="Engine Status", value="FALLBACK (Regex)" if budget_blown else "AI ACTIVE (Azure)")

if budget_blown:
    st.error("🚨 HARD LIMIT REACHED. System strictly forced into Standard Mode (Regex-only rules).")
    # trigger fallback physically
    fallback.evaluate_system_health(api_response_ok=True)

# 2. Manual Test F1-Score Tracker
st.header("2. Real-Time QA: Manual F1-Score Tracker")

with st.form("manual_test_form"):
    st.write("Log aggregate results from your manual verification tests:")
    tp = st.number_input("True Positives (Correctly Flagged Fakes)", min_value=0, step=1)
    fp = st.number_input("False Positives (Genuine flagged as Fake)", min_value=0, step=1)
    fn = st.number_input("False Negatives (Fakes missed)", min_value=0, step=1)
    
    submitted = st.form_submit_button("Log Test Batch")
    if submitted:
        # Utilizing standard session_state for persistence across standard Streamlit re-renders
        if 'tests' not in st.session_state:
            st.session_state.tests = []
        
        st.session_state.tests.append({"tp": tp, "fp": fp, "fn": fn})
        st.success("Test batch permanently logged for current session!")

if 'tests' in st.session_state and st.session_state.tests:
    total_tp = sum(t["tp"] for t in st.session_state.tests)
    total_fp = sum(t["fp"] for t in st.session_state.tests)
    total_fn = sum(t["fn"] for t in st.session_state.tests)
    
    st.write(f"**Cumulative Tests Logged:** {len(st.session_state.tests)}")
    
    precision = total_tp / (total_tp + total_fp) if (total_tp + total_fp) > 0 else 0
    recall = total_tp / (total_tp + total_fn) if (total_tp + total_fn) > 0 else 0
    f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
    
    col_a, col_b, col_c = st.columns(3)
    col_a.metric("Precision", f"{precision:.2f}")
    col_b.metric("Recall", f"{recall:.2f}")
    col_c.metric("F1-Score", f"{f1:.2f}")

    if len(st.session_state.tests) % 10 == 0:
        st.info("🎯 10-Test Milestone Reached! Batch F1-Score validated.")

# 3. Usage History
st.header("3. API Request Lexicon")
if usage_data["history"]:
    df = pd.DataFrame(usage_data["history"])
    st.dataframe(df.tail(50), use_container_width=True)
else:
    st.write("No API requests tracked in token_usage.json yet.")

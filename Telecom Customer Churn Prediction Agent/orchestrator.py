"""
TeleGuard AI - Step 3: LLM Orchestrator
=======================================
Central tool-using loop behind POST /api/agent/query, built on the Google
Gemini API's function-calling protocol.
"""

from __future__ import annotations

import os

from google import genai
from google.genai import types

import config
from store import CustomerStore
import tools

MODEL_NAME = os.environ.get("TELEGUARD_AGENT_MODEL", "gemini-3.6-flash")
MAX_TOOL_ITERATIONS = 6
MAX_TOKENS = 1024

_client: genai.Client | None = None


def get_client() -> genai.Client:
    global _client
    if _client is None:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError(
                "GEMINI_API_KEY is not set. Export it before calling "
                "/api/agent/query - the rest of the platform works without it."
            )
        _client = genai.Client(api_key=api_key)
    return _client


SYSTEM_PROMPT = """You are the master orchestrator behind TeleGuard AI, an autonomous customer retention command platform for a telecom company. You coordinate five conceptual agents, four of which are tools you call, and one of which is you:

- Risk Agent (tools: list_at_risk_customers, get_fleet_overview) - finds WHO is at risk.
- Explainability Agent (tools: explain_customer_risk, get_customer_profile) - explains WHY.
- Retention Strategy / ROI Agent (tools: get_recommended_action, simulate_retention_offer) - decides WHAT to offer and whether it's worth it.
- Communication Agent - this is YOU. Once you have the facts, draft the actual outreach copy in your final answer.

Hard rules:
1. NEVER invent a customer_id, churn probability, dollar figure, or driver. Every specific number must come from a tool result.
2. For a query about a GROUP of customers, call list_at_risk_customers first to find WHO.
3. SMS must stay under about 320 characters. Email needs a short subject line and 2-4 short paragraphs.
4. Ground every drafted offer in get_recommended_action or simulate_retention_offer output.
5. Be concise and professional.
6. If a tool returns an error, say so plainly rather than guessing.
7. The Telco dataset has no customer name field. Address customers generically.
"""


def _tool_schemas() -> list[dict]:
    return [
        {
            "name": "list_at_risk_customers",
            "description": "Find customers matching risk, contract, service, or score filters.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "risk_level": {"type": "string", "enum": ["LOW", "MEDIUM", "HIGH", "CRITICAL"]},
                    "contract_type": {"type": "string", "enum": ["Month-to-month", "One year", "Two year"]},
                    "internet_service": {"type": "string", "enum": ["DSL", "Fiber optic", "No"]},
                    "min_churn_probability": {"type": "number", "description": "0-1"},
                    "min_ros": {"type": "integer", "description": "Minimum Retention Opportunity Score, 0-100"},
                    "sort_by": {"type": "string", "enum": ["retention_opportunity_score", "churn_probability", "cltv", "monthly_charges", "tenure_months"]},
                    "limit": {"type": "integer", "description": "Maximum number of customers, 1-50"},
                },
            },
        },
        {
            "name": "get_fleet_overview",
            "description": "Get fleet-wide churn, risk, revenue, and retention KPIs.",
            "input_schema": {"type": "object", "properties": {}},
        },
        {
            "name": "explain_customer_risk",
            "description": "Get SHAP-based churn drivers for one customer.",
            "input_schema": {
                "type": "object",
                "properties": {"customer_id": {"type": "string"}},
                "required": ["customer_id"],
            },
        },
        {
            "name": "get_customer_profile",
            "description": "Get a customer's full risk, value, contract, service, and payment profile.",
            "input_schema": {
                "type": "object",
                "properties": {"customer_id": {"type": "string"}},
                "required": ["customer_id"],
            },
        },
        {
            "name": "get_recommended_action",
            "description": "Get the ROI-optimal next best retention action for one customer.",
            "input_schema": {
                "type": "object",
                "properties": {"customer_id": {"type": "string"}},
                "required": ["customer_id"],
            },
        },
        {
            "name": "simulate_retention_offer",
            "description": "Simulate a discount and/or tech-support offer for one customer.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "customer_id": {"type": "string"},
                    "discount_pct": {"type": "number", "description": "0-100"},
                    "add_tech_support": {"type": "boolean"},
                },
                "required": ["customer_id"],
            },
        },
    ]


def _gemini_tools() -> list[types.Tool]:
    return [types.Tool(function_declarations=[
        types.FunctionDeclaration(
            name=schema["name"],
            description=schema["description"],
            parameters_json_schema=schema["input_schema"],
        )
        for schema in _tool_schemas()
    ])]


def _to_gemini_contents(messages: list[dict]) -> list[types.Content]:
    contents = []
    for message in messages:
        parts = []
        for part in message["parts"]:
            if "text" in part:
                parts.append(types.Part.from_text(text=part["text"]))
            elif "function_call" in part:
                call = part["function_call"]
                parts.append(types.Part(
                    function_call=types.FunctionCall(
                        name=call["name"], args=call.get("args", {}),
                    ),
                    thought_signature=call.get("thought_signature"),
                ))
            elif "function_response" in part:
                function_response = part["function_response"]
                parts.append(types.Part.from_function_response(
                    name=function_response["name"],
                    response=function_response["response"],
                ))
        contents.append(types.Content(role=message["role"], parts=parts))
    return contents


def _serialize_response_parts(parts) -> list[dict]:
    serialized = []
    for part in parts:
        if part.text:
            serialized.append({"text": part.text})
        if part.function_call:
            function_call = {
                "name": part.function_call.name,
                "args": dict(part.function_call.args or {}),
            }
            if part.thought_signature is not None:
                function_call["thought_signature"] = part.thought_signature
            serialized.append({"function_call": function_call})
    return serialized


def _execute_tool(name: str, tool_input: dict, store: CustomerStore) -> dict:
    fn = tools.TOOL_DISPATCH.get(name)
    if fn is None:
        return {"error": f"unknown tool '{name}'"}
    try:
        return fn(store, **tool_input)
    except TypeError as e:
        return {"error": f"invalid arguments for '{name}': {e}"}
    except Exception as e:
        return {"error": f"tool '{name}' failed: {e}"}


def run_agent_query(
    query: str,
    store: CustomerStore,
    history: list[dict] | None = None,
) -> dict:
    """Run Gemini's function-calling loop and return a grounded response."""
    client = get_client()
    messages = list(history) if history else []
    messages.append({"role": "user", "parts": [{"text": query}]})
    tool_call_log: list[dict] = []

    for _ in range(MAX_TOOL_ITERATIONS):
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=_to_gemini_contents(messages),
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                tools=_gemini_tools(),
                max_output_tokens=MAX_TOKENS,
            ),
        )
        response_parts = response.candidates[0].content.parts
        serialized_parts = _serialize_response_parts(response_parts)
        function_calls = [part for part in serialized_parts if "function_call" in part]

        if not function_calls:
            final_text = "".join(part.get("text", "") for part in serialized_parts)
            messages.append({"role": "model", "parts": serialized_parts})
            return {"reply": final_text, "tool_calls": tool_call_log, "messages": messages}

        messages.append({"role": "model", "parts": serialized_parts})
        tool_parts = []
        for call_part in function_calls:
            call = call_part["function_call"]
            output = _execute_tool(call["name"], call["args"], store)
            tool_call_log.append({"tool": call["name"], "input": call["args"], "output": output})
            tool_parts.append({"function_response": {
                "name": call["name"],
                "response": output,
            }})
        messages.append({"role": "user", "parts": tool_parts})

    return {
        "reply": (
            "I wasn't able to finish gathering the data for this request "
            "within the tool-call budget. Try narrowing the query."
        ),
        "tool_calls": tool_call_log,
        "messages": messages,
    }

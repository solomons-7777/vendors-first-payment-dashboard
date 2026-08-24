"""
Minimal login gate for the MVP demo.

The SRS calls for a "Secure Login Page" but explicitly scopes out ERP/DB
integration for the MVP. This implements a session-based email/password
check against credentials in .streamlit/secrets.toml (or a demo fallback if
no secrets file is present), which satisfies the functional requirement
("users can log in") without pulling in a full auth provider.

Replace this with real identity/auth (SSO, hashed credentials in a DB, etc.)
before this goes anywhere near production -- see README "Known Gaps".
"""

import streamlit as st

DEMO_CREDENTIALS = {"demo@vendorsfirst.club": "demo123"}


def _get_credentials() -> dict:
    try:
        configured = dict(st.secrets["credentials"])
        if configured:
            return configured
    except Exception:
        pass
    return DEMO_CREDENTIALS


def is_authenticated() -> bool:
    return st.session_state.get("authenticated", False)


def login_form() -> None:
    st.title("Government Payment Analytics Portal")
    st.caption("Sign in to continue")

    creds = _get_credentials()
    is_demo = creds is DEMO_CREDENTIALS

    with st.form("login_form"):
        email = st.text_input("Email")
        password = st.text_input("Password", type="password")
        submitted = st.form_submit_button("Log in")

    if is_demo:
        st.warning(
            "**Unsecured demo build.** No credentials are configured, so "
            "anyone can sign in with `demo@vendorsfirst.club` / `demo123`. "
            "Set real ones in `.streamlit/secrets.toml`, or in your host's "
            "secrets UI, before sharing this URL."
        )

    if submitted:
        if creds.get(email) == password:
            st.session_state["authenticated"] = True
            st.session_state["user_email"] = email
            st.rerun()
        else:
            st.error("Invalid email or password.")


def logout_button() -> None:
    if st.sidebar.button("Log out"):
        st.session_state["authenticated"] = False
        st.session_state.pop("user_email", None)
        st.session_state.pop("workbook", None)
        st.rerun()

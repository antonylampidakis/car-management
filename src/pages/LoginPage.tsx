import { useState } from "react";
import { supabase } from "../lib/supabase";

type LoginPageProps = {
  onAuthenticated: () => void;
};

export default function LoginPage({
  onAuthenticated,
}: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleLogin() {
    setErrorMessage("");

    if (!email.trim() || !password) {
      setErrorMessage("Συμπλήρωσε email και κωδικό.");
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        throw error;
      }

      onAuthenticated();
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Παρουσιάστηκε άγνωστο σφάλμα.");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key === "Enter" && !loading) {
      void handleLogin();
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">C</div>

          <div>
            <h1>Car Management</h1>
            <p>Σύνδεση στην εφαρμογή διαχείρισης οχήματος</p>
          </div>
        </div>

        <div className="login-form">
          <label>
            Email

            <input
              type="email"
              value={email}
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="name@example.com"
            />
          </label>

          <label>
            Κωδικός

            <input
              type="password"
              value={password}
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="••••••••"
            />
          </label>

          {errorMessage && (
            <div className="login-error" role="alert">
              {errorMessage}
            </div>
          )}

          <button
            type="button"
            onClick={() => void handleLogin()}
            disabled={loading}
          >
            {loading ? "Σύνδεση..." : "Σύνδεση"}
          </button>
        </div>
      </div>
    </div>
  );
}
import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Sparkles, Mail, Lock, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { useAuthStore } from "../store/authStore";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((state) => state.login);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);

  const justRegistered = location.state?.registered;

  const [formData, setFormData] = useState({
    email: location.state?.email || "",
    password: "",
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (error) clearError();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const result = await login(formData);

    if (result.success) {
      navigate("/dashboard");
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#030303] px-5 py-10">
      {/* Background grid */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.05]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "70px 70px",
          }}
        />
      </div>

      {/* Ambient glow */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-[400px] w-[500px] -translate-x-1/2 rounded-full bg-[#168FFF]/[0.08] blur-[150px]" />

      <div className="relative w-full max-w-[400px]">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#168FFF]/25 bg-[#168FFF]/10">
            <Sparkles size={18} strokeWidth={1.8} className="text-[#168FFF]" />
          </div>

          <h1 className="mt-4 text-lg font-semibold tracking-[-0.03em] text-white">
            CortexFlow
          </h1>

          <p className="mt-1.5 text-[11px] text-zinc-600">
            AI-powered business automation
          </p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-white/[0.07] bg-[#080A0E] p-7">
          <h2 className="text-[15px] font-medium text-zinc-100">
            Welcome back
          </h2>

          <p className="mt-1.5 text-[11px] text-zinc-600">
            Log in to access your workflows.
          </p>

          {justRegistered && (
            <div className="mt-5 flex items-center gap-2 rounded-lg border border-[#168FFF]/20 bg-[#168FFF]/[0.06] px-3.5 py-2.5 text-[11px] text-[#168FFF]">
              <CheckCircle2 size={14} strokeWidth={2} />
              Account created! Log in to continue.
            </div>
          )}

          {error && (
            <div className="mt-5 rounded-lg border border-red-500/20 bg-red-500/[0.06] px-3.5 py-2.5 text-[11px] text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {/* Email */}
            <div>
              <label className="mb-2 block text-[9px] font-medium uppercase tracking-[0.14em] text-zinc-600">
                Email
              </label>

              <div className="flex items-center gap-2.5 rounded-lg border border-white/[0.08] bg-[#0A0D12] px-3.5 py-2.5 focus-within:border-[#168FFF]/50">
                <Mail size={14} strokeWidth={1.7} className="text-zinc-600" />

                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@company.com"
                  className="w-full bg-transparent text-[12px] text-zinc-200 placeholder:text-zinc-700 focus:outline-none"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="mb-2 block text-[9px] font-medium uppercase tracking-[0.14em] text-zinc-600">
                Password
              </label>

              <div className="flex items-center gap-2.5 rounded-lg border border-white/[0.08] bg-[#0A0D12] px-3.5 py-2.5 focus-within:border-[#168FFF]/50">
                <Lock size={14} strokeWidth={1.7} className="text-zinc-600" />

                <input
                  type="password"
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full bg-transparent text-[12px] text-zinc-200 placeholder:text-zinc-700 focus:outline-none"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#168FFF] py-2.5 text-[11px] font-semibold text-black transition-all duration-300 hover:bg-[#38A8FF] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Logging in...
                </>
              ) : (
                <>
                  Log in
                  <ArrowRight size={14} strokeWidth={2} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer link */}
        <p className="mt-6 text-center text-[11px] text-zinc-600">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="font-medium text-[#168FFF] transition-colors hover:text-[#38A8FF]"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;

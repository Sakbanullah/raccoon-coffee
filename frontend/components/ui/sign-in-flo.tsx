"use client";

import React, { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, Lock, Mail, User } from "lucide-react";

interface FormFieldProps {
  id: string;
  type: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  icon: React.ReactNode;
  autoComplete?: string;
  showToggle?: boolean;
  onToggle?: () => void;
  showPassword?: boolean;
}

const AnimatedFormField: React.FC<FormFieldProps> = ({
  id,
  type,
  label,
  value,
  onChange,
  icon,
  autoComplete,
  showToggle,
  onToggle,
  showPassword,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const floating = isFocused || value.length > 0;

  return (
    <div className="relative group">
      <div
        className="relative overflow-hidden rounded-lg border border-border bg-background transition-all duration-300 ease-in-out"
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors duration-200 group-focus-within:text-primary">
          {icon}
        </div>

        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          autoComplete={autoComplete}
          className="w-full bg-transparent pl-10 pr-12 pt-5 pb-2 text-foreground focus:outline-none"
          placeholder=" "
        />

        <label
          htmlFor={id}
          className={`absolute left-10 transition-all duration-200 ease-in-out pointer-events-none ${
            floating
              ? "top-2 text-xs text-primary font-medium"
              : "top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
          }`}
        >
          {label}
        </label>

        {showToggle && (
          <button
            type="button"
            onClick={onToggle}
            aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}

        {isHovering && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(200px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(198, 154, 78, 0.12) 0%, transparent 70%)`,
            }}
          />
        )}
      </div>
    </div>
  );
};

const FloatingParticles: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    setCanvasSize();
    window.addEventListener("resize", setCanvasSize);

    const particles = Array.from({ length: 50 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2 + 1,
      speedX: (Math.random() - 0.5) * 0.5,
      speedY: (Math.random() - 0.5) * 0.5,
      opacity: Math.random() * 0.3,
    }));

    let frame = 0;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x = (p.x + p.speedX + canvas.width) % canvas.width;
        p.y = (p.y + p.speedY + canvas.height) % canvas.height;
        ctx.fillStyle = `rgba(198, 154, 78, ${p.opacity})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      if (!reduceMotion) frame = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", setCanvasSize);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 1 }}
    />
  );
};

export interface SignInFloProps {
  email: string;
  password: string;
  error?: string;
  loading?: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const SignInFlo: React.FC<SignInFloProps> = ({
  email,
  password,
  error,
  loading = false,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <FloatingParticles />

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-surface/80 backdrop-blur-xl border border-border rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
              <User className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Admin Login</h1>
            <p className="text-muted-foreground">Masuk untuk mengelola Raccoon Coffee</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-6" noValidate>
            <AnimatedFormField
              id="admin-email"
              type="email"
              label="Email Address"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              icon={<Mail size={18} />}
              autoComplete="username"
            />

            <AnimatedFormField
              id="admin-password"
              type={showPassword ? "text" : "password"}
              label="Password"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              icon={<Lock size={18} />}
              autoComplete="current-password"
              showToggle
              onToggle={() => setShowPassword(!showPassword)}
              showPassword={showPassword}
            />

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full relative group bg-primary text-primary-foreground py-3 px-4 rounded-lg font-medium transition-all duration-300 ease-in-out hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
            >
              <span className={`transition-opacity duration-200 ${loading ? "opacity-0" : "opacity-100"}`}>
                Sign In
              </span>

              {loading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const STEPS = ["Account", "Vehicle", "Verify", "Done"] as const;

type FormData = {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: string;
  vehicleColor: string;
  licensePlate: string;
  acceptTerms: boolean;
};

const initial: FormData = {
  name: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  vehicleMake: "",
  vehicleModel: "",
  vehicleYear: "",
  vehicleColor: "",
  licensePlate: "",
  acceptTerms: false,
};

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-1 mb-8">
      {STEPS.map((label, i) => (
        <div key={label} className="flex-1 flex flex-col items-center gap-1.5">
          <div className="w-full flex items-center">
            <div
              className={`h-1.5 w-full rounded-full transition-colors duration-300 ${
                i <= step ? "bg-primary" : "bg-gray-200"
              }`}
            />
          </div>
          <span
            className={`text-[10px] font-medium transition-colors duration-300 ${
              i <= step ? "text-primary" : "text-foreground/40"
            }`}
          >
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

function InputField({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  error,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground/80 mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors ${
          error ? "border-danger bg-red-50/50" : "border-gray-300"
        }`}
        placeholder={placeholder}
      />
      {error && <p className="text-danger text-xs mt-1">{error}</p>}
    </div>
  );
}

export default function DriverSignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>(
    {}
  );
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);
  const [kinCode, setKinCode] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, { name: string; preview?: string }>>({});
  const [uploadError, setUploadError] = useState("");
  const [driverUserId, setDriverUserId] = useState<string | null>(null);
  const [verificationUrl, setVerificationUrl] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState(false);

  const [pendingFiles, setPendingFiles] = useState<Record<string, File>>({});

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>, docType: string) {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      setUploadError("Invalid file type. Use JPEG, PNG, WebP, or PDF.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("File too large. Maximum 10MB.");
      return;
    }
    setUploadError("");
    setPendingFiles(prev => ({ ...prev, [docType]: file }));
    const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
    setUploadedFiles(prev => ({ ...prev, [docType]: { name: file.name, preview } }));
  }

  async function uploadPendingDocuments(sessionCookie?: string) {
    for (const [docType, file] of Object.entries(pendingFiles)) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", docType);
        await fetch("/api/driver/documents", { method: "POST", body: formData });
      } catch {
        // Non-critical: documents can be re-uploaded later
      }
    }
  }

  const set = <K extends keyof FormData>(key: K, val: FormData[K]) => {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  function validateStep0(): boolean {
    const e: typeof errors = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Enter a valid email";
    if (!form.phone.trim()) e.phone = "Phone is required";
    else if (form.phone.replace(/\D/g, "").length < 10)
      e.phone = "Enter a valid phone number";
    if (!form.password) e.password = "Password is required";
    else if (form.password.length < 6) e.password = "At least 6 characters";
    if (form.password !== form.confirmPassword)
      e.confirmPassword = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateStep1(): boolean {
    const e: typeof errors = {};
    if (!form.vehicleMake.trim()) e.vehicleMake = "Make is required";
    if (!form.vehicleModel.trim()) e.vehicleModel = "Model is required";
    if (!form.vehicleYear.trim()) e.vehicleYear = "Year is required";
    else {
      const y = parseInt(form.vehicleYear);
      if (isNaN(y) || y < 1990 || y > new Date().getFullYear() + 1)
        e.vehicleYear = "Enter a valid year";
    }
    if (!form.vehicleColor.trim()) e.vehicleColor = "Color is required";
    if (!form.licensePlate.trim())
      e.licensePlate = "License plate is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateStep2(): boolean {
    const e: typeof errors = {};
    if (!form.acceptTerms) e.acceptTerms = "You must accept the terms";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    setLoading(true);
    setApiError("");
    try {
      const res = await fetch("/api/auth/driver-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim(),
          password: form.password,
          vehicleMake: form.vehicleMake.trim(),
          vehicleModel: form.vehicleModel.trim(),
          vehicleYear: form.vehicleYear.trim(),
          vehicleColor: form.vehicleColor.trim(),
          licensePlate: form.licensePlate.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setApiError(data.error || "Registration failed");
        setLoading(false);
        return;
      }
      setKinCode(data.user?.driverProfile?.kinCode || "");
      setDriverUserId(data.user?.id || null);
      // Auto-sign-in, upload documents, and start verification
      try {
        const signInRes = await fetch("/api/auth/callback/credentials", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            email: form.email.trim().toLowerCase(),
            password: form.password,
            csrfToken: "",
            json: "true",
          }),
        });
        if (signInRes.ok) {
          if (Object.keys(pendingFiles).length > 0) {
            await uploadPendingDocuments();
          }
          // Start Stripe Identity verification
          try {
            const verifyRes = await fetch("/api/driver/verify", { method: "POST" });
            if (verifyRes.ok) {
              const verifyData = await verifyRes.json();
              if (verifyData.url) setVerificationUrl(verifyData.url);
            }
          } catch { /* non-critical */ }
        }
      } catch {
        // Non-critical
      }
      setStep(3);
    } catch {
      setApiError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleNext() {
    if (step === 0 && !validateStep0()) return;
    if (step === 1 && !validateStep1()) return;
    if (step === 2) {
      if (!validateStep2()) return;
      handleSubmit();
      return;
    }
    setStep((s) => s + 1);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 py-10 px-4">
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-6 animate-fade-in">
          <div className="inline-flex items-center gap-1 mb-2">
            <span className="text-3xl font-bold text-primary">Ka</span>
            <span className="text-3xl font-light text-foreground">yu</span>
          </div>
          <p className="text-foreground/50 text-sm">Driver Registration</p>
        </div>

        <div className="bg-card rounded-2xl shadow-sm border border-card-border p-6">
          <ProgressBar step={step} />

          {apiError && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-lg mb-4 animate-fade-in">
              {apiError}
            </div>
          )}

          {step === 0 && (
            <div className="space-y-4 animate-fade-in" key="step-0">
              <h2 className="text-lg font-semibold text-foreground">
                Account Info
              </h2>
              <InputField
                label="Full Name"
                value={form.name}
                onChange={(v) => set("name", v)}
                placeholder="Jane Doe"
                error={errors.name}
              />
              <InputField
                label="Email"
                type="email"
                value={form.email}
                onChange={(v) => set("email", v)}
                placeholder="jane@email.com"
                error={errors.email}
              />
              <InputField
                label="Phone"
                type="tel"
                value={form.phone}
                onChange={(v) => set("phone", v)}
                placeholder="(555) 123-4567"
                error={errors.phone}
              />
              <InputField
                label="Password"
                type="password"
                value={form.password}
                onChange={(v) => set("password", v)}
                placeholder="At least 6 characters"
                error={errors.password}
              />
              <InputField
                label="Confirm Password"
                type="password"
                value={form.confirmPassword}
                onChange={(v) => set("confirmPassword", v)}
                placeholder="Re-enter password"
                error={errors.confirmPassword}
              />
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4 animate-fade-in" key="step-1">
              <h2 className="text-lg font-semibold text-foreground">
                Vehicle Info
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <InputField
                  label="Make"
                  value={form.vehicleMake}
                  onChange={(v) => set("vehicleMake", v)}
                  placeholder="Toyota"
                  error={errors.vehicleMake}
                />
                <InputField
                  label="Model"
                  value={form.vehicleModel}
                  onChange={(v) => set("vehicleModel", v)}
                  placeholder="Camry"
                  error={errors.vehicleModel}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <InputField
                  label="Year"
                  value={form.vehicleYear}
                  onChange={(v) => set("vehicleYear", v)}
                  placeholder="2022"
                  error={errors.vehicleYear}
                />
                <InputField
                  label="Color"
                  value={form.vehicleColor}
                  onChange={(v) => set("vehicleColor", v)}
                  placeholder="Silver"
                  error={errors.vehicleColor}
                />
              </div>
              <InputField
                label="License Plate"
                value={form.licensePlate}
                onChange={(v) => set("licensePlate", v)}
                placeholder="ABC 1234"
                error={errors.licensePlate}
              />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5 animate-fade-in" key="step-2">
              <h2 className="text-lg font-semibold text-foreground">
                Verification
              </h2>

              {uploadError && (
                <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg animate-fade-in">
                  {uploadError}
                </div>
              )}

              {[
                { key: "license_front", label: "Driver's License (Front)" },
                { key: "license_back", label: "Driver's License (Back)" },
                { key: "insurance", label: "Insurance Card" },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-foreground/80 mb-1.5">
                    {label}
                  </label>
                  {uploadedFiles[key] ? (
                    <div className="border border-success/30 bg-success/5 rounded-xl p-4 flex items-center gap-3">
                      {uploadedFiles[key].preview ? (
                        <img src={uploadedFiles[key].preview} alt={label} className="w-12 h-12 rounded-lg object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
                          <svg className="w-6 h-6 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{uploadedFiles[key].name}</p>
                        <p className="text-xs text-success">Uploaded</p>
                      </div>
                      <label className="text-xs text-primary cursor-pointer hover:underline">
                        Replace
                        <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => handleFileSelect(e, key)} />
                      </label>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors border-gray-300 hover:border-primary/40 hover:bg-primary/5">
                          <svg className="w-8 h-8 text-foreground/30 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <p className="text-sm text-foreground/50">Click to upload or drag and drop</p>
                          <p className="text-xs text-foreground/40 mt-1">JPEG, PNG, WebP, or PDF (max 10MB)</p>
                      <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => handleFileSelect(e, key)} />
                    </label>
                  )}
                </div>
              ))}

              <div className="bg-primary/5 border border-primary/15 rounded-xl p-4 flex gap-3">
                <svg className="w-5 h-5 text-primary shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-foreground">Background Check</p>
                  <p className="text-xs text-foreground/60 mt-0.5">
                    A background check will be initiated after registration. You&apos;ll be notified once your account is verified and ready to accept rides.
                  </p>
                </div>
              </div>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={form.acceptTerms}
                  onChange={(e) => set("acceptTerms", e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary/30 accent-primary"
                />
                <span className="text-sm text-foreground/70 group-hover:text-foreground/90 transition-colors">
                  I agree to the Kayu{" "}
                  <span className="text-primary font-medium">Terms of Service</span>{" "}
                  and{" "}
                  <span className="text-primary font-medium">Driver Agreement</span>
                </span>
              </label>
              {errors.acceptTerms && (
                <p className="text-danger text-xs -mt-2">{errors.acceptTerms}</p>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="text-center py-4 animate-fade-in" key="step-3">
              <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-success"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-foreground mb-1">
                Welcome to Kayu!
              </h2>
              <p className="text-sm text-foreground/60 mb-6">
                Your driver account has been created.
              </p>

              {kinCode && (
                <div className="bg-primary/5 border border-primary/15 rounded-xl p-4 mb-4">
                  <p className="text-xs text-foreground/50 mb-1">
                    Your Kin Code
                  </p>
                  <p className="text-2xl font-bold text-primary tracking-wider">
                    {kinCode}
                  </p>
                  <p className="text-xs text-foreground/50 mt-1">
                    Share this code with riders so they can add you to their Kin list
                  </p>
                </div>
              )}

              {/* Verification CTA */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 text-left">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-blue-800">Verify your identity to start driving</p>
                    <p className="text-xs text-blue-600 mt-0.5">
                      Quick ID verification via Stripe — takes about 30 seconds. A background check runs automatically in the background.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {verificationUrl ? (
                  <a
                    href={verificationUrl}
                    className="block w-full bg-primary text-white py-2.5 rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors text-center"
                  >
                    Verify Identity Now
                  </a>
                ) : (
                  <button
                    onClick={async () => {
                      setVerifyingId(true);
                      try {
                        const res = await fetch("/api/driver/verify", { method: "POST" });
                        if (res.ok) {
                          const data = await res.json();
                          if (data.url) window.location.href = data.url;
                        }
                      } catch { /* ignore */ }
                      setVerifyingId(false);
                    }}
                    disabled={verifyingId}
                    className="w-full bg-primary text-white py-2.5 rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
                  >
                    {verifyingId ? "Starting verification..." : "Verify Identity Now"}
                  </button>
                )}
                <button
                  onClick={() => router.push("/auth/signin")}
                  className="w-full bg-card text-foreground/80 py-2.5 rounded-xl text-sm font-medium hover:bg-subtle transition-colors"
                >
                  Skip for now — Sign In
                </button>
              </div>
            </div>
          )}

          {step < 3 && (
            <div className="flex gap-3 mt-6">
              {step > 0 && (
                <button
                  onClick={() => setStep((s) => s - 1)}
                  className="flex-1 border border-gray-300 text-foreground/80 py-2.5 rounded-xl text-sm font-medium hover:bg-card transition-colors"
                >
                  Back
                </button>
              )}
              <button
                onClick={handleNext}
                disabled={loading}
                className="flex-1 bg-primary text-white py-2.5 rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 active:scale-[0.97]"
              >
                {loading
                  ? "Creating account..."
                  : step === 2
                    ? "Create Account"
                    : "Next"}
              </button>
            </div>
          )}
        </div>

        {step < 3 && (
          <p className="text-center text-sm text-foreground/50 mt-4 animate-fade-in">
            Already have an account?{" "}
            <Link
              href="/auth/signin"
              className="text-primary font-medium hover:underline"
            >
              Sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

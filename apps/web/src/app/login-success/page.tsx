"use client";

import { useEffect, useState } from "react";
import { Cloud, CheckCircle, XCircle } from "lucide-react";

export default function LoginSuccessPage() {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const error = new URLSearchParams(window.location.search).get("error");
    
    if (error) {
       setErrorMsg("Access Denied: Email not in database.");
       if (window.opener) {
           window.opener.postMessage({ type: 'login-error', error }, '*');
       }
    } else {
       if (window.opener) {
           window.opener.postMessage({ type: 'login-success' }, '*');
       }
    }

    setTimeout(() => {
      window.close();
    }, 1500);
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-4">
      {errorMsg ? (
        <XCircle className="w-16 h-16 text-red-500 mb-6" />
      ) : (
        <Cloud className="w-16 h-16 text-white mb-6 animate-pulse" />
      )}
      <h1 className="text-2xl font-medium text-white mb-2">
        {errorMsg ? "Authentication Failed" : "Authentication Successful"}
      </h1>
      <p className="text-gray-400">
        {errorMsg ? errorMsg : "Verifying database records..."}
      </p>
      <p className="text-gray-500 text-sm mt-4">This window will close automatically.</p>
    </div>
  );
}
